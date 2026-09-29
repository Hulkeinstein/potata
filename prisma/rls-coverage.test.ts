import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Supabase Data API는 public schema table을 공개 key로 노출한다.
// 앱은 Data API를 쓰지 않으므로 모든 table은 policy 없이 RLS만 켠 fail-closed 상태여야 한다.
const MIGRATIONS_DIR = "prisma/migrations";

async function readMigrationSql(): Promise<string> {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const files = await Promise.all(
    dirs.map((dir) => readFile(path.join(MIGRATIONS_DIR, dir, "migration.sql"), "utf8")),
  );
  // 주석에 적힌 문구만으로 검사가 통과하지 않도록 SQL comment를 제거한다.
  return files.join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
}

function tableNames(sql: string, pattern: RegExp): Set<string> {
  return new Set(Array.from(sql.matchAll(pattern), (match) => match[1]));
}

describe("public table RLS", () => {
  it("enables RLS on every table created by migrations", async () => {
    const sql = await readMigrationSql();
    const created = tableNames(sql, /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"/gi);
    const rlsEnabled = tableNames(
      sql,
      /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY;/gi,
    );

    expect(created.size).toBeGreaterThan(0);
    expect([...created].filter((table) => !rlsEnabled.has(table))).toEqual([]);
  });

  it("never disables RLS or opens it with a policy", async () => {
    const sql = await readMigrationSql();

    expect(sql).not.toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(sql).not.toMatch(/CREATE\s+POLICY/i);
  });
});
