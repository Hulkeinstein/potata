// S05 scroll — 스크롤 한 번이면 서울이 문 앞에 (10.30–13.44)
// 주인공 = 피드 스크롤(널 하나가 3초 동안 한 번 길게 올라간다). 가사는 보조(짧은 slideIn), 고스트는 느린 패럴랙스.
scene("S05", T.scroll, T.scrollEnd, function (ctx) {
  var t0 = T.scroll, t1 = T.scrollEnd;
  var tScrollStop = T.scrollEnd - 0.14;   // 13.30 — 긴 스크롤이 멈추는 시각 (SPEC 명시값, T 키 없음)
  var tShake = T.scrollEnd - 0.576;       // 12.864 — shake 온셋 (SPEC 명시값, T 키 없음)
  var feedOutDur = 0.16, feedOutDist = 2200;   // r02 검수: dist 900 으론 아래쪽 카드가 S06 까지 남아 2200 으로 완전히 내보낸다
  var tFeedEnd = T.scrollEnd + feedOutDur;     // 13.60 — 피드 slideOut 이 끝까지 보이도록 (§0.4 끝 +0.30 허용 안)
  var i;

  // 가사 한 단어: 왼쪽 정렬 텍스트 + slideIn("down" = 아래쪽에서 올라와 정지)
  function lyric(str, x, y, t, color, name) {
    var L = text(str, { font: "ko", size: 92, color: color, pos: [x, y], anchor: "left", justify: "left", t0: t, t1: t1, name: name });
    slideIn(L, t, "down", { dist: 60, dur: 0.2 });
    return L;
  }
  // 다음 단어 x = 이전 단어 오른쪽 끝 + 28 (이전 단어의 slideIn 이 끝난 뒤 시각에 잰다)
  function nextX(prev, t) { var b = bbox(prev, t); return b.left + b.width + 28; }

  // ---------- 뒤: 고스트 "SCROLL" 아웃라인 — 느린 패럴랙스 y 1500→700 ----------
  // 폭 어림(§0.10): 6자 × 0.62 × 320 ≈ 1190px. SPEC 가 size 320 을 명시한 배경 장식(opacity 30)이라 좌우로 흘러넘치는 것이 의도.
  var ghost = text("SCROLL", { font: "en", size: 320, fillNone: true, stroke: { color: COL.white, width: 3 }, pos: [540, 1500], t0: t0, t1: t1, name: "S05 ghost" });
  ghost.opacity.setValue(30);
  setKeys(ghost.position, [[t0, [540, 1500]], [t1, [540, 700]]], "linear");

  // ---------- 피드: 널 + 카드 4장 ----------
  var SAFE_UP = 260;   // r06: 릴스 하단 UI(아래 480px)를 피해 피드·가사·띠를 통째로 올린다
  var feed = group("S05 feed", [540, 1180 - SAFE_UP], t0, tFeedEnd);   // r02 검수: 1300 이면 1번 카드 제목 줄이 가사 1행(1480)과 같은 높이라 120 올림
  // 카드 w 460 h 600, 세로 간격 40 → 중심 y 1300/1940/2580/3220. 깊이감: 2·4번 scale 92, x +40.
  var cardsSpec = [
    { y: 1300, price: "AED 149", badge: "NEW", deep: false },
    { y: 1940, price: "AED 89", badge: "HOT", deep: true },
    { y: 2580, price: "AED 210", badge: "BEST", deep: false },
    { y: 3220, price: "AED 120", badge: null, deep: true }
  ];
  for (i = 0; i < cardsSpec.length; i++) {
    var cs = cardsSpec[i];
    var c = card({ w: 460, h: 600, pos: [cs.deep ? 580 : 540, cs.y - 120 - SAFE_UP], price: cs.price, badge: cs.badge, photo: ctx.photos["feed-" + (i + 1)], t0: t0, t1: tFeedEnd, name: "S05 feed card " + (i + 1) });
    if (cs.deep) { setv(c.scale, [92, 92]); }
    c.parent = feed;   // 카드 널을 피드 널 아래로 묶는다 (parent 대입은 시각 위치를 보존하며 상대 좌표로 환산된다)
  }
  // 주인공: 한 번의 긴 스크롤 y 1300→-500 (10.30→13.30, inout)
  moveTo(feed, t0, tScrollStop, [540, -620 - SAFE_UP], "inout");
  shake(tShake, { amount: 0.5 });
  // 13.44: 피드만 위로 빠져나간다 (dur 0.2 → 13.64 컷). 가사·고스트는 t1 13.44 하드컷.
  slideOut(feed, t1, "up", { dist: feedOutDist, dur: feedOutDur });

  // ---------- 가사 밑 캡션 띠 (r02 검수: 카드 스켈레톤 줄·가격 알약이 가사를 관통해 읽기 어려움) ----------
  var band = rect({ w: W, h: 330, color: COL.black, pos: [540, 1545 - SAFE_UP], t0: t0, t1: t1, name: "S05 caption band" });
  band.opacity.setValue(80);

  // ---------- 가사 (피드보다 위) ----------
  // 폭 어림(§0.10, Noto Sans KR 1자 ≈ 0.95 × 92 ≈ 87px, 공백도 1자로 상한 계산):
  //   1행 "스크롤"(3자 ≈ 262) + 28 + "한 번이면"(5자 ≈ 437) ≈ 727px ≤ 920 ✓  (x 100 시작 → 끝 ≈ 827 < 1000 안전영역)
  //   2행 "서울이"(3자 ≈ 262) + 28 + "문 앞에"(4자 ≈ 350) ≈ 640px ≤ 920 ✓
  var LX = 100;   // 첫 단어 x — SPEC 미명시, 안전영역(x ≥ 80) 안에서 선택
  var w1 = lyric("스크롤", LX, 1480 - SAFE_UP, T.scroll, COL.white, "S05 lyric 1 스크롤");
  var w2 = lyric("한 번이면", nextX(w1, T.scrollW2), 1480 - SAFE_UP, T.scrollW2, COL.white, "S05 lyric 2 한 번이면");
  var w3 = lyric("서울이", LX, 1600 - SAFE_UP, T.scrollW3, COL.lime, "S05 lyric 3 서울이");
  var w4 = lyric("문 앞에", nextX(w3, T.scrollW4), 1600 - SAFE_UP, T.scrollW4, COL.white, "S05 lyric 4 문 앞에");
  // 이중 표기: 2행 시작에 맞춰 한 줄로. 폭 어림 31자 × 0.62 × 32 ≈ 615 + tracking 200(6.4px × 30) ≈ 807px → x 100~907, 캡션 띠(1380~1710) 안
  gloss("ONE SCROLL. SEOUL AT YOUR DOOR.", { pos: [LX, 1686 - SAFE_UP], anchor: "left", justify: "left", size: 32, tracking: 200, t0: T.scrollW3, t1: t1, name: "S05 gloss" });
});
