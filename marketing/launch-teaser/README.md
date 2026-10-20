# potata 런칭 티저 — After Effects 자동 빌드

"밤티 말고 Potata" 음원(40.88초)에 맞춘 9:16 모션그래픽 티저를 After Effects 2026 에서 스크립트 한 번으로 생성·렌더한다.
기획 근거: [docs/work-plans/launch-teaser-reel.md](../../docs/work-plans/launch-teaser-reel.md) · 장면 명세: [SPEC.md](SPEC.md)

## 구성

| 경로 | 역할 |
|------|------|
| `src/00-core.jsx` | 상수(캔버스·색·타이밍표·비트)·헬퍼 API·프로젝트 셋업·렌더. **SSoT** |
| `src/10-*.jsx` ~ `src/25-*.jsx` | 장면 16개. 각 파일은 `scene(id, from, to, fn)` 하나만 등록 |
| `src/99-run.jsx` | 진입점(`runAll()`) |
| `build.py` | 조립기. 비 ASCII → `\uXXXX` 이스케이프, `RUN_ID` 주입, acorn ES3 문법 검사 |
| `build-teaser.jsx` | 조립 결과(실행용). 손으로 고치지 말고 `src/` 를 고친 뒤 다시 빌드 |
| `qa_frames.py` | 렌더 mp4 에서 장면별 검수 프레임·contact sheet 추출 |

## 실행

```bash
# 1) 조립 (RUN_ID 는 산출물 파일명에 붙는다)
python marketing/launch-teaser/build.py r01 --final

# 2) After Effects 로 실행 (GUI 가 열리고 스크립트가 comp 생성 → 저장 → 렌더)
"C:/Program Files/Adobe/Adobe After Effects 2026/Support Files/AfterFX.exe" -r "C:/Users/jangk/Projects/Coding/potata/marketing/launch-teaser/build-teaser.jsx"

# 3) 검수 프레임
python marketing/launch-teaser/qa_frames.py "C:/Users/jangk/Downloads/potata-teaser/potata-teaser-r01.mp4" "C:/Users/jangk/Downloads/potata-teaser/qa-r01"
```

산출물: `C:\Users\jangk\Downloads\potata-teaser\potata-teaser.aep`, `potata-teaser-<RUN_ID>.mp4`, `build-log-<RUN_ID>.txt`
(H.264 출력 템플릿이 없으면 `frames-<RUN_ID>/` PNG 시퀀스로 떨어진다 → ffmpeg 로 인코딩)

## 수정 포인트

- 시각: `src/00-core.jsx` 의 `T` 표(가사 단어 타임스탬프). 음원이 바뀌면 여기만 고친다.
- 카피/좌표/모션: 해당 장면 파일. 모션은 헬퍼 5종(`impactIn` · `slideIn/Out` · `staggerIn/typeOn` · `rgbSplit/flash/shake` · `popIn/pulse`)만 조합한다.
- 색/폰트: `COL`, `FONT`(Outfit ExtraBold · Noto Sans KR Black, 없으면 Impact/Malgun Gothic 폴백).
- 비트 반응: `BEATS` 배열 → CTRL 널의 `Beat` 슬라이더 expression. `beatScale()` / `beatOpacity()` 로 레이어에 연결.
- 사진: `photos/*.jpg`(AI 생성 모델 사진 10장, `PHOTO_NAMES`). `card({photo, focusY})` 가 이미지 영역을 cover 로 채우고 둥근 마스크로 자른다. 파일이 없으면 회색 카드로 그리고 로그에 `missing footage` 가 남는다. 사진을 바꾸려면 같은 이름으로 덮어쓰고 재빌드한다.
- 한·영 이중 표기: 한국어 문구 아래 `gloss(str, o)` 로 작은 영어를 붙인다(`still: true` = 스티커 안 정적 표기). 표기 문구는 `docs/work-plans/launch-teaser-bilingual.md` 표가 기준이다.

## 제약

- ExtendScript 는 ES3 다. `let/const/arrow/trailing comma/forEach/map/JSON` 금지 — `build.py` 가 acorn 으로 막는다. `static`·`class` 같은 ES3 예약어는 객체 속성 이름으로도 못 쓴다(acorn `allowReserved: "never"` 로 검사).
- aerender 는 comp 를 만들지 못하므로 빌드는 반드시 AE 본체에서 실행한다. 렌더만 다시 할 때는 저장된 `.aep` 를 aerender 로 돌려도 된다.

## AE 실행 시 확인된 함정 (2026-10-14 실측)

- **`AfterFX.exe -r` 는 믿지 않는다.** AE 가 꺼진 상태에서 `-r` 로 띄우면 홈 화면만 열리고 스크립트가 실행되지 않은 채 종료됐고, 이미 실행 중인 AE 에 `-r` 를 보내도 실행되지 않았다. 확실한 방법은 AE 안에서 **File › Scripts › Run Script File…** 로 `build-teaser.jsx` 를 여는 것이다.
- **전역 변수가 스크립트 실행 사이에 남는다.** 같은 AE 세션에서 스크립트를 다시 돌리면 이전 실행의 전역(`RENDER_SPAN` 등)이 그대로 보인다. 그래서 `build.py` 가 맨 앞에서 `RUN_ID`·`RENDER_SPAN` 을 매번 명시적으로 넣는다.
- **`layer.inPoint` 를 바꾸면 길이를 유지한 채 `outPoint` 가 밀린다.** out → in 순서로 설정하면 레이어가 예상보다 길어진다(글리치 복제본이 0.72s 살아남은 사고). `setRange()` 는 in → out 순서로만 설정한다.
- **Range Selector 의 Ramp Up 은 End 뒤 글자를 전부 선택한다.** 글자 등장은 Ramp Up + Offset 창 쓸기, 퇴장은 Ramp Down 으로 구현해야 한다(`staggerIn/Out`).
- `layer.property("ADBE Rotate X")` 는 null 이다. 3D 회전은 `rotX(L)`/`xform(L, …)`(Transform 그룹 경유)을 쓴다.
- Range Selector 의 Shape matchName 은 `ADBE Text Range Shape` 다(`ADBE Text Selector Shape` 아님).
- 스크립트 파일 쓰기 환경설정(`Pref_SCRIPTING_FILE_NETWORK_SECURITY`)이 꺼져 있으면 로그가 안 남는다. 스크립트가 켜려고 시도하지만, 안 되면 Preferences › Scripting & Expressions 에서 직접 켠다.
- `smoke/smoke-scene.jsx` 는 모든 헬퍼를 한 번씩 호출하는 3초 스모크 테스트, `smoke/probe-layers.jsx` 는 현재 프로젝트 레이어 in/out 덤프다. 헬퍼를 고치면 스모크부터 돌린다:
  `python marketing/launch-teaser/build.py smoke --only 99-run.jsx --extra marketing/launch-teaser/smoke/smoke-scene.jsx`
