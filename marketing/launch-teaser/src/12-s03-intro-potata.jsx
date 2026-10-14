// S03 intro-potata — Po-ta-ta! (Let's go!) (4.28–7.00)
// 헬퍼 API 는 00-core.jsx 가 SSoT. 레이어는 뒤→앞 순서로 만든다.
scene("S03", T.loadingDone, T.kfashion, function (ctx) {
  var t0 = T.loadingDone, t1 = T.kfashion;
  // SPEC: purple 점은 장면 시작(4.28)·LET'S GO 컷(6.44) 뒤 0.02s 부터 (4.30 / 6.46)
  var DOT_GAP = 0.02;
  // SPEC 지정 비트: 5.596(세 단어 pulse) · 6.455(LET'S GO rgbSplit 2회차)
  var tPulse = BEATS[13], tGlitch2 = BEATS[15];

  // 1) 4.30–4.74 숨 고르기 — 중앙 purple 점 24px, 비트에 따라 불투명도 20~100
  var dot1 = ellipse({ w: 24, h: 24, color: COL.purple, pos: [540, 960], t0: t0 + DOT_GAP, t1: T.po1, name: "S03 dot 1" });
  beatOpacity(dot1, 20, 100);

  // 2) 4.74 "PO" lime — 주인공. 폭 어림 2 × 0.62 × 360 = 446px (≤ 920)
  var po = text("PO", { font: "en", size: 360, color: COL.lime, pos: [540, 760], t0: T.po1, t1: T.letsGo, name: "S03 PO" });
  impactIn(po, T.po1, { from: 125 });
  rgbSplit(po, T.po1);
  shake(T.po1, { amount: 1.0 });

  // 3) 4.95 "TA" white — 폭 어림 446px
  var ta1 = text("TA", { font: "en", size: 360, color: COL.white, pos: [540, 1010], t0: T.ta1, t1: T.letsGo, name: "S03 TA 1" });
  impactIn(ta1, T.ta1, { from: 125 });

  // 4) 5.16 "TA" purple — 폭 어림 446px
  var ta2 = text("TA", { font: "en", size: 360, color: COL.purple, pos: [540, 1260], t0: T.ta2, t1: T.letsGo, name: "S03 TA 2" });
  impactIn(ta2, T.ta2, { from: 125 });
  shake(T.ta2, { amount: 1.0 });

  // 5) 5.596 비트 — 세 단어 pulse(1.06). 세 단어는 t1 5.80 에서 하드컷
  pulse(po, tPulse, { amount: 1.06 });
  pulse(ta1, tPulse, { amount: 1.06 });
  pulse(ta2, tPulse, { amount: 1.06 });

  // 6) 5.80–6.44 "LET'S GO!" — lime 솔리드(하드컷 인/아웃, parent 없음) 위에 black 텍스트
  //    폭 어림: 대문자 6자 × 0.62 + (' 0.25 + 공백 0.25 + ! 0.30) ≈ 4.52em × 200 ≈ 904px (≤ 920, 빠듯함)
  solid(COL.lime, T.letsGo, T.introEnd, "S03 letsgo bg");
  var lg = text("LET'S GO!", { font: "en", size: 185, vscale: 115, color: COL.black, pos: [540, 960], t0: T.letsGo, t1: T.introEnd, name: "S03 LET'S GO" });
  impactIn(lg, T.letsGo, { from: 120 });
  rgbSplit(lg, T.letsGo, { frames: 3, offset: 22 });
  shake(T.letsGo, { amount: 1.3 });
  // 6.455 비트에 rgbSplit(2f) 한 번 더 — SPEC 그대로(솔리드·텍스트 컷 6.44 직후라 검정 위에 R/C 잔상 2프레임)
  rgbSplit(lg, tGlitch2, { frames: 2 });

  // 7) 6.46–7.00 검정 — purple 점 다시
  var dot2 = ellipse({ w: 24, h: 24, color: COL.purple, pos: [540, 960], t0: T.introEnd + DOT_GAP, t1: t1, name: "S03 dot 2" });
  beatOpacity(dot2, 20, 100);
});
