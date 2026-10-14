"""렌더된 티저 mp4 에서 장면별 검수 프레임을 뽑고 3×3 contact sheet 를 만든다.

사용: python qa_frames.py <input.mp4> <out_dir>
- 각 키 이벤트 +0.12s 지점(모션이 착지한 뒤)의 프레임을 PNG 로 저장
- 9장씩 1080×1920 contact sheet(sheet-NN.png) 생성 → 육안/에이전트 검수용
"""
import subprocess
import sys
from pathlib import Path

# (라벨, 시각) — 00-core.jsx 의 T 와 같은 값 + 0.12s
EVENTS = [
    ("S01 seoul", 0.00), ("S01 loading", 0.90), ("S02 U", 2.20), ("S02 A", 2.72), ("S02 E", 3.14), ("S02 loading2", 3.90),
    ("S03 po", 4.74), ("S03 ta2", 5.16), ("S03 letsgo", 5.80), ("S03 gap", 6.60),
    ("S04 kfashion", 7.00), ("S04 toofar", 8.28), ("S04 strike", 8.66), ("S04 notanymore", 9.00),
    ("S05 scroll", 10.30), ("S05 mid", 11.80), ("S05 late", 12.90),
    ("S06 discover", 13.44), ("S06 tuk", 13.96), ("S07 tryon", 14.44), ("S07 scan", 14.90), ("S07 tok", 15.18),
    ("S08 style", 15.42), ("S08 zzan", 16.00), ("S09 share", 16.26), ("S09 pop1", 17.40), ("S09 pop2", 17.80), ("S09 follow", 18.10),
    ("S10 bamti", 18.46), ("S10 logo", 19.20), ("S10 glow", 19.50), ("S10 resp1", 20.60), ("S10 hook2 lime", 22.58), ("S10 resp2", 23.80),
    ("S11 seoul", 24.72), ("S11 dubai", 25.44), ("S11 today", 25.88), ("S11 potata", 26.58),
    ("S12 A", 28.00), ("S12 B", 29.12), ("S12 C", 29.46), ("S12 D", 30.30),
    ("S13 yeah", 31.46), ("S14 follow", 32.34), ("S14 build", 33.14),
    ("S15 po", 33.88), ("S15 ta1", 34.53), ("S15 ta2", 35.60), ("S15 bbam1", 37.31), ("S15 bbam2", 37.94),
    ("S16 end", 39.66), ("S16 hold", 40.50),
]
OFFSET = 0.12
SHEET_COLS, SHEET_ROWS, CELL_W, CELL_H = 3, 3, 360, 640


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"ffmpeg 실패: {' '.join(cmd)}\n{r.stderr[-800:]}")


def main():
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    frames = []
    for i, (label, t) in enumerate(EVENTS):
        tt = round(t + OFFSET, 3)
        fp = out / f"{i:02d}_{tt:06.2f}_{label.replace(' ', '-')}.png"
        run(["ffmpeg", "-v", "error", "-y", "-ss", str(tt), "-i", str(src), "-frames:v", "1", "-vf", f"scale={CELL_W}:{CELL_H}", str(fp)])
        frames.append(fp)
    per = SHEET_COLS * SHEET_ROWS
    for s in range(0, len(frames), per):
        chunk = frames[s:s + per]
        inputs = []
        for fp in chunk:
            inputs += ["-i", str(fp)]
        # 부족한 칸은 검정으로 채움
        n = len(chunk)
        # Windows 의 ffmpeg 는 fontconfig 가 없어 fontfile 을 명시해야 drawtext 가 동작한다
        filt = "".join(f"[{k}:v]drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='{frames[s + k].stem.split('_', 1)[1]}':fontcolor=white:fontsize=18:x=8:y=8:box=1:boxcolor=black@0.5[v{k}];" for k in range(n))
        filt += "".join(f"[v{k}]" for k in range(n)) + f"xstack=inputs={n}:layout=" + "|".join(
            f"{(k % SHEET_COLS) * CELL_W}_{(k // SHEET_COLS) * CELL_H}" for k in range(n)) + ":fill=black[out]"
        sheet = out / f"sheet-{s // per:02d}.png"
        run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", filt, "-map", "[out]", str(sheet)])
        print("sheet", sheet.name, "←", ", ".join(fp.stem.split('_', 1)[1] for fp in chunk))
    print(f"frames {len(frames)} → {out}")


if __name__ == "__main__":
    main()
