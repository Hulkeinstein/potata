import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const BENEFITS_WRITE_SCOPE = "BENEFITS_WRITE";
const PROOF_TTL_MS = 5 * 60 * 1000;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createStepUpToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function startGoogleStepUp(actorId: string): Promise<string> {
  const token = createStepUpToken();
  await prisma.adminStepUpProof.create({ data: { actorId, tokenHash: tokenHash(token), scope: BENEFITS_WRITE_SCOPE, expiresAt: new Date(Date.now() + PROOF_TTL_MS) } });
  return token;
}

export async function verifyGoogleStepUp(actorId: string, token: string): Promise<boolean> {
  const result = await prisma.adminStepUpProof.updateMany({ where: { actorId, tokenHash: tokenHash(token), scope: BENEFITS_WRITE_SCOPE, expiresAt: { gt: new Date() }, verifiedAt: null, consumedAt: null }, data: { verifiedAt: new Date() } });
  return result.count === 1;
}

export async function consumeGoogleStepUp(actorId: string, token: string): Promise<boolean> {
  const result = await prisma.adminStepUpProof.updateMany({ where: { actorId, tokenHash: tokenHash(token), scope: BENEFITS_WRITE_SCOPE, expiresAt: { gt: new Date() }, verifiedAt: { not: null }, consumedAt: null }, data: { consumedAt: new Date() } });
  return result.count === 1;
}
