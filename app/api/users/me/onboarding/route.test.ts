import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { session, findUser, updateUser, transaction } = vi.hoisted(() => ({
  session: vi.fn(), findUser: vi.fn(), updateUser: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: session }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
import { PATCH } from "./route";

const valid = { name: "Owner", handle: "owner_123", termsVersion: "draft-2026-09-01", privacyVersion: "draft-2026-09-01", termsAccepted: true, privacyAccepted: true, marketingAccepted: false };
const request = (body: unknown = valid) => new Request("http://localhost/api/users/me/onboarding", { method: "PATCH", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("LEGAL_DOCS_PRODUCTION_READY", "false");
  vi.stubEnv("PRELAUNCH_ONBOARDING_EMAIL", "owner@example.com");
  session.mockResolvedValue({ user: { id: "session-owner", email: "owner@example.com" } });
  findUser.mockResolvedValue({ email: "other@example.com", emailVerified: true, handle: null, onboardingCompletedAt: null });
  transaction.mockImplementation(async (action) => action({ user: { findUnique: findUser, update: updateUser } }));
});
afterEach(() => vi.unstubAllEnvs());

describe("prelaunch onboarding owner gate", () => {
  it("denies an outsider despite an allowlisted session email", async () => {
    const response = await PATCH(request());
    expect(response.status).toBe(403);
    expect(findUser).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "session-owner" } }));
    expect(updateUser).not.toHaveBeenCalled();
  });
  it("does not allow a client-supplied email override", async () => {
    expect((await PATCH(request({ ...valid, email: "owner@example.com" }))).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("requires real consent even for the configured account", async () => {
    expect((await PATCH(request({ ...valid, termsAccepted: false }))).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("denies a deleted account instead of creating one", async () => {
    findUser.mockResolvedValue(null);
    expect((await PATCH(request())).status).toBe(404);
  });
  it("saves the configured account profile and draft consent using the session owner", async () => {
    findUser.mockResolvedValue({ email: "owner@example.com", emailVerified: true, handle: null, onboardingCompletedAt: null });
    updateUser.mockResolvedValue({ handle: valid.handle });
    const document = vi.fn(async ({ create }) => ({ ...create, id: create.type }));
    const consent = vi.fn();
    transaction.mockImplementation(async (action) => action({
      user: { findUnique: findUser, update: updateUser },
      legalDocumentVersion: { upsert: document },
      userSettings: { upsert: vi.fn() }, userConsent: { createMany: consent },
    }));
    expect((await PATCH(request())).status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "session-owner" }, data: expect.objectContaining({ name: valid.name, handle: valid.handle, onboardingCompletedAt: expect.any(Date) }) }));
    expect(document).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: "DRAFT" }) }));
    expect(consent).toHaveBeenCalledWith(expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ userId: "session-owner", source: "ONBOARDING_PROFILE" })]) }));
  });
});
