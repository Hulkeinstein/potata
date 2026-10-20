import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { auth } from '@/auth';
import { isAdmin } from '@/lib/admin';
import { getAdminProductImage, replaceAdminProductImage } from '@/lib/admin-product-image';
import { readLimitedBody, requestBodyErrorResponse } from '@/lib/request-body';
import { sniffProductImage } from '@/lib/product-image-signature';
import { removeProductImagesByUrl, uploadProductImage } from '@/lib/supabase-storage';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

function errorResponse(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: Request, context: { readonly params: Promise<{ readonly id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse(401, 'Unauthorized');
  if (!isAdmin(session.user.email)) return errorResponse(403, 'Forbidden');

  const limited = await readLimitedBody(request, MAX_REQUEST_BYTES);
  if (!limited.ok) return requestBodyErrorResponse(limited.error);
  let form: FormData;
  try {
    form = await new Response(new Uint8Array(limited.value), { headers: { 'content-type': request.headers.get('content-type') ?? '' } }).formData();
  } catch (error) {
    if (error instanceof Error) return errorResponse(400, '요청 형식이 올바르지 않습니다.');
    throw error;
  }
  const image = form.get('image');
  const expectedValue = form.get('expectedImageUrl');
  const encoding = form.get('expectedImageUrlEncoding');
  if (!image || typeof image === 'string' || form.getAll('image').length !== 1 || typeof expectedValue !== 'string' || expectedValue.length > 49152 || form.getAll('expectedImageUrl').length !== 1 || form.getAll('expectedImageUrlEncoding').length > 1 || (encoding !== null && encoding !== 'uri')) {
    return errorResponse(400, '대표 사진 한 장과 현재 이미지 정보가 필요합니다.');
  }
  let expectedImageUrl = expectedValue;
  if (encoding === 'uri') {
    try { expectedImageUrl = decodeURIComponent(expectedValue); }
    catch (error) { if (error instanceof URIError) return errorResponse(400, '현재 이미지 정보가 올바르지 않습니다.'); throw error; }
  }
  if (expectedImageUrl.length > 4096) return errorResponse(400, '현재 이미지 정보가 너무 깁니다.');
  if (image.size === 0 || image.size > MAX_IMAGE_BYTES) return errorResponse(413, '사진은 3MB 이하로 선택해 주세요.');
  const data = await image.arrayBuffer();
  const ext = sniffProductImage(data);
  const contentType = ext === 'jpg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : null;
  if (!contentType || image.type !== contentType || !ext) return errorResponse(400, 'JPG, PNG, WebP 이미지 파일을 선택해 주세요.');

  let uploadedUrl: string | undefined;
  let committed = false;
  // no-excuse-ok: catch — HTTP 경계에서 Storage/DB 오류를 일반 오류로 변환한다.
  try {
    const current = await getAdminProductImage((await context.params).id);
    if (!current) return errorResponse(404, '상품을 찾을 수 없습니다.');
    if (current.imageUrl !== expectedImageUrl) return errorResponse(409, '대표 사진이 변경되었습니다. 새로고침 후 다시 시도해 주세요.');
    const uploaded = await uploadProductImage({ data, contentType, ext });
    uploadedUrl = uploaded.publicUrl;
    const result = await replaceAdminProductImage((await context.params).id, expectedImageUrl, uploaded.publicUrl);
    switch (result.kind) {
      case 'saved':
        committed = true;
        revalidateTag('products', { expire: 0 });
        return NextResponse.json({ success: true, data: { imageUrl: result.imageUrl } });
      case 'missing':
        return errorResponse(404, '상품을 찾을 수 없습니다.');
      case 'conflict':
        return errorResponse(409, '대표 사진이 변경되었습니다. 새로고침 후 다시 시도해 주세요.');
      default: {
        const unreachable: never = result;
        return unreachable;
      }
    }
  } catch (error) {
    console.error('[admin product image] save failed', error instanceof Error ? error.name : 'UnknownError');
    return errorResponse(500, '대표 사진을 저장하지 못했습니다. 다시 시도해 주세요.');
  } finally {
    if (uploadedUrl && !committed) {
      try { await removeProductImagesByUrl([uploadedUrl]); }
      catch (error) { console.warn('[admin product image] uploaded-file cleanup failed', error instanceof Error ? error.name : 'UnknownError'); }
    }
  }
}
