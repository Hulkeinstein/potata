// S06 discover — "Discover, 툭!" (13.44–14.44)
// 뒤에서 아웃라인 "DISCOVER" 가 왼→오로 흐르고, 흰 "DISCOVER" 가 착지, 메뉴 pill 행이 오른쪽에서 밀려 들어온 뒤
// 13.96 에 "툭!" 스티커가 팝. 14.44 에 전부 왼쪽으로 빠져나가는 휩 전환(다음 S07 은 오른쪽에서 들어온다).
scene("S06", T.discover, T.tryItOn, function (ctx) {
  var t0 = T.discover, t1 = T.tryItOn;
  var OUT_DUR = 0.12;                  // 휩 전환 slideOut 길이
  var tEnd = t1 + OUT_DUR;             // 자식 레이어 t1 — slideOut 이 끝나는 시각(허용 오차 끝 +0.30 안)
  var tPill = t0 + 0.06;               // SPEC "13.50" (T 키 없음) — 13.44 + 0.06 = 13.5 정확(프레임 405). f(2) 를 더하면 13.5067 이라 1프레임 늦게 보인다.
  var PILL_Y = 1200, PILL_X0 = 60, PILL_GAP = 16;
  var PILL_SIZE = 30, PILL_PAD = 28;   // r02 검수: 22 는 폰에서 8pt 수준이라 30 으로(마지막 pill 은 화면 밖으로 걸려도 됨)   // PILL_PAD 는 pill() 기본 padX 와 같은 값(폭 어림 fallback 용)
  var i, N, w, lb, tp, opt;

  // pill() 은 널만 돌려주므로, 생성된 배경 rect("pill bg <label>")를 이름으로 찾아 실제 폭을 잰다.
  // 못 찾으면 로그를 남기고 §0.10 어림(대문자 1글자 ≈ 0.62 × size)으로 대신한다.
  function pillWidth(label, t) {
    var bg = null;
    try { bg = ctx.comp.layer("pill bg " + label); } catch (e) { bg = null; }
    if (bg) { return bbox(bg, t).width; }
    log("S06: pill bg not found for " + label + " - width estimated");
    return label.length * 0.62 * PILL_SIZE + 2 * PILL_PAD;
  }

  // ---- 뒤: 고스트 아웃라인 "DISCOVER" — x -300→1380 linear (13.44→14.44) ----
  // 폭 ≈ 8 × 0.62 × 260 = 1290px: 화면 밖에서 밖으로 흐르는 배경 요소라 920 제한 대상이 아니다(SPEC 가 size 260 명시).
  var ghost = text("DISCOVER", { font: "en", size: 260, fillNone: true, stroke: { color: COL.white, width: 4 }, pos: [-300, 760], t0: t0, t1: tEnd, name: "S06 ghost" });
  setKeys(ghost.position, [[t0, [-300, 760]], [t1, [1380, 760]]], "linear");
  ghost.opacity.setValue(35);  // r02 검수: 100% 아웃라인이 주인공 제목보다 튀어 S05 고스트(30)와 비슷하게 낮춤

  // ---- 주인공: "DISCOVER" white en 150 at (540, 980) — 폭 ≈ 8 × 0.62 × 150 = 744px ≤ 920 ----
  var title = text("DISCOVER", { font: "en", size: 150, color: COL.white, pos: [540, 980], t0: t0, t1: tEnd, name: "S06 title" });
  impactIn(title, t0);
  rgbSplit(title, t0, { frames: 2 });

  // ---- 메뉴 pill 행 y 1200: x 60 부터 간격 16 으로 이어 붙임(마지막은 화면 밖이어도 됨) ----
  // 각 pill 은 임시로 중앙에 만든 뒤 폭을 재서 널 위치만 옮긴다(자식은 널 기준 [0,0] 이라 함께 이동).
  // 2프레임씩 지연해 오른쪽에서 slideIn. 널의 opacity 는 자식에 안 먹으므로 자식 t0 = 각 pill 의 등장 시각.
  var labels = ["CATEGORY", "SHOP", "OOTD", "FOR YOU", "RANKING", "BRANDS"];
  var pills = [];
  var xCursor = PILL_X0;
  for (i = 0; i < labels.length; i++) {
    lb = labels[i];
    tp = tPill + f(2) * i;
    opt = { pos: [CX, PILL_Y], h: 68, size: PILL_SIZE, stroke: { color: COL.white, width: 2 }, t0: tp, t1: tEnd, name: "S06 pill " + lb };
    if (lb === "SHOP") { opt.color = COL.lime; opt.textColor = COL.black; }   // SHOP 만 lime 채움 + 검정 글자
    N = pill(lb, opt);
    w = pillWidth(lb, tp);
    setv(N.position, [xCursor + w / 2, PILL_Y]);
    xCursor += w + PILL_GAP;
    slideIn(N, tp, "right", { dist: 500, dur: 0.3 });
    pills.push(N);
  }

  // ---- 13.96 "툭!" 스티커: purple rect 180×120 r 24 + white ko "툭!" 84, rotation -12, at (820, 860) ----
  // "툭!" 폭 ≈ 0.95 × 84 + "!" ≈ 115px < 180 박스.
  // r02 검수: (820, 860) 은 아래 모서리가 DISCOVER 의 E·R 윗선에 닿아 (840, 815) 로 올림
  var tuk = group("S06 tuk ctrl", [840, 815], T.tuk, tEnd);
  rect({ w: 180, h: 120, r: 24, color: COL.purple, pos: [840, 815], t0: T.tuk, t1: tEnd, parentLayer: tuk, name: "S06 tuk bg" });
  text("툭!", { size: 84, color: COL.white, pos: [840, 815], t0: T.tuk, t1: tEnd, parentLayer: tuk, name: "S06 tuk text" });
  tuk.rotation.setValue(-12);
  popIn(tuk, T.tuk);
  shake(T.tuk, { amount: 0.4 });

  // ---- 14.44 휩 전환: 전부 왼쪽으로 slideOut(dist 800, dur 0.12) ----
  var outOpt = { dist: 800, dur: OUT_DUR };
  slideOut(ghost, t1, "left", merge(outOpt, { noFade: true }));  // 페이드 키가 35% 설정을 100 으로 덮지 않게
  // slideOut 은 14.44 의 드리프트 끝 키를 재사용하며 incoming 을 BEZIER(influence 88) 로 바꿔 13.44→14.44 가 강한 ease-in 이 된다.
  // SPEC 은 그 구간을 linear 로 명시하므로 그 키의 incoming 만 LINEAR 로 되돌린다(outgoing BEZIER 는 유지 → 휩 가속은 그대로).
  try {
    ghost.position.setInterpolationTypeAtKey(ghost.position.nearestKeyIndex(t1), KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.BEZIER);
  } catch (eGhost) { log("S06: ghost drift key linear restore failed - " + eGhost); }
  slideOut(title, t1, "left", outOpt);
  for (i = 0; i < pills.length; i++) { slideOut(pills[i], t1, "left", outOpt); }
  slideOut(tuk, t1, "left", outOpt);
});
