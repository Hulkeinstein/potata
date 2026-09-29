import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("nextConfig", () => {
  it("allows the loopback address used by the local browser during development", () => {
    expect(nextConfig.allowedDevOrigins).toContain("127.0.0.1");
  });

  it("sends the security headers on every response", async () => {
    const rules = await nextConfig.headers!();
    const applied = rules.find((rule) => rule.source === "/(.*)");
    const keys = applied?.headers.map((header) => header.key) ?? [];

    expect(keys).toEqual(
      expect.arrayContaining([
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Strict-Transport-Security",
      ]),
    );
    expect(applied?.headers.find((header) => header.key === "X-Frame-Options")?.value).toBe("DENY");
  });
});
