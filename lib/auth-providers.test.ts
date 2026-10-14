import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: mock 참조를 vi.mock 호이스팅보다 먼저 초기화 (TDZ 회피)
const { userFindUnique, userUpsert, bcryptCompare } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpsert: vi.fn(),
  bcryptCompare: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUnique,
      upsert: userUpsert,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: { compare: bcryptCompare },
}));

// 실제 요청 제한은 그대로 쓰고 호출(키·순서)만 기록한다 — 키 이름과 "발신지 버킷 먼저" 순서를 테스트로 고정하기 위해
vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return { ...actual, consumeRateLimit: vi.fn(actual.consumeRateLimit) };
});

import { authorizeCredentials, syncOAuthUser } from "./auth-providers";
import { consumeRateLimit, resetRateLimitsForTests } from "./rate-limit";

const verifiedUser = {
  id: "u1",
  email: "a@b.com",
  name: "A",
  avatar: null,
  passwordHash: "$2a$10$hash",
  emailVerified: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimitsForTests();
});

const IP = "203.0.113.7";

describe("authorizeCredentials", () => {
  it("이메일/비밀번호 누락 시 null", async () => {
    expect(await authorizeCredentials(undefined, "pw", IP)).toBeNull();
    expect(await authorizeCredentials("a@b.com", undefined, IP)).toBeNull();
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("존재하지 않는 유저면 null", async () => {
    userFindUnique.mockResolvedValue(null);
    expect(await authorizeCredentials("a@b.com", "pw", IP)).toBeNull();
  });

  it("미인증(emailVerified=false) 유저면 null", async () => {
    userFindUnique.mockResolvedValue({ ...verifiedUser, emailVerified: false });
    expect(await authorizeCredentials("a@b.com", "pw", IP)).toBeNull();
    expect(bcryptCompare).not.toHaveBeenCalled();
  });

  it("OAuth 전용 유저(passwordHash=null)는 비밀번호 로그인 불가 → null", async () => {
    userFindUnique.mockResolvedValue({ ...verifiedUser, passwordHash: null });
    expect(await authorizeCredentials("a@b.com", "pw", IP)).toBeNull();
    expect(bcryptCompare).not.toHaveBeenCalled(); // null 가드가 compare 호출 차단
  });

  it("비밀번호 불일치면 null", async () => {
    userFindUnique.mockResolvedValue(verifiedUser);
    bcryptCompare.mockResolvedValue(false);
    expect(await authorizeCredentials("a@b.com", "wrong", IP)).toBeNull();
  });

  it("정상 자격증명이면 user 반환", async () => {
    userFindUnique.mockResolvedValue(verifiedUser);
    bcryptCompare.mockResolvedValue(true);
    expect(await authorizeCredentials("a@b.com", "pw", IP)).toEqual({
      id: "u1",
      email: "a@b.com",
      name: "A",
      image: null,
    });
  });
});

describe("authorizeCredentials 횟수 제한", () => {
  it("같은 주소로 반복 시도하면 비밀번호 확인 없이 막는다", async () => {
    userFindUnique.mockResolvedValue(verifiedUser);
    bcryptCompare.mockResolvedValue(false);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(await authorizeCredentials("a@b.com", "wrong", IP)).toBeNull();
    }
    bcryptCompare.mockResolvedValue(true);

    expect(await authorizeCredentials("a@b.com", "correct", IP)).toBeNull();
    expect(bcryptCompare).toHaveBeenCalledTimes(10); // 11번째는 비교 자체를 하지 않는다
  });
});

describe("authorizeCredentials 발신지 횟수 제한", () => {
  it("같은 발신지에서 이메일을 바꿔 가며 시도해도 50회를 넘으면 비밀번호 확인 없이 막는다", async () => {
    userFindUnique.mockResolvedValue(verifiedUser);
    bcryptCompare.mockResolvedValue(false);

    for (let attempt = 0; attempt < 50; attempt += 1) {
      expect(await authorizeCredentials(`user${attempt}@b.com`, "wrong", IP)).toBeNull();
    }
    bcryptCompare.mockResolvedValue(true);

    expect(await authorizeCredentials("a@b.com", "correct", IP)).toBeNull();
    expect(bcryptCompare).toHaveBeenCalledTimes(50); // 51번째는 비교 자체를 하지 않는다
  });

  it("발신지 버킷(login-ip:)을 먼저 보고, 막히면 이메일 버킷은 건드리지 않는다", async () => {
    userFindUnique.mockResolvedValue(verifiedUser);
    bcryptCompare.mockResolvedValue(false);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await authorizeCredentials(`user${attempt}@b.com`, "wrong", IP);
    }
    vi.mocked(consumeRateLimit).mockClear();

    expect(await authorizeCredentials("fresh@b.com", "pw", IP)).toBeNull();

    // 발신지가 막혔으므로 이메일 버킷은 호출조차 되지 않는다(순서가 바뀌면 fresh@b.com 버킷이 소비된다)
    expect(vi.mocked(consumeRateLimit).mock.calls).toEqual([[`login-ip:${IP}`, 50, 10 * 60 * 1000]]);
  });

  it("허용될 때는 발신지 → 이메일 순서로 정확한 키를 쓴다", async () => {
    userFindUnique.mockResolvedValue(verifiedUser);
    bcryptCompare.mockResolvedValue(true);

    await authorizeCredentials("a@b.com", "correct", IP);

    expect(vi.mocked(consumeRateLimit).mock.calls.map(([key]) => key)).toEqual([`login-ip:${IP}`, "login:a@b.com"]);
  });

  it("다른 발신지의 정상 로그인은 막지 않는다", async () => {
    userFindUnique.mockResolvedValue(verifiedUser);
    bcryptCompare.mockResolvedValue(false);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await authorizeCredentials(`user${attempt}@b.com`, "wrong", IP);
    }
    bcryptCompare.mockResolvedValue(true);

    expect(await authorizeCredentials("a@b.com", "correct", "198.51.100.9")).not.toBeNull();
  });
});

describe("syncOAuthUser", () => {
  it("returns onboarding state and preserves an existing completed profile", async () => {
    userFindUnique.mockResolvedValue({ id: "u9", onboardingCompletedAt: new Date(), name: "Chosen", avatar: "chosen.png", emailVerified: true });
    userUpsert.mockResolvedValue({ id: "u9", onboardingCompletedAt: new Date() });
    const result = await syncOAuthUser({ email: "g@b.com", name: "Google", image: "http://x/p.png" });
    expect(result).toMatchObject({ userId: "u9", created: false, needsOnboarding: false });
    expect(userUpsert).toHaveBeenCalledWith({
      where: { email: "g@b.com" },
      update: { emailVerified: true },
      create: { email: "g@b.com", name: "Google", avatar: "http://x/p.png", emailVerified: true },
      select: { id: true, onboardingCompletedAt: true },
    });
  });

  it("신규 유저 생성 시 passwordHash를 쓰지 않음", async () => {
    userFindUnique.mockResolvedValue(null);
    userUpsert.mockResolvedValue({ id: "u1", onboardingCompletedAt: null });
    await syncOAuthUser({ email: "a@b.com", name: "A", image: null });
    const arg = userUpsert.mock.calls[0][0];
    expect(arg.update).not.toHaveProperty("passwordHash");
    expect(arg.create).not.toHaveProperty("passwordHash");
  });

  it("인증 전 계정이 Google 로그인으로 승격되면 남아 있던 passwordHash를 폐기한다", async () => {
    // 누구든 남의 이메일로 가입 요청만 하면 비밀번호가 남을 수 있다 — 인증받지 못한 비밀번호는 신뢰하지 않는다.
    userFindUnique.mockResolvedValue({ id: "u3", onboardingCompletedAt: null, name: "victim", avatar: null, emailVerified: false });
    userUpsert.mockResolvedValue({ id: "u3", onboardingCompletedAt: null });
    await syncOAuthUser({ email: "victim@b.com", name: "Victim", image: null });
    expect(userUpsert.mock.calls[0][0].update).toEqual({ emailVerified: true, passwordHash: null });
  });

  it("이미 인증된 계정의 passwordHash는 보존한다", async () => {
    userFindUnique.mockResolvedValue({ id: "u4", onboardingCompletedAt: null, name: "Real", avatar: null, emailVerified: true });
    userUpsert.mockResolvedValue({ id: "u4", onboardingCompletedAt: null });
    await syncOAuthUser({ email: "real@b.com", name: "Real", image: null });
    expect(userUpsert.mock.calls[0][0].update).toEqual({ emailVerified: true });
  });

  it("이름 미제공 시 이메일을 이름으로 사용(create)", async () => {
    userFindUnique.mockResolvedValue(null);
    userUpsert.mockResolvedValue({ id: "u2", onboardingCompletedAt: null });
    await syncOAuthUser({ email: "n@b.com" });
    const arg = userUpsert.mock.calls[0][0];
    expect(arg.create.name).toBe("n@b.com");
  });
});
