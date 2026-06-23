import "server-only";

/**
 * OOTD 이미지용 Supabase Storage 헬퍼 — **서버 전용**.
 *
 * - 최상단 `import "server-only"`로 클라이언트 번들 유입을 빌드 단계에서 차단한다.
 *   service_role 키는 모든 권한을 가지므로 절대 클라이언트에 노출하면 안 된다.
 * - Storage REST API를 fetch로 직접 호출한다(@supabase/supabase-js 미사용).
 *   SDK는 realtime/WebSocket 의존성 때문에 Node 20 서버에서 문제가 되므로,
 *   realtime이 불필요한 Storage는 가벼운 REST 경로가 견고하다.
 * - env는 호출 시점에 읽어 누락 시 throw(모듈 로드 시 throw 금지 — 키 없이도 빌드/테스트 통과).
 */

const BUCKET = "ootd-images";

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

export interface OOTDImageFile {
  data: ArrayBuffer; // 라우트가 File.arrayBuffer()로 전달(fetch BodyInit 호환)
  contentType: string;
  ext: string;
}

/** OOTD 이미지 1장을 Storage에 업로드하고 path + public URL 반환 */
export async function uploadOOTDImage(
  userId: string,
  file: OOTDImageFile
): Promise<{ path: string; publicUrl: string }> {
  const { url, key } = getEnv();
  const path = `${userId}/${crypto.randomUUID()}.${file.ext}`;
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
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
  return { path, publicUrl: `${url}/storage/v1/object/public/${BUCKET}/${path}` };
}

/**
 * public URL 배열에 해당하는 Storage 파일 삭제(보상/동기 삭제용). 빈 배열이면 no-op.
 * 업로드 후 DB 실패 시 정리, 게시물 삭제 시 동기 삭제에 사용.
 */
export async function removeOOTDImagesByUrl(publicUrls: string[]): Promise<void> {
  if (publicUrls.length === 0) return;
  const paths = publicUrls.map(publicUrlToPath).filter((p) => p.length > 0);
  if (paths.length === 0) return;
  const { url, key } = getEnv();
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!res.ok) {
    throw new Error(`Storage 삭제 실패: ${res.status} ${await res.text()}`);
  }
}

/** public URL → 버킷 내 path 추출. 형식: .../storage/v1/object/public/ootd-images/<path> */
export function publicUrlToPath(publicUrl: string): string {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  return idx === -1 ? "" : publicUrl.slice(idx + marker.length);
}
