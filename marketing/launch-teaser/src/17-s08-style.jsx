// S08 style — "Style it, 짠!" (15.42–16.26)
// 매스너리 카드 4장이 좌우에서 들어오고 → "STYLE IT" 임팩트 → "짠!" 스티커 팝 + 카메라 흔들림 → 카드가 들어온 쪽으로 되돌아 나가며 S09 로.
scene("S08", T.styleIt, T.shareIt, function (ctx) {
  var t0 = T.styleIt, t1 = T.shareIt;
  var SLIDE_IN = { dist: 600, dur: 0.22 }, SLIDE_OUT = { dist: 700, dur: 0.12 };
  // 퇴장 슬라이드(0.12s)가 보이도록 카드만 장면 끝 +0.12 까지 산다 (SPEC §0.4 허용 오차 +0.30 안)
  var cardT1 = t1 + SLIDE_OUT.dur;

  // ---- 1) 매스너리 card() 4장 (badge·price 없음) — 뒤 → 앞: 깊이 92 두 장 먼저, 104 두 장 나중 ----
  // idx 는 SPEC 의 카드 번호(1~4). 입장 지연 = (idx-1) × 2프레임. 카드끼리는 화면에서 겹치지 않는다.
  var cards = [
    // r02 검수: 제목 "STYLE IT"(y 960) 위아래 여백이 없어 위 두 장은 60 올리고 아래 두 장은 60 내림
    { idx: 2, pos: [800, 540], w: 360, h: 420, side: "right", depth: 92 },
    { idx: 3, pos: [280, 1320], w: 360, h: 440, side: "left", depth: 92 },
    { idx: 1, pos: [280, 600], w: 360, h: 480, side: "left", depth: 104 },
    { idx: 4, pos: [800, 1240], w: 360, h: 520, side: "right", depth: 104 }
  ];
  var i, c, N, tIn;
  for (i = 0; i < cards.length; i++) {
    c = cards[i];
    tIn = t0 + f(2 * (c.idx - 1));
    N = card({ w: c.w, h: c.h, pos: c.pos, photo: ctx.photos["style-" + c.idx], focusY: 0.3, t0: tIn, t1: cardT1, name: "S08 card " + c.idx });
    // 자식이 널에 parent 된 뒤에 스케일을 바꿔야 깊이 스케일이 자식(카드 도형)에 전달된다
    setv(N.scale, [c.depth, c.depth]);
    slideIn(N, tIn, c.side, SLIDE_IN);     // 왼쪽 카드는 왼쪽에서, 오른쪽 카드는 오른쪽에서 들어온다
    slideOut(N, t1, c.side, SLIDE_OUT);    // 16.26: 들어온 쪽으로 되돌아 나간다
  }

  // ---- 2) 주인공 "STYLE IT" — 폭 어림: 8자(공백 포함) × 0.62 × 170 ≈ 843px ≤ 920 ----
  var tTitle = t0 + 0.04;   // SPEC 15.46
  var title = text("STYLE IT", { font: "en", size: 170, color: COL.white, pos: [540, 960], t0: tTitle, t1: t1, name: "S08 title" });
  impactIn(title, tTitle);
  rgbSplit(title, tTitle, { frames: 2 });

  // ---- 3) "짠!" 스티커 — purple 배경 + white ko 84, rotation -8 (맨 앞) ----
  // 배경 크기 어림: "짠!" 폭 ≈ 0.95×84 + 0.3×84 ≈ 105px, 높이 ≈ 70px → 여백 포함 192×124
  var stkPos = [540, 1420];
  var stk = group("S08 zzan ctrl", stkPos, T.zzan, t1);
  // 이중 표기: 스티커를 156 높이로 키우고 "짠!" 아래에 "TA-DA!" 를 함께 넣는다
  rect({ w: 192, h: 156, r: 26, color: COL.purple, pos: stkPos, t0: T.zzan, t1: t1, parentLayer: stk, name: "S08 zzan bg" });
  text("짠!", { font: "ko", size: 84, color: COL.white, pos: [stkPos[0], stkPos[1] - 18], t0: T.zzan, t1: t1, parentLayer: stk, name: "S08 zzan text" });
  gloss("TA-DA!", { pos: [stkPos[0], stkPos[1] + 46], size: 24, color: COL.white, tracking: 150, still: true, t0: T.zzan, t1: t1, parentLayer: stk, name: "S08 zzan gloss" });
  stk.rotation.setValue(-8);   // 자식 parent 후 회전 → 배경+글자가 묶음째 기울어진다
  popIn(stk, T.zzan);
  shake(T.zzan, { amount: 0.4 });
});
