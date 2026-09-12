import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { removeProfileImagesByUrl, uploadProfileImage } from "@/lib/supabase-storage";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_AVATAR_PIXELS = 25_000_000;
const MAX_AVATAR_DIMENSION = 8_000;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT = 20;
const uploadAttempts = new Map<string, readonly number[]>();
const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type UploadedFile = {
  readonly name: string;
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

function isUploadedFile(value: FormDataEntryValue | null): value is FormDataEntryValue & UploadedFile {
  return typeof value === "object" && value !== null && "name" in value && "size" in value && "type" in value && "arrayBuffer" in value && typeof value.arrayBuffer === "function";
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

function hasExpectedSignature(contentType: string, bytes: Uint8Array): boolean {
  if (contentType === "image/png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/webp") return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

function hasExactImageBoundary(contentType: string, bytes: Uint8Array): boolean {
  if (contentType === "image/png") return bytes.length >= 12 && [0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82].every((value, index) => bytes[bytes.length - 12 + index] === value);
  if (contentType === "image/jpeg") return bytes.length >= 2 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  if (contentType === "image/webp" && bytes.length >= 12) {
    const declaredSize = (bytes[4] ?? 0) | ((bytes[5] ?? 0) << 8) | ((bytes[6] ?? 0) << 16) | ((bytes[7] ?? 0) << 24);
    return declaredSize + 8 === bytes.length;
  }
  return false;
}

async function decodeAndNormalizeImage(contentType: keyof typeof IMAGE_EXTENSIONS, data: ArrayBuffer): Promise<ArrayBuffer | null> {
  const bytes = new Uint8Array(data);
  if (!hasExpectedSignature(contentType, bytes) || !hasExactImageBoundary(contentType, bytes)) return null;
  try {
    const input = sharp(bytes, { animated: true, failOn: "error", limitInputPixels: MAX_AVATAR_PIXELS });
    const metadata = await input.metadata();
    if (metadata.pages !== undefined && metadata.pages !== 1) return null;
    const width = metadata.autoOrient?.width ?? metadata.width;
    const height = metadata.autoOrient?.height ?? metadata.pageHeight ?? metadata.height;
    if (!width || !height || width > MAX_AVATAR_DIMENSION || height > MAX_AVATAR_DIMENSION || width * height > MAX_AVATAR_PIXELS) return null;
    const oriented = input.rotate();
    const output = contentType === "image/jpeg" ? await oriented.jpeg().toBuffer() : contentType === "image/png" ? await oriented.png().toBuffer() : await oriented.webp().toBuffer();
    return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

function consumeUploadAttempt(userId: string): boolean {
  const now = Date.now();
  const recent = (uploadAttempts.get(userId) ?? []).filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  uploadAttempts.set(userId, [...recent, now]);
  if (uploadAttempts.size > 1_000) {
    for (const [key, timestamps] of uploadAttempts) if (timestamps.every((timestamp) => now - timestamp >= RATE_WINDOW_MS)) uploadAttempts.delete(key);
  }
  return true;
}

async function cleanupProfileImages(userId: string, urls: readonly string[], context: string): Promise<void> {
  try {
    await removeProfileImagesByUrl(userId, [...urls]);
  } catch (cleanupError) {
    console.error(context, cleanupError);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);
  if (!consumeUploadAttempt(session.user.id)) return errorResponse("사진 업로드 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", 429);

  let body: FormData;
  try {
    body = await request.formData();
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return errorResponse("이미지 요청 형식이 올바르지 않습니다.", 400);
  }
  if (body.has("userId")) return errorResponse("사용자 식별자는 요청에 포함할 수 없습니다.", 400);
  const image = body.get("image");
  if (!isUploadedFile(image)) return errorResponse("이미지 파일이 필요합니다.", 400);
  if (image.size === 0) return errorResponse("이미지 파일이 비어 있습니다.", 400);
  if (image.size > MAX_AVATAR_BYTES) return errorResponse("프로필 이미지는 5MB 이하만 가능합니다.", 400);
  const ext = IMAGE_EXTENSIONS[image.type as keyof typeof IMAGE_EXTENSIONS];
  if (!ext) return errorResponse("지원하지 않는 이미지 형식입니다. JPG, PNG, WEBP를 사용해 주세요.", 400);
  const filenameExtension = image.name.toLowerCase().split(".").pop();
  const matchingExtensions = ext === "jpg" ? ["jpg", "jpeg"] : [ext];
  if (!filenameExtension || !matchingExtensions.includes(filenameExtension)) return errorResponse("이미지 MIME 형식과 파일 확장자가 일치하지 않습니다.", 400);
  const originalData = await image.arrayBuffer();
  const data = await decodeAndNormalizeImage(image.type as keyof typeof IMAGE_EXTENSIONS, originalData);
  if (!data) return errorResponse("이미지 파일을 안전하게 읽을 수 없거나 허용 해상도를 벗어났습니다.", 400);

  const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatar: true } });
  if (!current) return errorResponse("계정을 찾을 수 없습니다.", 404);

  let uploadedUrl: string | null = null;
  try {
    const uploaded = await uploadProfileImage(session.user.id, {
      data,
      contentType: image.type,
      ext,
    });
    uploadedUrl = uploaded.publicUrl;
    const updated = await prisma.user.updateMany({
      where: { id: session.user.id, avatar: current.avatar },
      data: { avatar: uploaded.publicUrl },
    });
    if (updated.count !== 1) {
      await cleanupProfileImages(session.user.id, [uploaded.publicUrl], "[me/avatar POST] concurrent upload cleanup error:");
      return errorResponse("프로필 사진이 다른 요청에서 변경되었습니다. 다시 시도해 주세요.", 409);
    }
    if (current.avatar && current.avatar !== uploaded.publicUrl) {
      await cleanupProfileImages(session.user.id, [current.avatar], "[me/avatar POST] previous image cleanup error:");
    }
    return NextResponse.json({ success: true, data: { avatar: uploaded.publicUrl } });
  } catch (error) {
    if (uploadedUrl) await cleanupProfileImages(session.user.id, [uploadedUrl], "[me/avatar POST] compensation cleanup error:");
    console.error("[me/avatar POST] error:", error);
    return errorResponse("프로필 사진을 저장하지 못했습니다. Storage 설정을 확인해 주세요.", 503);
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return errorResponse("Unauthorized", 401);
  const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatar: true } });
  if (!current) return errorResponse("계정을 찾을 수 없습니다.", 404);
  try {
    const updated = await prisma.user.updateMany({
      where: { id: session.user.id, avatar: current.avatar },
      data: { avatar: null },
    });
    if (updated.count !== 1) return errorResponse("프로필 사진이 다른 요청에서 변경되었습니다. 다시 시도해 주세요.", 409);
    if (current.avatar) {
      await cleanupProfileImages(session.user.id, [current.avatar], "[me/avatar DELETE] image cleanup error:");
    }
    return NextResponse.json({ success: true, data: { avatar: null } });
  } catch (error) {
    console.error("[me/avatar DELETE] error:", error);
    return errorResponse("프로필 사진을 삭제하지 못했습니다.", 500);
  }
}
