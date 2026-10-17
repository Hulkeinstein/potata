// S11 seoul-dubai — "Seoul to Dubai, 오늘은 Potata" (24.72–28.00)
// 뒤→앞: 배경(배너 듀오톤) → SEOUL → 화살표 → DUBAI → 오늘은 → POTATA. 28.00 하드컷.
scene("S11", T.seoulTo, T.hook3, function (ctx) {
  var t0 = T.seoulTo, t1 = T.hook3;
  var i;

  // ---- 배경: 배너 푸티지를 검정→보라 듀오톤 55% 로 깔고 느리게 패닝(x 640→440) + 줌(250→262) ----
  var bg;
  if (ctx.banner) {
    bg = image(ctx.banner, { scale: 250, pos: [640, 1080], t0: t0, t1: t1, name: "S11 bg banner" });   // r02 검수: 960 이면 모델 얼굴이 상단에서 잘려 120 내림
    tint(bg, COL.black, COL.purple, 100);
    bg.opacity.setValue(55);
    setKeys(bg.position, [[t0, [640, 1080]], [t1, [440, 1080]]], "linear");
    setKeys(bg.scale, [[t0, [250, 250]], [t1, [262, 262]]], "linear");
  } else {
    // 배너가 없으면 보라 전면 사각형 25% 로 대체
    bg = rect({ w: W, h: H, color: COL.purple, pos: [CX, CY], t0: t0, t1: t1, name: "S11 bg fallback" });
    bg.opacity.setValue(25);
  }

  // ---- 24.72 "SEOUL" white en 150 at (300, 700) — 폭 ≈ 5 × 0.62 × 150 = 465px ----
  var seoul = text("SEOUL", { font: "en", size: 150, color: COL.white, pos: [320, 560], t0: t0, t1: t1, name: "S11 SEOUL" });
  impactIn(seoul, t0);

  // ---- 24.90→25.40 화살표 (150→930, y 860). 널이 장면 안에 머물도록 o.t1 을 반드시 넘긴다 ----
  var arrowT0 = T.seoulTo + 0.18, arrowT1 = T.dubai - 0.04;
  var arr = arrow(arrowT0, arrowT1, { x0: 150, x1: 930, y: 720, color: COL.lime, thick: 12, head: 80, t1: t1 });
  arr.name = "S11 arrow ctrl";

  // ---- 25.44 "DUBAI" lime en 150 at (780, 1020) — 폭 ≈ 465px ----
  var dubai = text("DUBAI", { font: "en", size: 150, color: COL.lime, pos: [760, 880], t0: T.dubai, t1: t1, name: "S11 DUBAI" });
  impactIn(dubai, T.dubai);
  rgbSplit(dubai, T.dubai, { frames: 2 });
  shake(T.dubai, { amount: 0.8 });

  // ---- 25.88 "오늘은" white ko 150 at (540, 1300) — 폭 ≈ 3 × 0.95 × 150 = 428px ----
  var today = text("오늘은", { font: "ko", size: 150, color: COL.white, pos: [540, 1160], t0: T.today, t1: t1, name: "S11 오늘은" });
  impactIn(today, T.today);
  // 이중 표기: "오늘은"(아래 끝 ≈ 1360)과 POTATA(윗단 ≈ 1423) 사이
  gloss("TODAY IT'S", { pos: [540, 1253], size: 30, color: COL.white, t0: T.today, t1: t1, name: "S11 gloss 오늘은" });

  // ---- 26.58 "POTATA" lime en 220 tracking -40 at (540, 1500) — 폭 ≈ 6 × 0.62 × 220 = 818px, tracking -40 적용 시 ≈ 774px ----
  var potata = text("POTATA", { font: "en", size: 220, color: COL.lime, tracking: -40, pos: [540, 1360], t0: T.todayPotata, t1: t1, name: "S11 POTATA" });
  glow(potata, { radius: 80, intensity: 0.5, threshold: 70 });   // r02 검수: lime 이 흰색으로 표백되지 않게
  impactIn(potata, T.todayPotata, { from: 125 });
  shake(T.todayPotata, { amount: 1.0 });

  // ---- 27.028 / 27.469 / 27.887 비트에 pulse(1.05). 착지 직후(26.61) 비트는 제외하려고 하한을 +0.4 로 둔다 ----
  var pulseFrom = T.todayPotata + 0.4;
  for (i = 0; i < BEATS.length; i++) {
    if (BEATS[i] >= pulseFrom && BEATS[i] < t1) { pulse(potata, BEATS[i], { amount: 1.05 }); }
  }
});
