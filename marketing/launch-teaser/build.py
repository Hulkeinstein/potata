"""potata 런칭 티저 — AE 스크립트 조립기.

src/*.jsx 를 이름순으로 이어 붙여 하나의 ExtendScript 로 만든다.
- 비 ASCII 문자는 전부 \\uXXXX 로 이스케이프한다 (ExtendScript 가 파일 인코딩을 CP949 로 오해하는 사고 방지).
- RUN_ID 를 맨 앞에 주입한다 (렌더 산출물 이름 충돌 방지).
- node + acorn 이 있으면 ES3 문법 검사를 돌린다 (ExtendScript 는 ES3).

사용:
  python build.py <RUN_ID>                      # 전체 조립 → .build/<RUN_ID>.jsx
  python build.py <RUN_ID> --final              # 전체 조립 → build-teaser.jsx (실행용)
  python build.py <RUN_ID> --only 14-s05-x.jsx  # core + 지정 장면 + 99-run 만 조립해 문법 검사 (작성자용, 충돌 없음)
"""
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "src"
REPO = HERE.parent.parent
ALWAYS = ("00-core.jsx", "99-run.jsx")


def escape_non_ascii(text: str) -> str:
    return re.sub(r"[^\x00-\x7f]", lambda m: f"\\u{ord(m.group(0)):04x}", text)


def es3_check(path: Path) -> int:
    # allowReserved never: ExtendScript 는 static 같은 ES3 예약어를 속성 이름으로도 거부한다(r05 실행 오류)
    check = (
        "const a=require('acorn');const fs=require('fs');"
        "const s=fs.readFileSync(process.argv[1],'utf8');"
        "try{a.parse(s,{ecmaVersion:3,allowReserved:'never'});console.log('ES3 parse OK');}"
        "catch(e){console.error('ES3 parse FAIL: '+e.message);process.exit(1);}"
    )
    try:
        r = subprocess.run(["node", "-e", check, str(path)], cwd=str(REPO), capture_output=True, text=True)
        print((r.stdout + r.stderr).strip())
        return r.returncode
    except FileNotFoundError:
        print("node 없음 — ES3 검사 생략")
        return 0


def main() -> int:
    argv = sys.argv[1:]
    run_id = argv[0] if argv and not argv[0].startswith("--") else "dev"
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,24}", run_id):
        print("RUN_ID 는 영숫자/-/_ 24자 이내", file=sys.stderr)
        return 2
    final = "--final" in argv
    only = argv[argv.index("--only") + 1] if "--only" in argv else None
    extra = Path(argv[argv.index("--extra") + 1]) if "--extra" in argv else None  # src 밖 파일(스모크 테스트 등)을 99-run 앞에 끼움

    files = sorted(SRC.glob("*.jsx"))
    if only:
        files = [fp for fp in files if fp.name in ALWAYS or fp.name == only]
        if not any(fp.name == only for fp in files):
            print(f"--only 대상 없음: {only}", file=sys.stderr)
            return 2
    if extra:
        if not extra.exists():
            print(f"--extra 파일 없음: {extra}", file=sys.stderr)
            return 2
        files = [fp for fp in files if fp.name != "99-run.jsx"] + [extra] + [fp for fp in files if fp.name == "99-run.jsx"]
    if not files:
        print("src/*.jsx 없음", file=sys.stderr)
        return 2

    # AE 는 스크립트 실행 사이에 전역 변수를 유지하므로(이전 실행의 RENDER_SPAN 이 남아 3초만 렌더된 사고),
    # 조립 결과 맨 앞에서 매번 명시적으로 초기화한다. --span 0,3 으로 부분 렌더를 지정할 수 있다.
    span = argv[argv.index("--span") + 1] if "--span" in argv else None
    span_js = "[" + span + "]" if span else "null"
    parts = [f'var RUN_ID = "{run_id}";\nvar RENDER_SPAN = {span_js};\n']
    for fp in files:
        body = fp.read_text(encoding="utf-8")
        parts.append(f"\n// ===== {fp.name} =====\n")
        parts.append(body if body.endswith("\n") else body + "\n")
    joined = escape_non_ascii("".join(parts))

    if final:
        out = HERE / "build-teaser.jsx"
    else:
        (HERE / ".build").mkdir(exist_ok=True)
        out = HERE / ".build" / f"{run_id}.jsx"
    out.write_text(joined, encoding="ascii", newline="\n")
    print(f"built {out.relative_to(HERE)}: {len(files)} files, {joined.count(chr(10))} lines, RUN_ID={run_id}")
    return es3_check(out)


if __name__ == "__main__":
    raise SystemExit(main())
