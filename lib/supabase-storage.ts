import "server-only";

/**
 * Supabase Storage 헬퍼 — **서버 전용**.
 *
 * - 최상단 `import "server-only"`로 클라이언트 번들 유입을 빌드 단계에서 차단한다.
 *   service_role 키는 모든 권한을 가지므로 절대 클라이언트에 노출하면 안 된다.
 * - Storage REST API를 fetch로 직접 호출한다(@supabase/supabase-js 미사용).
 *   SDK는 realtime/WebSocket 의존성 때문에 Node 20 서버에서 문제가 되므로,
 *   realtime이 불필요한 Storage는 가벼운 REST 경로가 견고하다.
 * - env는 호출 시점에 읽어 누락 시 throw(모듈 로드 시 throw 금지 — 키 없이도 빌드/테스트 통과).
 */

function getEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase Storage 환경변수 누락: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local 확인)"
    );
  }
  return { url: url.replace(/\/$/, ""), key };
}

/** Storage에 업로드할 이미지 파일 데이터 */
export interface ImageFile {
  data: ArrayBuffer; // 라우트가 File.arrayBuffer()로 전달(fetch BodyInit 호환)
  contentType: string;
  ext: string;
}

/** 하위 호환 alias — 기존 OOTDImageFile import를 파손하지 않기 위해 유지 */
export type OOTDImageFile = ImageFile;

// ─────────────────────────────────────────────────────────────────────────────
// 제네릭 코어 (bucket을 인자로 받아 어느 버킷에도 사용 가능)
// ─────────────────────────────────────────────────────────────────────────────

/** 이미지 1장을 지정 버킷에 업로드하고 path + public URL 반환 */
export async function uploadImage(
  bucket: string,
  pathPrefix: string,
  file: ImageFile
): Promise<{ path: string; publicUrl: string }> {
  const { url, key } = getEnv();
  const path = pathPrefix
    ? `${pathPrefix}/${crypto.randomUUID()}.${file.ext}`
    : `${crypto.randomUUID()}.${file.ext}`;
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": file.contentType,
      "x-upsert": "false",
    },
    body: file.data,
  });
  if (!res.ok) {
    throw new Error(`Storage 업로드 실패: ${res.status} ${await res.text()}`);
  }
  return { path, publicUrl: `${url}/storage/v1/object/public/${bucket}/${path}` };
}

/** public URL → 지정 버킷 내 path 추출. 형식: .../storage/v1/object/public/<bucket>/<path> */
export function publicUrlToPath(bucket: string, publicUrl: string): string {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  return idx === -1 ? "" : publicUrl.slice(idx + marker.length);
}

/**
 * public URL 배열에 해당하는 Storage 파일 삭제(보상/동기 삭제용). 빈 배열이면 no-op.
 * 업로드 후 DB 실패 시 정리, 게시물 삭제 시 동기 삭제에 사용.
 */
export async function removeImagesByUrl(
  bucket: string,
  publicUrls: string[]
): Promise<void> {
  if (publicUrls.length === 0) return;
  const paths = publicUrls
    .map((u) => publicUrlToPath(bucket, u))
    .filter((p) => p.length > 0);
  if (paths.length === 0) return;
  const { url, key } = getEnv();
  const res = await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!res.ok) {
    throw new Error(`Storage 삭제 실패: ${res.status} ${await res.text()}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OOTD 래퍼 — 시그니처·동작 불변 (ootd 라우트 무수정)
// ─────────────────────────────────────────────────────────────────────────────

const OOTD_BUCKET = "ootd-images";

/** OOTD 이미지 1장을 Storage에 업로드하고 path + public URL 반환 */
export function uploadOOTDImage(
  userId: string,
  file: ImageFile
): Promise<{ path: string; publicUrl: string }> {
  // path 규칙: ${userId}/${uuid}.${ext} — OOTD 기존 동작 그대로 유지
  return uploadImage(OOTD_BUCKET, userId, file);
}

/** OOTD public URL 배열에 해당하는 Storage 파일 삭제 */
export function removeOOTDImagesByUrl(publicUrls: string[]): Promise<void> {
  return removeImagesByUrl(OOTD_BUCKET, publicUrls);
}

// ─────────────────────────────────────────────────────────────────────────────
// Product 래퍼 — product-images 버킷 바인딩
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_BUCKET = "product-images";

/** 상품 이미지 1장을 Storage에 업로드하고 path + public URL 반환 */
export function uploadProductImage(
  file: ImageFile
): Promise<{ path: string; publicUrl: string }> {
  return uploadImage(PRODUCT_BUCKET, "products", file);
}

/** 상품 public URL 배열에 해당하는 Storage 파일 삭제 */
export function removeProductImagesByUrl(publicUrls: string[]): Promise<void> {
  return removeImagesByUrl(PRODUCT_BUCKET, publicUrls);
}
