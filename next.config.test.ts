import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("nextConfig", () => {
  it("allows the loopback address used by the local browser during development", () => {
    expect(nextConfig.allowedDevOrigins).toContain("127.0.0.1");
  });
});
