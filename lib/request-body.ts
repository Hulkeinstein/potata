/**
 * 요청 본문을 크기 상한과 함께 읽는다.
 *
 * 왜 필요한가: route handler가 `req.json()`·`req.formData()`를 바로 부르면 본문 전체가 먼저 메모리에 올라간다.
 * 파일 크기 검사는 그 뒤에 도는 파생 검사라, 거대한 본문을 반복해 보내는 요청을 막지 못한다.
 * 여기서는 선언된 Content-Length를 먼저 보고, 그 값이 거짓일 수 있으므로 읽는 동안 누적 바이트도 함께 끊는다.
 */
import { NextResponse } from "next/server";

/** JSON 본문 상한. 이 앱의 JSON 요청은 식별자·짧은 문자열 위주라 100KB면 넉넉하다. */
export const MAX_JSON_BODY_BYTES = 100 * 1024;

/** multipart 경계 문자열과 함께 오는 텍스트 필드를 위한 여유분. */
export const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

/**
 * multipart 본문 상한을 각 route의 자기 상한에서 파생한다.
 *
 * 공통 상수 하나로 묶지 않는 이유: route마다 허용 장수가 달라(OOTD 5장, 리뷰 3장, 아바타 1장)
 * 하나로 정하면 어딘가는 반드시 실제 허용치보다 작아져 정상 업로드를 막는다.
 * 장수·장당 크기 검사는 각 route가 그대로 수행하며, 여기서는 "메모리에 올리기 전"만 책임진다.
 */
export function multipartBodyLimit(perFileBytes: number, maxFiles: number): number {
  return perFileBytes * maxFiles + MULTIPART_OVERHEAD_BYTES;
}

export type RequestBodyError = "too_large" | "invalid";

export type RequestBodyResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: RequestBodyError };

/**
 * 요청이 스스로 밝힌 크기(Content-Length)가 상한을 넘는가.
 *
 * multipart 업로드 route는 본문 파싱을 표준 `req.formData()`에 맡기므로 스트림을 직접 끊을 수 없다.
 * 대신 파싱 전에 이 검사를 먼저 통과시켜, 크게 선언된 요청이 메모리에 올라가는 것을 막는다.
 * 한계: Content-Length를 속이거나 생략한 요청은 걸러지지 않는다.
 */
export function isDeclaredBodyTooLarge(req: Request, maxBytes: number): boolean {
  const declared = req.headers.get("content-length");
  if (declared === null) return false;
  const size = Number(declared);
  return Number.isFinite(size) && size > maxBytes;
}

/**
 * 본문을 maxBytes까지만 읽는다. 상한을 넘으면 읽기를 중단하고 too_large를 돌려준다.
 * body가 없는 요청(GET 등)은 빈 바이트로 본다 — 파싱 단계에서 invalid로 걸린다.
 */
export async function readLimitedBody(
  req: Request,
  maxBytes: number,
): Promise<RequestBodyResult<Uint8Array>> {
  if (isDeclaredBodyTooLarge(req, maxBytes)) return { ok: false, error: "too_large" };

  const body = req.body;
  if (!body) return { ok: true, value: new Uint8Array(0) };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      // Content-Length가 거짓이거나 없을 수 있으므로 실제 누적치로 한 번 더 끊는다.
      if (total > maxBytes) {
        // cancel()을 await하면 그 거절이 아래 catch로 흘러 413이 400으로 뒤바뀐다. 결과를 기다리지 않는다.
        void reader.cancel().catch(() => {});
        return { ok: false, error: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, error: "invalid" }; // 연결이 끊기거나 깨진 스트림
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, value: merged };
}

/** JSON 본문을 상한과 함께 읽어 파싱한다. 파싱 실패와 상한 초과를 구분해 돌려준다. */
export async function readJsonBody<T>(
  req: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<RequestBodyResult<T>> {
  const bytes = await readLimitedBody(req, maxBytes);
  if (!bytes.ok) return bytes;
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes.value)) as T };
  } catch {
    return { ok: false, error: "invalid" };
  }
}

/** 본문 읽기 실패를 기존 응답 형식({ success, error })에 맞춰 돌려준다. */
export function requestBodyErrorResponse(error: RequestBodyError): NextResponse {
  return error === "too_large"
    ? NextResponse.json({ success: false, error: "요청 본문이 너무 큽니다." }, { status: 413 })
    : NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
}
