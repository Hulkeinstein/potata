import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 관리자 화면이 정적 생성되면 재고·미답변 Q&A 같은 수치가 빌드 시점에 굳어, 재배포 전까지 옛 값을 보여준다.
 * auth()·searchParams를 쓰는 페이지는 Next가 알아서 동적으로 처리하지만, 그건 구현 세부에 기대는 것이다.
 * 새 관리자 페이지가 그 호출 없이 추가되면 조용히 정적으로 돌아가므로, 전 페이지에 명시를 강제한다.
 */
const ADMIN_DIR = join(__dirname);

function adminPageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return adminPageFiles(path);
    return entry === "page.tsx" ? [path] : [];
  });
}

describe("관리자 페이지 렌더링 방식", () => {
  const files = adminPageFiles(ADMIN_DIR);

  it("관리자 페이지가 하나 이상 있다", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((file) => [file.slice(file.indexOf("app")), file] as const))(
    "%s 는 force-dynamic을 선언한다",
    (_label, file) => {
      expect(readFileSync(file, "utf8")).toContain('export const dynamic = "force-dynamic";');
    },
  );
});
