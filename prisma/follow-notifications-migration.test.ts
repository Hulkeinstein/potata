import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("FOLLOW notification migrations", () => {
  it("commits the FOLLOW enum before a later migration references it", async () => {
    const enumSql = await readFile("prisma/migrations/20260822130000_follow_notifications/migration.sql", "utf8");
    const invariantSql = await readFile("prisma/migrations/20260822130100_follow_notification_invariant/migration.sql", "utf8");

    expect(enumSql).toContain("ALTER TYPE \"NotificationType\" ADD VALUE 'FOLLOW'");
    expect(enumSql).not.toContain("Notification_type_source_check");
    expect(invariantSql).toContain("'FOLLOW'");
    expect(invariantSql).toContain("Notification_type_source_check");
  });
});
