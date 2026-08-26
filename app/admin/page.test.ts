import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("admin home Q&A metric", () => {
  it("links unanswered questions to the accessible inbox filter", async () => {
    // Given: the server-rendered admin home source
    const source = await readFile("app/admin/page.tsx", "utf8");

    // When: an operator selects the unanswered Q&A metric

    // Then: it uses a keyboard-accessible navigation link to the unanswered inbox
    expect(source).toContain('href: "/admin/questions?status=unanswered"');
    expect(source).toContain('? <Link');
    expect(source).toContain('"미답변 Q&A"');
  });
});
