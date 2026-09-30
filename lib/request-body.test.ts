import { describe, expect, it } from "vitest";

import {
  isDeclaredBodyTooLarge,
  MAX_JSON_BODY_BYTES,
  readJsonBody,
  readLimitedBody,
  requestBodyErrorResponse,
} from "./request-body";

function jsonRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

/** Content-Length 없이 청크로 흘려보내는 요청 — 선언 크기로는 막을 수 없는 경우를 만든다. */
function streamedRequest(chunks: readonly Uint8Array[]): Request {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    // @ts-expect-error duplex는 스트림 본문에 필요하지만 Request 타입에 아직 없다
    duplex: "half",
  });
}

describe("readLimitedBody", () => {
  it("상한 안의 본문은 그대로 읽는다", async () => {
    const result = await readLimitedBody(jsonRequest("hello"), 100);
    expect(result.ok).toBe(true);
    // jsdom에서는 요청 본문이 다른 realm의 Uint8Array로 와 toEqual이 어긋난다 — 내용으로 비교한다.
    if (result.ok) expect(new TextDecoder().decode(result.value)).toBe("hello");
  });

  it("선언된 Content-Length가 상한을 넘으면 읽기 전에 거절한다", async () => {
    const result = await readLimitedBody(jsonRequest("hi", { "content-length": "999999" }), 100);
    expect(result).toEqual({ ok: false, error: "too_large" });
  });

  it("Content-Length가 없어도 실제 누적 바이트로 끊는다", async () => {
    const chunk = new Uint8Array(60);
    const result = await readLimitedBody(streamedRequest([chunk, chunk]), 100);
    expect(result).toEqual({ ok: false, error: "too_large" });
  });

  it("여러 청크로 나뉘어 와도 원래 바이트로 합친다", async () => {
    const result = await readLimitedBody(
      streamedRequest([new Uint8Array([1, 2]), new Uint8Array([3])]),
      100,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(Array.from(result.value)).toEqual([1, 2, 3]);
  });

  it("상한과 정확히 같은 크기는 통과한다", async () => {
    const result = await readLimitedBody(streamedRequest([new Uint8Array(10)]), 10);
    expect(result.ok).toBe(true);
  });
});

describe("readJsonBody", () => {
  it("본문을 파싱해 돌려준다", async () => {
    const result = await readJsonBody<{ a: number }>(jsonRequest(JSON.stringify({ a: 1 })));
    expect(result).toEqual({ ok: true, value: { a: 1 } });
  });

  it("깨진 JSON은 invalid", async () => {
    expect(await readJsonBody(jsonRequest("{"))).toEqual({ ok: false, error: "invalid" });
  });

  it("본문이 없으면 invalid — 빈 바이트는 JSON이 아니다", async () => {
    const empty = new Request("http://localhost/api/test", { method: "POST" });
    expect(await readJsonBody(empty)).toEqual({ ok: false, error: "invalid" });
  });

  it("기본 상한을 넘는 JSON은 too_large", async () => {
    const huge = JSON.stringify({ a: "x".repeat(MAX_JSON_BODY_BYTES) });
    expect(await readJsonBody(jsonRequest(huge))).toEqual({ ok: false, error: "too_large" });
  });
});

describe("requestBodyErrorResponse", () => {
  it("too_large는 413", async () => {
    const res = requestBodyErrorResponse("too_large");
    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({ success: false, error: "요청 본문이 너무 큽니다." });
  });

  it("invalid는 400", () => {
    expect(requestBodyErrorResponse("invalid").status).toBe(400);
  });
});

describe("isDeclaredBodyTooLarge", () => {
  it("선언 크기가 상한을 넘으면 true", () => {
    expect(isDeclaredBodyTooLarge(jsonRequest("x", { "content-length": "101" }), 100)).toBe(true);
  });

  it("상한과 같으면 false — 경계는 허용한다", () => {
    expect(isDeclaredBodyTooLarge(jsonRequest("x", { "content-length": "100" }), 100)).toBe(false);
  });

  it.each([
    ["헤더가 없는 요청", {}],
    ["숫자가 아닌 값", { "content-length": "lots" }],
  ])("%s는 false — 판단 근거가 없으면 여기서 막지 않는다", (_label, headers) => {
    expect(isDeclaredBodyTooLarge(jsonRequest("x", headers), 100)).toBe(false);
  });
});
