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

import { authorizeCredentials, syncOAuthUser } from "./auth-providers";

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
});

describe("authorizeCredentials", () => {
  it("이메일/비밀번호 누락 시 null", async () => {
    expect(await authorizeCredentials(undefined, "pw")).toBeNull();
    expect(await authorizeCredentials("a@b.com", undefined)).toBeNull();
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("존재하지 않는 유저면 null", async () => {
    userFindUnique.mockResolvedValue(null);
    expect(await authorizeCredentials("a@b.com", "pw")).toBeNull();
  });

  it("미인증(emailVerified=false) 유저면 null", async () => {
    userFindUnique.mockResolvedValue({ ...verifiedUser, emailVerified: false });
    expect(await authorizeCredentials("a@b.com", "pw")).toBeNull();
    expect(bcryptCompare).not.toHaveBeenCalled();
  });

  it("OAuth 전용 유저(passwordHash=null)는 비밀번호 로그인 불가 → null", async () => {
    userFindUnique.mockResolvedValue({ ...verifiedUser, passwordHash: null });
    expect(await authorizeCredentials("a@b.com", "pw")).toBeNull();
    expect(bcryptCompare).not.toHaveBeenCalled(); // null 가드가 compare 호출 차단
  });

  it("비밀번호 불일치면 null", async () => {
    userFindUnique.mockResolvedValue(verifiedUser);
    bcryptCompare.mockResolvedValue(false);
    expect(await authorizeCredentials("a@b.com", "wrong")).toBeNull();
  });

  it("정상 자격증명이면 user 반환", async () => {
    userFindUnique.mockResolvedValue(verifiedUser);
    bcryptCompare.mockResolvedValue(true);
    expect(await authorizeCredentials("a@b.com", "pw")).toEqual({
      id: "u1",
      email: "a@b.com",
      name: "A",
      image: null,
    });
  });
});

describe("syncOAuthUser", () => {
  it("upsert로 멱등 동기화하고 DB user id 반환", async () => {
    userUpsert.mockResolvedValue({ id: "u9" });
    const id = await syncOAuthUser({ email: "g@b.com", name: "G", image: "http://x/p.png" });
    expect(id).toBe("u9");
    expect(userUpsert).toHaveBeenCalledWith({
      where: { email: "g@b.com" },
      update: { name: "G", avatar: "http://x/p.png", emailVerified: true },
      create: { email: "g@b.com", name: "G", avatar: "http://x/p.png", emailVerified: true },
    });
  });

  it("기존 유저의 passwordHash를 덮어쓰지 않음 (update 절에 passwordHash 부재)", async () => {
    userUpsert.mockResolvedValue({ id: "u1" });
    await syncOAuthUser({ email: "a@b.com", name: "A", image: null });
    const arg = userUpsert.mock.calls[0][0];
    expect(arg.update).not.toHaveProperty("passwordHash");
    expect(arg.create).not.toHaveProperty("passwordHash");
  });

  it("이름 미제공 시 이메일을 이름으로 사용(create)", async () => {
    userUpsert.mockResolvedValue({ id: "u2" });
    await syncOAuthUser({ email: "n@b.com" });
    const arg = userUpsert.mock.calls[0][0];
    expect(arg.create.name).toBe("n@b.com");
  });
});
