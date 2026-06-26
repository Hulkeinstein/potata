/**
 * 이미지 업로드 검증 공용 — magic-byte(파일 시그니처) 검사로 클라 MIME 위조 방지.
 * admin 상품 등록 라우트의 sniffImage에서 추출(공용화). 공개 버킷 — defense-in-depth.
 */

/** 허용 MIME → 확장자 매핑 */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** 이미지 1장당 최대 크기 (5MB) */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** 리뷰 1건당 최대 이미지 수 */
export const MAX_REVIEW_IMAGES = 3;

/**
 * 파일 앞 바이트(magic number)로 실제 이미지 형식 확인.
 * 클라이언트 제공 MIME(Content-Type)만 신뢰하지 않고 바이트 수준에서 검증.
 */
export function sniffImage(buf: ArrayBuffer): "jpg" | "png" | "webp" | null {
  const b = new Uint8Array(buf);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return "png";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return "webp";
  return null;
}
