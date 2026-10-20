// S12 hook3 — 밤티 말고 Potata! 최고 에너지 구간, 구간별 색 반전 (28.00–31.46)
scene("S12", T.hook3, T.yeah, function (ctx) {
  // 구간 경계: A(lime) → B(검정) → C(purple) → D(검정). 장면 간·구간 간 모두 하드컷.
  var tA = T.hook3;                // 28.00 "밤티"
  var tB = T.hook3b;               // 29.12 "말고"
  var tC = T.hook3Potata;          // 29.46 "POTATA" (purple 배경)
  var tD = T.hook3Potata + 0.84;   // 30.30 "POTATA" lime — SPEC D 시작. T 키가 없어 tC 기준 오프셋(≈ 2 beats)
  var t1 = T.yeah;                 // 31.46 하드컷
  var bA1 = BEATS[66], bA2 = BEATS[67]; // 28.328 / 28.746
  var bC1 = BEATS[70];                  // 30.023

  // ---------- A 28.00–29.12 : lime 배경 + "밤티" black ----------
  // 폭 어림: 2자 × 0.95 × 220 = 418px < 920
  solid(COL.lime, tA, tB, "S12 bg lime");
  var bamti = text("밤티", { font: "ko", size: 220, color: COL.black, pos: [540, 760], t0: tA, t1: tB, name: "S12 bamti" });
  impactIn(bamti, tA);
  rgbSplit(bamti, tA, { frames: 2 });
  pulse(bamti, bA1, { amount: 1.06 });
  pulse(bamti, bA2, { amount: 1.06 });
  gloss("MID", { pos: [540, 905], size: 48, color: COL.black, t0: tA, t1: tB, name: "S12 gloss 밤티" });   // lime 배경 → black
  var st = strike(bamti, tA + 0.70, { color: COL.purple, thick: 24 }); // 28.70 — t1 은 bamti 의 outPoint(29.12)
  st.name = "S12 bamti strike";

  // ---------- B 29.12–29.46 : (검정) "말고" white ----------
  // 폭 어림: 2자 × 0.95 × 220 = 418px < 920. 위치는 "밤티" 자리를 그대로 이어받는다(단어 교체).
  // r02 검수: 후반 13초가 전부 중앙 배치라 밤티(760)/말고(1160)/POTATA(960) 로 위/아래/중앙 리듬을 준다
  var malgo = text("말고", { font: "ko", size: 220, color: COL.white, pos: [540, 1160], t0: tB, t1: tC, name: "S12 malgo" });
  impactIn(malgo, tB);
  rgbSplit(malgo, tB, { frames: 2 });
  gloss("NAH", { pos: [540, 1305], size: 48, t0: tB, t1: tC, delay: f(1), name: "S12 gloss 말고" });   // 구간이 0.34s 라 1프레임만 늦춘다

  // ---------- C 29.46–30.30 : purple 배경 + "POTATA" white ----------
  // 폭 어림: 6자 × 0.62 × 230 = 856px, tracking -40(≈ -9px × 5) → 약 810px < 920
  // 위치는 화면 중앙(540, 960): D 의 보조 텍스트 y 760 / 1160 이 ±200 으로 대칭이 되는 기준
  solid(COL.purple, tC, tD, "S12 bg purple");
  var potC = text("POTATA", { font: "en", size: 230, color: COL.white, tracking: -40, pos: [540, 960], t0: tC, t1: tD, name: "S12 potata purple" });
  impactIn(potC, tC, { from: 130 });
  rgbSplit(potC, tC, { frames: 3, offset: 22 });
  shake(tC, { amount: 1.4 });
  pulse(potC, bC1, { amount: 1.06 });

  // ---------- D 30.30–31.46 : (검정) 보조 텍스트 → "POTATA" lime ----------
  // 폭 어림: "밤티 말고" 5자 × 0.95 × 64 = 304px / "SEOUL TO DUBAI" 14자 × 0.62 × 30 = 260 + tracking 600(18px × 13) = 494px
  var sub = text("밤티 말고", { font: "ko", size: 64, color: COL.white, pos: [540, 760], t0: tD, t1: t1, name: "S12 sub bamti malgo" });
  typeOn(sub, tD, 0.2);
  gloss("MID? NAH.", { pos: [540, 826], size: 30, t0: tD, t1: t1, name: "S12 gloss sub" });   // sub(아래 끝 ≈ 786)와 POTATA(윗단 ≈ 880) 사이
  var tag = text("SEOUL TO DUBAI", { font: "enMid", size: 30, color: COL.lime, tracking: 600, pos: [540, 1160], t0: tD, t1: t1, name: "S12 tag seoul to dubai" });
  fadeIn(tag, tD);
  var potD = text("POTATA", { font: "en", size: 230, color: COL.lime, tracking: -40, pos: [540, 960], t0: tD, t1: t1, name: "S12 potata lime" });
  impactIn(potD, tD);
  beatScale(potD, 8);
});
