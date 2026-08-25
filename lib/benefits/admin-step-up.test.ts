import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { adminStepUpProof: { create: mocks.create, updateMany: mocks.updateMany } } }));

import { consumeGoogleStepUp, startGoogleStepUp, verifyGoogleStepUp } from "./admin-step-up";

describe("admin Google step-up", () => {
  beforeEach(() => vi.clearAllMocks());

  it("짧은 수명의 actor-bound proof를 만든다 when Google 재인증을 시작한다", async () => {
    mocks.create.mockResolvedValue({});
    const token = await startGoogleStepUp("admin-1");
    expect(token.length).toBeGreaterThan(20);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: "admin-1", scope: "BENEFITS_WRITE" }) }));
  });

  it("한 번만 소비한다 when 검증된 proof를 쓴다", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    expect(await verifyGoogleStepUp("admin-1", "token")).toBe(true);
    expect(await consumeGoogleStepUp("admin-1", "token")).toBe(true);
    expect(await consumeGoogleStepUp("admin-1", "token")).toBe(false);
  });
});
