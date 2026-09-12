import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique, update: mocks.update, updateMany: mocks.updateMany } },
}));
vi.mock("@/lib/supabase-storage", () => ({
  uploadProfileImage: mocks.upload,
  removeProfileImagesByUrl: mocks.remove,
}));

import { DELETE, POST } from "./route";

function imageRequest(file: File, extra?: readonly [string, string]): Request {
  const request = new Request("http://localhost/api/users/me/avatar", { method: "POST" });
  Object.defineProperty(request, "formData", { value: async () => ({
    has: (key: string) => key === extra?.[0],
    get: (key: string) => key === "image" ? file : key === extra?.[0] ? extra[1] : null,
  }) });
  return request;
}

let pngBytes: ArrayBuffer;
function pngFile(name = "avatar.png") { return new File([pngBytes], name, { type: "image/png" }); }

describe("profile avatar route", () => {
  beforeAll(async () => {
    const buffer = await sharp({ create: { width: 2, height: 2, channels: 4, background: "white" } }).png().toBuffer();
    pngBytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "owner" } });
    mocks.findUnique.mockResolvedValue({ avatar: "https://google.example/avatar.jpg" });
    mocks.upload.mockResolvedValue({ path: "owner/new.png", publicUrl: "https://storage.example/new.png" });
    mocks.update.mockResolvedValue({ avatar: "https://storage.example/new.png" });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.remove.mockResolvedValue(undefined);
  });

  it("rejects upload when unauthenticated", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await POST(imageRequest(pngFile()));
    expect(response.status).toBe(401);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it.each([
    [new File(["text"], "avatar.txt", { type: "text/plain" }), "지원하지 않는 이미지 형식"],
    [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "avatar.png", { type: "image/png" }), "5MB 이하"],
    [new File([], "avatar.png", { type: "image/png" }), "비어 있습니다"],
  ])("rejects invalid image payloads", async (file, message) => {
    const response = await POST(imageRequest(file));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain(message);
  });

  it("rejects a client supplied user id", async () => {
    const response = await POST(imageRequest(pngFile(), ["userId", "foreign"]));
    expect(response.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects a supported MIME with a misleading extension", async () => {
    const response = await POST(imageRequest(pngFile("avatar.exe")));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("파일 확장자");
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("uploads for the session owner and returns the persisted public URL", async () => {
    const response = await POST(imageRequest(pngFile()));
    expect(response.status).toBe(200);
    expect(mocks.upload).toHaveBeenCalledWith("owner", expect.objectContaining({ contentType: "image/png", ext: "png" }));
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: "owner", avatar: "https://google.example/avatar.jpg" }, data: { avatar: "https://storage.example/new.png" } });
    expect(await response.json()).toEqual({ success: true, data: { avatar: "https://storage.example/new.png" } });
  });

  it("replaces an owned stored image and cleans it after persistence", async () => {
    mocks.findUnique.mockResolvedValue({ avatar: "https://storage.example/old.png" });
    await POST(imageRequest(pngFile()));
    expect(mocks.remove).toHaveBeenCalledWith("owner", ["https://storage.example/old.png"]);
  });

  it("removes the session owner's image", async () => {
    mocks.findUnique.mockResolvedValue({ avatar: "https://storage.example/old.png" });
    mocks.update.mockResolvedValue({ avatar: null });
    const response = await DELETE();
    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: "owner", avatar: "https://storage.example/old.png" }, data: { avatar: null } });
    expect(mocks.remove).toHaveBeenCalledWith("owner", ["https://storage.example/old.png"]);
  });

  it("rejects an image whose bytes do not match its declared type", async () => {
    const response = await POST(imageRequest(new File(["not a png"], "avatar.png", { type: "image/png" })));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("안전하게 읽을 수 없");
  });

  it("rejects a truncated image that only contains a plausible PNG header", async () => {
    const response = await POST(imageRequest(new File([pngBytes.slice(0, 24)], "truncated.png", { type: "image/png" })));
    expect(response.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects trailing polyglot data instead of forwarding original bytes", async () => {
    const valid = await sharp({ create: { width: 2, height: 2, channels: 4, background: "white" } }).png().toBuffer();
    const response = await POST(imageRequest(new File([valid, "<script>alert(1)</script>"], "polyglot.png", { type: "image/png" })));
    expect(response.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects animated multi-page WebP uploads", async () => {
    const red = await sharp({ create: { width: 2, height: 2, channels: 4, background: "red" } }).png().toBuffer();
    const blue = await sharp({ create: { width: 2, height: 2, channels: 4, background: "blue" } }).png().toBuffer();
    const animated = await sharp([red, blue], { join: { animated: true } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
    const response = await POST(imageRequest(new File([animated], "animated.webp", { type: "image/webp" })));
    expect(response.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("decodes and forwards a canonicalized real image", async () => {
    const valid = await sharp({ create: { width: 2, height: 2, channels: 4, background: "white" } }).png().toBuffer();
    const response = await POST(imageRequest(new File([valid], "real.png", { type: "image/png" })));
    expect(response.status).toBe(200);
    const uploadedFile = mocks.upload.mock.calls[0]?.[1] as { data: ArrayBuffer; contentType: string; ext: string };
    expect(uploadedFile.contentType).toBe("image/png");
    expect(uploadedFile.ext).toBe("png");
    expect(uploadedFile.data.byteLength).toBeGreaterThan(0);
  });

  it("rejects an image with an excessive decoded pixel count", async () => {
    const hugePng = await sharp({ create: { width: 5_001, height: 5_001, channels: 3, background: "white" } }).png().toBuffer();
    const response = await POST(imageRequest(new File([hugePng], "huge.png", { type: "image/png" })));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("해상도");
  });

  it("removes a Google avatar even when storage cleanup throws synchronously", async () => {
    mocks.findUnique.mockResolvedValue({ avatar: "https://google.example/avatar.jpg" });
    mocks.remove.mockImplementation(() => { throw new Error("bucket missing"); });
    const response = await DELETE();
    expect(response.status).toBe(200);
  });

  it("compensates a new upload when the avatar compare-and-set fails", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const response = await POST(imageRequest(pngFile()));
    expect(response.status).toBe(409);
    expect(mocks.remove).toHaveBeenCalledWith("owner", ["https://storage.example/new.png"]);
  });

  it("compensates a new upload when the database update throws", async () => {
    mocks.updateMany.mockRejectedValue(new Error("db unavailable"));
    const response = await POST(imageRequest(pngFile()));
    expect(response.status).toBe(503);
    expect(mocks.remove).toHaveBeenCalledWith("owner", ["https://storage.example/new.png"]);
  });

  it("rate limits repeated uploads per user", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "rate-limited-owner" } });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect((await POST(imageRequest(pngFile()))).status).toBe(200);
    }
    const response = await POST(imageRequest(pngFile()));
    expect(response.status).toBe(429);
    expect((await response.json()).error).toContain("잠시 후");
  });
});
