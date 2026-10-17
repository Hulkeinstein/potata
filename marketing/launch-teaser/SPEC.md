# potata 런칭 티저 — 장면 명세 (scene authors용 SSoT)

> 참고 기획안("SEOUL, NOW LOADING IN UAE")을 "밤티 말고 Potata" 음원 40.88초 전체로 확장한 9:16 모션그래픽.
> 헬퍼 API 는 `src/00-core.jsx` 가 SSoT 다. 이 문서는 **무엇을 언제 보여줄지**만 정한다.

## 0. 절대 규칙

1. **ExtendScript = ES3.** `let/const/=>/class/template literal/trailing comma/forEach/map/filter/indexOf/JSON/Object.keys/trim/Array.isArray` 전부 금지. `var` + `for` 루프만. 객체 리터럴 마지막 쉼표 금지.
2. `00-core.jsx` 의 헬퍼만 써서 레이어를 만든다. 허용되는 raw AE API: 레이어의 `rotation`, `opacity`, `scale`, `position`, `anchorPoint`, 3D 회전은 `rotX(L)`/`rotY(L)`/`xform(L, "ADBE Rotate Z")` 헬퍼(`L.property("ADBE Rotate X")` 는 null 을 돌려주므로 **금지**), 텍스트 `property("ADBE Text Properties").property("ADBE Text Document").expression`, 이펙트 속성 키프레임(`glow()`가 돌려준 객체의 `property("ADBE Glo2-0004")` 등). `app.`, `alert()`, `File`, `$.`, `prompt` 는 **금지**.
3. 장면 파일은 `scene("Sxx", from, to, function (ctx) { ... })` 호출 **하나**만 포함한다. 전역 변수·전역 함수 선언 금지(필요한 보조 함수는 scene 콜백 안에 지역 함수로).
4. 모든 레이어는 `t0`/`t1` 을 반드시 지정해 **장면 구간 안**에만 존재하게 한다(허용 오차: 시작 -0.05s, 끝 +0.30s). 예외는 각 장면 설명에 명시된 것뿐.
5. 레이어 이름은 `"S05 feed card 1"` 처럼 **장면 ID 접두사**를 붙인다(`name` 옵션).
6. 색은 `COL.black / white / lime / purple / gray / gray2 / gray3` 만. 폰트는 `font:"en"|"enMid"|"ko"` 만(한글이 포함된 문자열은 자동으로 ko).
7. **모션 언어 5종만**: ① `impactIn`(115→100 착지) ② `slideIn/slideOut`(방향 슬라이드 — 다음 화면 이동 방향과 일치) ③ `staggerIn/typeOn`(글자·단어 순차) ④ `rgbSplit/flash/shake`(글리치 — hook 과 장면 전환에만, 한 장면에 3회 이하) ⑤ `popIn/pulse`(탄성 팝 — 아이콘·배지·스티커·응답 챈트에만). 큰 제목에 popIn 금지, 작은 아이콘에 impactIn 금지.
8. **한 순간에 주인공 하나만 크게 움직인다.** 보조 요소는 작게(슬라이드 거리 짧게, 페이드).
9. 안전 영역: 핵심 텍스트는 x 80~1000, y 220~1700 안에. Reels UI 가 상·하단을 가린다.
10. 텍스트 폭 어림: Outfit ExtraBold 대문자 1글자 ≈ `0.62 × size` px, Noto Sans KR 1글자 ≈ `0.95 × size` px. 한 줄 폭이 920px 을 넘지 않게 size 를 정한다(필요하면 `"\r"` 로 두 줄).
11. 레이어는 **뒤→앞 순서로 생성**한다(나중에 만든 레이어가 위에 쌓인다). 배경 → 보조 → 주인공 → 스티커/플래시 순.
12. 하드컷이 기본이다. 장면 끝에서 레이어를 굳이 페이드아웃하지 말고 `t1` 으로 끊는다(명시된 퇴장 모션만 수행).
13. 수치는 `T.xxx` 상수를 쓴다(직접 숫자 금지). 비트 보조 시각은 `BEATS` 배열 값을 써도 된다.

## 1. 캔버스·브랜드

- 1080×1920, 30fps, 40.88s. 배경은 전역 `BG`(검정 솔리드)가 있으므로 장면마다 검정 배경을 또 만들지 않는다.
- 로고는 텍스트 `POTATA`(Outfit ExtraBold, 대문자, tracking -40 내외). 태그라인 `K-FASHION, RECODED.` / `SEOUL TO DUBAI`.
- 사이트 메뉴: CATEGORY · SHOP · OOTD · FOR YOU · RANKING · BRANDS. 기능명: AI STUDIO(try-on), OOTD(What to Wear).
- `ctx.banner` = 사이트 배너 푸티지(1344×768, 모델 누운 패션 에디토리얼). null 일 수 있으니 반드시 분기.
- `ctx.cam` 은 카메라 널(기본 parent). `shake()` 는 CTRL 슬라이더로 이 널을 흔든다. 전체 화면 솔리드(`solid()/flash()`)는 parent 없음.

## 2. 타이밍표 (00-core.jsx `T`)

| 키 | 초 | 가사/이벤트 |
|---|---|---|
| seoul 0.00 · loading1 0.62 | | "Seoul! (Now loading)" |
| uaeU 2.20 · uaeA 2.72 · uaeE 3.14 · loading2 3.62 · loadingDone 4.28 | | "UAE! (Now loading)" |
| po1 4.74 · ta1 4.95 · ta2 5.16 · letsGo 5.80 · introEnd 6.44 | | "Po-ta-ta! (Let's go!)" |
| kfashion 7.00 · tooFar 8.28 · strike 8.66 · notAnymore 9.00 | | "K-fashion? Too far? Not anymore" |
| scroll 10.30 · scrollW2 10.78 · scrollW3 11.78 · scrollW4 12.24 · scrollEnd 13.44 | | "스크롤 / 한 번이면 / 서울이 / 문 앞에" |
| discover 13.44 · tuk 13.96 | | "Discover, 툭!" |
| tryItOn 14.44 · tok 15.18 | | "Try it on, 톡!" |
| styleIt 15.42 · zzan 16.00 | | "Style it, 짠!" |
| shareIt 16.26 · pop1 17.40 · pop2 17.80 · verseEnd 18.46 | | "Share it, pop! pop!" |
| hook1 18.46 · hook1b 18.82 · hook1Potata 19.20 · resp1a/b/c 20.60/20.81/21.02 | | "밤티 말고 Potata! (Po-ta-ta!)" |
| hook2 21.38 · hook2b 22.26 · hook2Potata 22.58 · resp2a/b/c 23.80/24.05/24.45 | | 2회차 |
| seoulTo 24.72 · dubai 25.44 · today 25.88 · todayPotata 26.58 | | "Seoul to Dubai, 오늘은 Potata" |
| hook3 28.00 · hook3b 29.12 · hook3Potata 29.46 · yeah 31.46 · yeahEnd 32.34 | | "밤티 말고 Potata! (Yeah!)" |
| follow 32.34 · the 32.74 · build 33.14 · buildEnd 33.58 | | "Follow the build…" (속삭임) |
| oPo 33.88 · oTa1 34.53 · oTa2 35.60 · bbam1 37.31 · bbam2 37.94 · finalHit 39.66 · end 40.88 | | "Po-ta-ta! (빠밤!)" → 엔드카드 |

BPM 143.55 (`BEAT`=0.418s, `BAR`=1.672s). 비트 시각은 `BEATS`.

## 3. 장면 명세

표기: **주인공** = 그 순간 크게 움직이는 단 하나.

### S01 `intro-seoul` 0.00–2.20 (파일 `10-s01-intro-seoul.jsx`)
- 0.00 **"SEOUL"** white en size 300 vscale 110 tracking -40, pos (540, 900). `impactIn` + `rgbSplit(2f, 18)` + `shake(0.6)`.
- 0.62 "NOW LOADING" lime en size 40 tracking 500 at (540, 1120), `typeOn 0.3`. 로딩바: 트랙 `rect` 640×8 gray2 anchor left at (220, 1200); 채움 `rect` 640×8 lime anchor left 같은 위치, `scale` X 0→50 (0.62→2.20, "out"). 우측에 퍼센트 `counter` lime size 32 at (900, 1200) — **단, 이 로딩 UI(라벨·트랙·채움·퍼센트)는 예외적으로 t1 = 4.42(4.30 slideOut 완결)까지 산다.** 3.62→4.28 에 채움 50→100, 퍼센트도 50→100 (expression 을 직접 두 구간으로: `time <= 2.2 ? linear(time, 0.62, 2.2, 0, 50) : linear(time, 3.62, 4.28, 50, 100)` 후 `Math.round(...) + "%"`). 4.28 에 채움바 lime→white 번쩍(opacity 100→40→100 2프레임) 뒤 4.30 부터 전체 로딩 UI `slideOut("down", dist 300, dur 0.12)`.
- 1.30, 1.74 비트에 "SEOUL" 심장박동: opacity 100→40→100 (각 2프레임, hold 아님 linear).
- 2.20 "SEOUL" `slideOut("up", dist 600, dur 0.18)`.

### S02 `intro-uae` 2.20–4.28 (`11-s02-intro-uae.jsx`)
- 글자 **"U" "A" "E"** 각각 별도 레이어, white en size 420, pos (300,900) (540,900) (780,900). 각각 uaeU/uaeA/uaeE 에 `impactIn(from 130)` + `rgbSplit(2f, 20)` + `shake(0.8)`. 순서대로 주인공.
- 3.14 직후 "UAE" 아래 lime 밑줄 `rect` 560×14 anchor left at (260, 1072), scale X 0→100 (3.14→3.40 "out"). (원안 1110 은 S01 "NOW LOADING" 라벨을 관통해 올림.)
- 3.62 (Now loading 2): 세 글자와 밑줄을 하나의 `group` 으로 묶지 말고 각각 `scaleTo(100→72)` + `moveTo` 로 y 760 으로 올린다(0.25s inout). 이때 S01 의 로딩바가 100% 로 찬다(S01 담당).
- 4.28: 세 글자·밑줄 `slideOut("up", dist 700, dur 0.16)`.

### S03 `intro-potata` 4.28–7.00 (`12-s03-intro-potata.jsx`)
- 4.28–4.74 검정(숨 고르기). 중앙에 purple 점 `ellipse` 24px, `beatOpacity(20, 100)`, t 4.30–4.74.
- 4.74 **"PO"** lime en size 360 at (540, 760) `impactIn(from 125)` + `rgbSplit` + `shake(1.0)`.
- 4.95 **"TA"** white size 360 at (540, 1010) `impactIn(from 125)`.
- 5.16 **"TA"** purple size 360 at (540, 1260) `impactIn(from 125)` + `shake(1.0)`.
- 5.596 비트에 세 단어 `pulse(1.06)`.
- 5.80 **"LET'S GO!"**: lime `solid` t 5.80–6.44 (하드컷 인/아웃). 세 단어는 t1 5.80 로 끊는다. black en size 185 vscale 115 "LET'S GO!" at (540, 960) `impactIn(from 120)` + `rgbSplit(3f, 22)` + `shake(1.3)`. 6.455 비트에 `rgbSplit(2f)` 한 번 더.
- 6.44–7.00 검정. purple 점 다시(`beatOpacity`), t 6.46–7.00.

### S04 `hook-text` 7.00–10.30 (`13-s04-hook-text.jsx`)
- 7.00 **"K-FASHION?"** white en size 148 vscale 115 tracking -30 at (540, 940). `impactIn` + `rgbSplit(3f, 20)` + `shake(1.0)`. 8.28 에 `slideOut("up", dist 500, dur 0.15)`.
- 8.28 **"TOO FAR."** white size 185 at (540, 940) `impactIn`. 8.66 `strike(purple, thick 22, dur 0.14)` + `shake(0.5)`. 9.00 하드컷(t1 9.00).
- 9.00 **"NOT ANYMORE."**: lime `solid` t 9.00–10.30. black en "NOT\rANYMORE." size 165 leading 157 at (540, 940) `impactIn(from 120)` + `rgbSplit(2f)` + `shake(1.2)`. 9.451, 9.892 비트에 `pulse(1.05)`. 10.10 에 `rgbSplit(2f, 16)`.
- (2026-10-14 확정) 원안 190/230/210 은 실측 폭이 1,100px 를 넘어 캔버스를 벗어나므로 위 수치로 내렸다.
- 10.30 하드컷.

### S05 `scroll` 10.30–13.44 (`14-s05-scroll.jsx`) — "스크롤 한 번이면 서울이 문 앞에"
- 뒤: 고스트 텍스트 "SCROLL" white **아웃라인**(fillNone, stroke white 3) size 320 at (540, 1500) opacity 30, 10.30→13.44 에 y 1500→700 linear(느린 패럴랙스).
- 피드: `group("S05 feed", [540, 1180])` 아래에 `card()` 4장(w 460 h 600, 세로 간격 40, 중심 x 540, y 1180/1820/2460/3100; price "AED 149"/"AED 89"/"AED 210"/"AED 120"; badge "NEW"/"HOT"/"BEST"/없음). 깊이감: 2·4번 카드 scale 92, x +40. **주인공 = 피드 스크롤**: 널을 10.30→13.30 에 y 1180→-620 으로 `moveTo("inout")`(한 번의 긴 스크롤). 12.864 에 `shake(0.5)`.
- 가사 밑 캡션 띠: black `rect` 1080×330 at (540, 1545) opacity 80 (피드 위, 가사 아래) — 카드 스켈레톤 줄이 가사를 관통하지 않게.
- 가사: 한 줄씩 왼쪽 정렬 `text(anchor:"left", justify:"left")`, ko size 92, 1행 y 1480 "스크롤"(10.30) "한 번이면"(10.78), 2행 y 1600 "서울이"(11.78, **lime**) "문 앞에"(12.24). 각 단어 `slideIn("down", dist 60, dur 0.2)`. 다음 단어 x = `bbox(이전, t).left + bbox(이전, t).width + 28`. 가사 레이어는 피드·띠보다 위(나중에 생성).
- 13.44: 피드 널 `slideOut("up", dist 2200, dur 0.16)`(아래쪽 카드까지 완전히 퇴장), 가사·고스트·띠는 t1 13.44.

### S06 `discover` 13.44–14.44 (`15-s06-discover.jsx`) — "Discover, 툭!"
- 뒤: "DISCOVER" 아웃라인(fillNone, stroke white 4) size 260 **opacity 35** at y 760, x -300→1380 linear(13.44→14.44). 퇴장 slideOut 은 `noFade:true`(페이드 키가 35 를 덮지 않게).
- 13.44 **"DISCOVER"** white en size 150 at (540, 980) `impactIn` + `rgbSplit(2f)`.
- 13.50 메뉴 pill 행 y 1200: `pill()` CATEGORY·SHOP·OOTD·FOR YOU·RANKING·BRANDS, size 30 h 68, stroke white 2 (noFill), **SHOP 만 color lime + textColor black**. 가로 폭 합이 1080 을 넘으므로 x 는 60 부터 시작해 간격 16 으로 이어 붙이고(마지막은 화면 밖), 각 pill 널을 `slideIn("right", dist 500, dur 0.3)` 2프레임씩 지연.
- 13.96 "툭!" 스티커: `group` 아래 purple `rect` 180×120 r 24 + white ko "툭!" size 84, rotation -12, at (840, 815), `popIn` + `shake(0.4)`.
- 14.44: 전부 `slideOut("left", dist 800, dur 0.12)` (휩 전환).

### S07 `tryon` 14.44–15.42 (`16-s07-tryon.jsx`) — "Try it on, 톡!"
- 14.44 카드 `rect` 640×1000 r 40 gray at (540, 1000) `slideIn("right", dist 800, dur 0.14)`; 안에 실루엣: `ellipse` 130 gray2 at (540, 700), `rect` 300×430 r 70 gray2 at (540, 1010). 상단 라벨 "AI STUDIO" lime en size 30 tracking 400 at (540, 560).
- 14.46 **"TRY IT ON"** white en size 150 at (540, 380) `impactIn` + `rgbSplit(2f)`.
- `scanline(14.50, 15.20, {x:540, w:600, yFrom:520, yTo:1480})`.
- 상태어 오른쪽 세로 배치 (x 930, anchor "right", justify "right"), enMid size 34 tracking 300, lime: "UPLOAD" 14.50 / "MATCH" 14.75 / "TRY" 15.00, y 1560/1610/1660, 각 `typeOn 0.1`.
- 15.18 "톡!" 스티커(lime 배경 + black ko "톡!" size 84, rotation 10) at (250, 640) `popIn`.
- 15.42: 전부 `slideOut("left", dist 800, dur 0.12)`.

### S08 `style` 15.42–16.26 (`17-s08-style.jsx`) — "Style it, 짠!"
- 매스너리 `card()` 4장(badge 없음, price 없음): (280,600) 360×480 / (800,540) 360×420 / (280,1320) 360×440 / (800,1240) 360×520 (제목 "STYLE IT" 위아래 여백 확보). 왼쪽 카드는 `slideIn("left")`, 오른쪽은 `slideIn("right")` (dist 600, dur 0.22), 15.42 부터 2프레임씩 지연. 깊이: 1·4번 scale 104, 2·3번 92.
- 15.46 **"STYLE IT"** white en size 170 at (540, 960) `impactIn` + `rgbSplit(2f)`.
- 16.00 "짠!" 스티커(purple 배경 + white ko "짠!" size 84, rotation -8) at (540, 1420) `popIn` + `shake(0.4)`.
- 16.26: 왼쪽 카드 `slideOut("left")`, 오른쪽 `slideOut("right")` (dist 700, dur 0.12); 텍스트·스티커 t1 16.26.

### S09 `share` 16.26–18.46 (`18-s09-share.jsx`) — "Share it, pop! pop!"
- 16.26 **"SHARE IT"** white en size 170 at (540, 700) `impactIn` + `rgbSplit(2f)`.
- 16.30 OOTD 포스트 `card()` 560×720 at (540, 1180) badge "OOTD" `slideIn("down", dist 300, dur 0.3)`.
- 17.40 (pop1) **하트** `icon("heart", lime, size 150)` at (330, 1620) `popIn` + 옆에 "1.2K" white enMid size 40 at (470, 1620) `fadeIn` + `shake(0.5)`.
- 17.80 (pop2) **말풍선** `icon("bubble", purple, 110)` at (600, 1620) `popIn` + "248" white size 40 at (725, 1620).
- 18.10 "+ FOLLOW" `pill`(color lime, textColor black, size 26) at (880, 1620) `popIn`.
- 18.46 하드컷.

### S10 `logo-reveal` 18.46–24.72 (`19-s10-logo-reveal.jsx`) — 후렴 1·2 + 응답 챈트
- 뒤: purple `ellipse` 1500 at (540, 1000) opacity 기본 0, 19.20 부터 `beatOpacity(5, 24)` (레이어 t0 19.20; r02 검수에서 8~40 은 로고보다 튀어 낮춤). 그 위에 검정은 없음(전역 BG).
- 18.46 **"밤티"** white ko size 150 at (380, 760) `impactIn` + `rgbSplit(2f)`; 18.60 `strike(purple, thick 18)` on 밤티. 18.82 **"말고"** white ko size 150 at (700, 760) `impactIn`.
- 19.20 **로고 결합**: "P","O","T","A","T","A" 6개 레이어 white en size 220(원안 260 은 실측 폭 1,034px 로 안전 영역 초과 → 220 확정) tracking 0. 배치: 각 레이어를 임시로 (540, 1010) 에 만든 뒤 `bbox()` 폭을 재서 전체 폭을 구하고 글자 간격 8px 로 가운데 정렬해 `setv(L.position, [x, 1010])`. 등장: P `slideIn("left", 500)`, O `impactIn(from 190)`, T `slideIn("down", 400)`, A `slideIn("up", 400)`, T `slideIn("down", 400)`, A `slideIn("up", 400)` — 19.20 부터 2프레임씩 지연, dur 0.22. 19.50 에 `flash(purple, peak 55, dur 0.12)` + `shake(1.4)`; 각 글자에 `glow(purple 느낌은 색 못 바꾸므로 기본 glow, radius 70, intensity 0.9)`.
- 19.75 "K-FASHION, RECODED." lime en size 34 tracking 500 at (540, 1200) `typeOn 0.4` (19.50 shake 가 가라앉은 뒤).
- 응답 1 (resp1a/b/c): "PO"→P,O / "TA"→T,A / "TA"→T,A 쌍으로 `pulse(1.12)`. 각 쌍 위에 **lime 복제 글자**(같은 위치·크기, color lime, **glow 없음** — glow 를 얹으면 흰색으로 표백됨)를 만들어 opacity hold 키로 해당 시각부터 4프레임만 100(그 외 0). 글자 간격은 -6px(다른 장면 로고 tracking -40 과 맞춤).
- 21.38 hook2: "밤티","말고" `pulse(1.08)` + "밤티" `rgbSplit(2f)`; 22.26 "말고" `pulse(1.08)`; 22.58 로고 전체가 lime 으로(lime 복제 6글자 opacity 100 hold, 22.58→23.00, 이후 0).
- 응답 2 (resp2a/b/c): 위와 같은 쌍 `pulse(1.12)`, 이번엔 **purple 복제** 4프레임.
- 24.72 하드컷.

### S11 `seoul-dubai` 24.72–28.00 (`20-s11-seoul-dubai.jsx`)
- 배경: `ctx.banner` 가 있으면 `image(ctx.banner, {scale 250, pos [640, 1080]})` + `tint(COL.black, COL.purple, 100)` + opacity 55, 24.72→28.00 에 x 640→440 linear, scale 250→262 (y 1080: 모델 얼굴이 상단에서 잘리지 않게). 없으면 purple `rect` W×H opacity 25.
- 24.72 **"SEOUL"** white en size 150 at (320, 700) `impactIn`. `arrow(24.90, 25.40, {x0 150, x1 930, y 860, lime, thick 12, head 80})`. 25.44 **"DUBAI"** lime en size 150 at (760, 1020) `impactIn` + `rgbSplit(2f)` + `shake(0.8)`.
- 25.88 **"오늘은"** white ko size 150 at (540, 1300) `impactIn`.
- 26.58 **"POTATA"** lime en size 220 tracking -40 at (540, 1500) `impactIn(from 125)` + `glow(radius 80, intensity 0.5, threshold 70)`(1.0 이면 lime 이 흰색으로 표백) + `shake(1.0)`; 27.028/27.469/27.887 비트에 `pulse(1.05)`.
- 28.00 하드컷.

### S12 `hook3` 28.00–31.46 (`21-s12-hook3.jsx`) — 최고 에너지 구간, 구간별 색 반전
- A 28.00–29.12: lime `solid`; **"밤티"** black ko size 220 at (540, 760) `impactIn` + `rgbSplit(2f)`; 28.328/28.746 비트 `pulse(1.06)`; 28.70 `strike(purple, thick 24)`.
- B 29.12–29.46: (검정) **"말고"** white ko size 220 at (540, 1160) `impactIn` + `rgbSplit(2f)`. (A 위 / B 아래 / C 중앙으로 후반부 배치 리듬을 준다.)
- C 29.46–30.30: purple `solid`; **"POTATA"** white en size 230 tracking -40 `impactIn(from 130)` + `rgbSplit(3f, 22)` + `shake(1.4)`; 30.023 `pulse(1.06)`.
- D 30.30–31.46: (검정) **"POTATA"** lime size 230 `impactIn` + `beatScale(8)`; 위 y 760 에 "밤티 말고" white ko size 64 `typeOn 0.2`; 아래 y 1160 "SEOUL TO DUBAI" lime enMid size 30 tracking 600 `fadeIn`.
- 31.46 하드컷.

### S13 `yeah` 31.46–32.34 (`22-s13-yeah.jsx`)
- 31.46 **"YEAH!"** purple en size 300 vscale 120 rotation -6 at (540, 960) `impactIn(from 140)` + `rgbSplit(3f, 24)` + `shake(1.5)` + `flash(white, peak 40, dur 0.08)`. 32.183 비트 `pulse(1.05)`. 32.34 하드컷.

### S14 `follow` 32.34–33.58 (`23-s14-follow.jsx`) — 속삭임, 가장 조용한 화면
- "FOLLOW" 32.34 / "THE" 32.74 / "BUILD" 33.14: white enMid size 64 tracking 400, 한 줄 y 960 에 단어 간 120px 띄워 가운데 정렬(폭이 안전 영역을 넘으면 같은 비율로 축소)(세 단어 폭을 `bbox` 로 재서 전체 가운데에 배치). 각 `typeOn 0.18`.
- "…" lime size 64 at BUILD 오른쪽: 점 세 개를 각각 33.40/33.46/33.52 에 `fadeIn(f(1))`.
- 33.58→33.80 전체 `fadeOut(0.2)` (예외적으로 끝 +0.22 허용).

### S15 `outro-chant` 33.58–39.66 (`24-s15-outro-chant.jsx`) — S03 의 콜백, 더 크게
- 33.88 **"PO"** lime en size 380 at (540, 700) `impactIn(from 130)` + `rgbSplit(2f)` + `shake(1.0)`.
- 34.53 **"TA"** white size 380 at (540, 980) `impactIn(from 130)` + `shake(0.8)`.
- 35.60 **"TA"** purple size 380 at (540, 1260) `impactIn(from 130)` + `rgbSplit(2f)` + `shake(1.0)`.
- 36.037/36.455/36.897 비트에 세 단어 `pulse(1.05)`. 세 단어 t1 37.31.
- 37.31 (빠): purple `solid` 37.31–37.94; **"빠"** white ko size 360 at (540, 960) `impactIn(from 130)` + `shake(1.5)`.
- 37.94 (밤!): lime `solid` 37.94–39.66; **"밤!"** black ko size 360 `impactIn(from 130)` + `rgbSplit(3f, 24)` + `shake(1.5)`; 38.615/39.033/39.474 비트 `pulse(1.06)`(글리치는 장면당 3회 제한 때문에 없음).
- 39.66 하드컷.

### S16 `endcard` 39.66–40.88 (`25-s16-endcard.jsx`)
- 39.66 `flash(white, peak 70, dur 0.10)` + `shake(1.0)`.
- **"POTATA"** white en size 240 tracking -40 at (540, 900) `impactIn(from 118)` + `glow(radius 80, intensity 0.5, threshold 70)`; 마지막 비트 40.31 에 `pulse(1.03)`.
- 39.80 "K-FASHION, RECODED." lime en size 34 tracking 500 at (540, 1080) `typeOn 0.25`.
- 39.95 "SEOUL TO DUBAI" white enMid size 34 tracking 600 at (540, 1150) `fadeIn`.
- 40.10 `pill("@potata", stroke white 2, noFill, size 34, h 64)` at (540, 1395) `popIn`; 40.20 "FOLLOW THE BUILD" lime enMid size 34 tracking 500 at (540, 1480) `fadeIn`.
- 40.88 까지 정지.

### 이중 표기판(r05) 추가 사항 — 계획 `docs/work-plans/launch-teaser-bilingual.md`
- 사진: S05 피드 카드 1~4 = `feed-1~4` · S07 실루엣 대신 `tryon` 600×880 at (540, 1050) · S08 카드 idx = `style-idx`(focusY 0.3) · S09 OOTD 카드 = `share`(focusY 0.3).
- 표기(`gloss`, enMid, 기본 lime·size 36·tracking 250, 한국어 +2f typeOn):
  S05 "ONE SCROLL. SEOUL AT YOUR DOOR." left x 100 y 1686 size 32 (scrollW3) · S07 스티커 h 150, "톡!" y 622 + "TAP!" black 24 y 684 · S08 스티커 h 156, "짠!" -18 + "TA-DA!" white 24 +46 ·
  S10 "BAM-TI = MID" (380, 868) / "NAH" (700, 868) size 34 · S11 "TODAY IT'S" white 30 (540, 1393) ·
  S12 "MID" black 48 (540, 905) / "NAH" 48 (540, 1305, delay 1f) / "MID? NAH." 30 (540, 826) · S15 "BA-" white 60 / "BAM!" black 60 at (540, 1185).

## 4. 파일 템플릿

```javascript
// S05 scroll — 스크롤 한 번이면 서울이 문 앞에 (10.30–13.44)
scene("S05", T.scroll, T.scrollEnd, function (ctx) {
  var t0 = T.scroll, t1 = T.scrollEnd;
  // 뒤 → 앞 순서로 생성
  var ghost = text("SCROLL", { font: "en", size: 320, fillNone: true, stroke: { color: COL.white, width: 3 }, pos: [540, 1500], t0: t0, t1: t1, name: "S05 ghost" });
  ghost.opacity.setValue(30);
  setKeys(ghost.position, [[t0, [540, 1500]], [t1, [540, 700]]], "linear");
  // ...
});
```

## 5. 작성자 산출물

- 파일 1개: `marketing/launch-teaser/src/<번호>-<id>.jsx` (UTF-8, 한글 그대로 써도 됨 — 빌드가 이스케이프).
- 작성 후 반드시 저장소 루트에서 `python marketing/launch-teaser/build.py <장면ID> --only <내 파일명>` (예: `python marketing/launch-teaser/build.py S05 --only 14-s05-scroll.jsx`) 를 실행해 `ES3 parse OK` 를 확인한다(실패하면 고친다). 다른 장면 파일은 건드리지 않는다.
- 보고: 만든 레이어 목록(이름·t0·t1), 쓴 헬퍼, 확신이 없는 API 사용처(리뷰어가 집중할 곳).

### r06 보완 — 후렴 사진 하드컷 · 릴스 UI 가림 회피
- `photoFlash(item, t, dur, {dim})`: 전면 사진(106% cover, 1.08→1.00 줌) + 검정 막. S10 응답 비트 resp1(feed-1/style-4/feed-4)·resp2(style-2/tryon/share), S15 bChant(feed-3/style-3/style-1, dim 55). 각 컷은 다음 비트까지(마지막은 0.26s·0.4s 이내).
- 배치 기준: 핵심 글자 y ≤ 1440, 아래 절반에서 x ≤ 920. S05 전체 -260(`SAFE_UP`) · S07 카드 640×900 at 930, 사진 600×780 at 960, 상태어 y 1415 가로 한 줄(실측 폭·간격 60) · S09 제목 400 / 카드 860 / 아이콘 줄 1340(250·390·520·640·820) · S11 묶음 -140 · S16 pill 1290 / FOLLOW 1380.
