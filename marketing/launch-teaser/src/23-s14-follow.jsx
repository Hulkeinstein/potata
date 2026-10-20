// S14 follow — "Follow the build…" 속삭임, 가장 조용한 화면 (32.34–33.58, 페이드아웃 꼬리 33.80 까지는 SPEC 예외)
//
// 텍스트 폭 어림(SPEC §0.10) — enMid 대문자 1글자 ≈ 0.62 × 64 ≈ 40px, tracking 600 → 글자 사이 0.6 × 64 = 38.4px:
//   FOLLOW ≈ 6×40 + 5×38.4 ≈ 432 · THE ≈ 3×40 + 2×38.4 ≈ 197 · BUILD ≈ 5×40 + 4×38.4 ≈ 354 · 단어 간격 2×56 = 112
//   → 세 단어 한 줄 ≈ 1095px, 뒤의 "…" 3점 ≈ 3×(16 + 38.4) ≈ 163px → 920px 을 넘는다(캔버스 1080 도 넘는다).
//   그래서 size 64 를 상한으로 두고 런타임에 bbox 로 실측해, 세 단어의 가운데 정렬(중심 x 540)은 유지한 채
//   마지막 점까지 안전 영역(x 80~1000)에 들어가도록 여섯 레이어를 같은 비율로 축소한다(예상 s ≈ 0.65 → 유효 size ≈ 42).
scene("S14", T.follow, T.buildEnd, function (ctx) {
  var tEnd = T.buildEnd + 0.22;                  // 레이어 수명 꼬리 — SPEC S14 가 허용한 끝 +0.22 예외
  var tMeasure = T.buildEnd;                     // 여섯 레이어가 모두 살아 있는 시각 — bbox 측정용
  var SIZE = 64, TRACK = 400, GAP = 120, LINE_Y = 960;   // r02 검수: tracking 600·gap 56 은 단어 경계가 안 읽혀 글자 간격은 줄이고 단어 간격은 키움
  var SAFE_HALF = 460;                           // 안전 영역 x 80~1000 의 반폭(중심 540 기준)
  var trackPx = SIZE * TRACK / 1000;             // tracking 600 = 0.6em → 글자 사이 간격(px)
  var i;

  // 뒤 → 앞: 단어 세 개 → 점 세 개. 위치는 실측 뒤에 다시 잡으므로 일단 (540, 960) 에 만든다.
  var words = [
    text("FOLLOW", { font: "enMid", size: SIZE, color: COL.white, tracking: TRACK, anchor: "left", pos: [CX, LINE_Y], t0: T.follow, t1: tEnd, name: "S14 FOLLOW" }),
    text("THE", { font: "enMid", size: SIZE, color: COL.white, tracking: TRACK, anchor: "left", pos: [CX, LINE_Y], t0: T.the, t1: tEnd, name: "S14 THE" }),
    text("BUILD", { font: "enMid", size: SIZE, color: COL.white, tracking: TRACK, anchor: "left", pos: [CX, LINE_Y], t0: T.build, t1: tEnd, name: "S14 BUILD" })
  ];
  var dotT = [], dots = [];
  for (i = 0; i < 3; i++) {
    dotT.push(T.buildEnd - 0.18 + i * 0.06);     // 33.40 / 33.46 / 33.52
    dots.push(text(".", { font: "enMid", size: SIZE, color: COL.lime, tracking: 0, anchor: "left", pos: [CX, LINE_Y], t0: dotT[i], t1: tEnd, name: "S14 dot " + (i + 1) }));
  }

  // 1) 실측(배율 100) → 축소 배율 s. 세 단어 중심을 540 에 두면 오른쪽 끝 = 540 + 단어폭/2 + 점폭 이므로
  //    그 끝이 안전 영역 오른쪽(540 + 460)을 넘지 않게 한다. 넘지 않으면 s = 1 (SPEC 의 size 64 그대로).
  var wWords = 2 * GAP;
  for (i = 0; i < 3; i++) { wWords += bbox(words[i], tMeasure).width; }
  var wDots = 3 * (trackPx + bbox(dots[0], tMeasure).width);   // BUILD 뒤 간격 + 점 세 개(점 사이도 tracking 간격)
  var s = Math.min(1, SAFE_HALF / (wWords / 2 + wDots));
  log("S14 line: words=" + Math.round(wWords) + "px dots=" + Math.round(wDots) + "px scale=" + Math.round(s * 100) + "%");
  for (i = 0; i < 3; i++) { setv(words[i].scale, [s * 100, s * 100]); setv(dots[i].scale, [s * 100, s * 100]); }
  var gap = GAP * s, track = trackPx * s;

  // 2) 세 단어를 단어 간 gap 띄워 중심 x 540 에 가운데 정렬 (bbox 는 scale 을 반영한 월드 폭)
  var ws = [];
  for (i = 0; i < 3; i++) { ws.push(bbox(words[i], tMeasure).width); }
  var x = CX - (ws[0] + ws[1] + ws[2] + 2 * gap) / 2;
  for (i = 0; i < 3; i++) { setv(words[i].position, [x, LINE_Y]); x += ws[i] + gap; }

  // 3) "…" 세 점: BUILD 오른쪽에 글자 간격만큼 띄우고, 베이스라인(BUILD 글자 박스 하단)에 맞춘다
  var bb = bbox(words[2], tMeasure);
  var baseline = bb.top + bb.height;
  var dx = bb.left + bb.width + track;
  for (i = 0; i < 3; i++) {
    var db = bbox(dots[i], tMeasure);
    setv(dots[i].position, [dx, baseline - db.height / 2]);
    dx += db.width + track;
  }

  // 4) 등장: 단어는 typeOn 0.18 (FOLLOW 32.34 / THE 32.74 / BUILD 33.14), 점은 1프레임 fadeIn
  typeOn(words[0], T.follow, 0.18);
  typeOn(words[1], T.the, 0.18);
  typeOn(words[2], T.build, 0.18);
  for (i = 0; i < 3; i++) { fadeIn(dots[i], dotT[i], f(1)); }

  // 5) 퇴장: 33.58 부터 0.2s 전체 페이드아웃 (fadeOut 이 33.78 에서 컷)
  for (i = 0; i < 3; i++) { fadeOut(words[i], T.buildEnd, 0.2); fadeOut(dots[i], T.buildEnd, 0.2); }
});
