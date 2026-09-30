import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock 참조를 vi.mock 호이스팅보다 먼저 초기화 (TDZ 회피)
const { authMock, runMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    runMock: vi.fn(),
}));

// 인증 모듈 mock — 실제 NextAuth/Prisma 로드 방지
vi.mock("@/auth", () => ({ auth: authMock }));
// Replicate mock — 유료 API 실제 호출 방지 (new로 호출되므로 class/constructor 필요)
vi.mock("replicate", () => ({
    default: class {
        run = runMock;
    },
}));

import { POST } from "./route";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

function makeReq(body: unknown): Request {
    return new Request("http://localhost/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

const VALID = {
    userImage: "data:image/png;base64,AAAA",
    productImage: "https://example.com/product.jpg",
};

describe("POST /api/try-on", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetRateLimitsForTests();
        process.env.REPLICATE_API_TOKEN = "test-token";
    });

    // 클라이언트는 사진을 base64 data URL로 통째로 실어 보낸다(TryOnContent의 canvas.toDataURL).
    // 본문 크기 상한을 JSON 기본값(100KB)으로 두면 실제 사진이 전부 413으로 막힌다 — 그 회귀를 막는다.
    it("실제 사진 크기(약 1.2MB)의 본문도 413으로 막히지 않는다", async () => {
        authMock.mockResolvedValue({ user: { id: "u1" } });
        const realisticPhoto = `data:image/jpeg;base64,${"A".repeat(1_200_000)}`;

        const res = await POST(makeReq({ ...VALID, userImage: realisticPhoto }));

        expect(res.status).not.toBe(413);
    });

    it("미인증 요청은 401이며 Replicate를 호출하지 않는다 (크레딧 보호)", async () => {
        authMock.mockResolvedValue(null);

        const res = await POST(makeReq(VALID));

        expect(res.status).toBe(401);
        expect(runMock).not.toHaveBeenCalled();
    });


    it("한 사용자가 반복 호출하면 429로 막는다 (유료 호출 남용 방지)", async () => {
        authMock.mockResolvedValue({ user: { id: "u1" } });
        runMock.mockResolvedValue(["https://example.com/out.png"]);

        for (let attempt = 0; attempt < 20; attempt += 1) {
            expect((await POST(makeReq(VALID))).status).toBe(200);
        }
        const blocked = await POST(makeReq(VALID));

        expect(blocked.status).toBe(429);
        expect(runMock).toHaveBeenCalledTimes(20);
    });

    it("인증됐으나 이미지 누락 시 400", async () => {
        authMock.mockResolvedValue({ user: { id: "u1" } });

        const res = await POST(makeReq({}));

        expect(res.status).toBe(400);
        expect(runMock).not.toHaveBeenCalled();
    });

    it("인증됐으나 허용되지 않은 입력(data:/https 아님)은 400", async () => {
        authMock.mockResolvedValue({ user: { id: "u1" } });

        const res = await POST(
            makeReq({ userImage: "javascript:alert(1)", productImage: "ftp://x/y" })
        );

        expect(res.status).toBe(400);
        expect(runMock).not.toHaveBeenCalled();
    });

    it("인증 + 유효 입력이면 Replicate 호출 후 output 반환", async () => {
        authMock.mockResolvedValue({ user: { id: "u1" } });
        runMock.mockResolvedValue("https://result/image.png");

        const res = await POST(makeReq(VALID));

        expect(res.status).toBe(200);
        expect(runMock).toHaveBeenCalledTimes(1);
        const json = (await res.json()) as { output: string };
        expect(json.output).toBe("https://result/image.png");
    });
});
