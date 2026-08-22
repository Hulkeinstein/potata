import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { notification: { updateMany: mocks.updateMany } } }));

import { PATCH } from "./route";

describe("PATCH /api/notifications/read-all", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 before updating", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await PATCH()).status).toBe(401);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("updates only unread rows for the current recipient", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "recipient" } });
    mocks.updateMany.mockResolvedValue({ count: 2 });
    const response = await PATCH();
    expect(await response.json()).toEqual({ success: true, data: { updatedCount: 2 } });
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { recipientId: "recipient", readAt: null }, data: { readAt: expect.any(Date) } });
  });

  it("is idempotent when no unread rows remain", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "recipient" } });
    mocks.updateMany.mockResolvedValue({ count: 0 });
    expect(await (await PATCH()).json()).toMatchObject({ data: { updatedCount: 0 } });
  });
});
