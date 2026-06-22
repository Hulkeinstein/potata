import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * OOTD 이미지용 Supabase Storage 헬퍼 — **서버 전용**.
 *
 * - 최상단 `import "server-only"`로 클라이언트 번들 유입을 빌드 단계에서 차단한다.
 *   service_role 키는 모든 권한을 가지므로 절대 클라이언트에 노출하면 안 된다.
 * - 클라이언트는 lazy 생성: env 누락 시 모듈 로드가 아니라 **호출 시점에** throw
 *   (키 없이도 PR1 빌드/테스트가 통과해야 하므로).
 */

const BUCKET = "ootd-images";

let cached: SupabaseClient | null = null;

function getStorageClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase Storage 환경변수 누락: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local 확인)"
    );
  }
  cached = createClient(url, serviceKey, { auth: { persistSession: false } });
  return cached;
}

export interface OOTDImageFile {
  data: ArrayBuffer | Buffer;
  contentType: string;
  ext: string;
}

/** OOTD 이미지 1장을 Storage에 업로드하고 path + public URL 반환 */
export async function uploadOOTDImage(
  userId: string,
  file: OOTDImageFile
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getStorageClient();
  const path = `${userId}/${crypto.randomUUID()}.${file.ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file.data, { contentType: file.contentType, upsert: false });
  if (error) throw new Error(`Storage 업로드 실패: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/**
 * public URL 배열에 해당하는 Storage 파일 삭제(보상/동기 삭제용). 빈 배열이면 no-op.
 * 업로드 후 DB 실패 시 정리, 게시물 삭제 시 동기 삭제에 사용.
 */
export async function removeOOTDImagesByUrl(publicUrls: string[]): Promise<void> {
  if (publicUrls.length === 0) return;
  const paths = publicUrls.map(publicUrlToPath).filter((p) => p.length > 0);
  if (paths.length === 0) return;
  const supabase = getStorageClient();
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw new Error(`Storage 삭제 실패: ${error.message}`);
}

/** public URL → 버킷 내 path 추출. 형식: .../storage/v1/object/public/ootd-images/<path> */
export function publicUrlToPath(publicUrl: string): string {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  return idx === -1 ? "" : publicUrl.slice(idx + marker.length);
}
