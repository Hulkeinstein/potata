import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));

import { AdminReauthRateLimitError, resetAdminReauthAttemptsForTests, verifyAdminReauth } from "./admin-reauth";

describe("verifyAdminReauth", () => {
  beforeEach(() => { vi.clearAllMocks(); resetAdminReauthAttemptsForTests(); });

  it("동일 관리자의 연속 실패를 제한한다", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4); mocks.findUnique.mockResolvedValue({ passwordHash });
    for (let attempt = 0; attempt < 5; attempt += 1) expect(await verifyAdminReauth("admin-1", "wrong-password")).toBe(false);
    await expect(verifyAdminReauth("admin-1", "wrong-password")).rejects.toBeInstanceOf(AdminReauthRateLimitError);
    expect(mocks.findUnique).toHaveBeenCalledTimes(5);
  });

  it("성공하면 실패 횟수를 초기화한다", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4); mocks.findUnique.mockResolvedValue({ passwordHash });
    expect(await verifyAdminReauth("admin-1", "wrong-password")).toBe(false);
    expect(await verifyAdminReauth("admin-1", "correct-password")).toBe(true);
    expect(await verifyAdminReauth("admin-1", "wrong-password")).toBe(false);
  });
});
