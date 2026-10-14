// ===== 스모크 테스트 장면: 모든 헬퍼를 한 번씩 호출하고 0~3초만 렌더한다 =====
// 빌드: python marketing/launch-teaser/build.py smoke --only 99-run.jsx --extra marketing/launch-teaser/smoke/smoke-scene.jsx
var RENDER_SPAN = [0, 3];
scene("SMOKE", 0, 3, function (ctx) {
  var t0 = 0, t1 = 3;
  log("smoke: fonts " + FONT.en + " / " + FONT.enMid + " / " + FONT.ko + " · banner=" + (ctx.banner ? "ok" : "null"));

  // 배경: 배너 듀오톤 + 비트 반응 원
  if (ctx.banner) {
    var im = image(ctx.banner, { scale: 250, pos: [640, 960], t0: t0, t1: t1, name: "SMK banner" });
    tint(im, COL.black, COL.purple, 100); im.opacity.setValue(50); blend(im, "SCREEN");
    setKeys(im.position, [[t0, [640, 960]], [t1, [440, 960]]], "linear");
  }
  var circ = ellipse({ w: 1400, h: 1400, color: COL.purple, pos: [540, 1000], t0: t0, t1: t1, name: "SMK circle" });
  beatOpacity(circ, 8, 40);

  // 고스트 아웃라인 텍스트 (가로 이동)
  var ghost = text("DISCOVER", { font: "en", size: 260, fillNone: true, stroke: { color: COL.white, width: 4 }, pos: [-300, 1250], t0: t0, t1: t1, name: "SMK ghost" });
  ghost.opacity.setValue(35);
  setKeys(ghost.position, [[t0, [-300, 1250]], [t1, [1380, 1250]]], "linear");

  // 주인공: 로고 impactIn + rgbSplit + shake + glow + beatScale
  var hero = text("POTATA", { font: "en", size: 240, tracking: -40, vscale: 110, pos: [540, 760], t0: 0.1, t1: t1, name: "SMK hero" });
  impactIn(hero, 0.1); rgbSplit(hero, 0.1, { frames: 3, offset: 20 }); shake(0.1, { amount: 1.2 });
  glow(hero, { radius: 70, intensity: 0.9 }); beatScale(hero, 6);

  // 한글 + 취소선
  var ko = text("밤티 말고", { size: 120, pos: [540, 1000], t0: 0.4, t1: t1, name: "SMK ko" });
  impactIn(ko, 0.4); strike(ko, 0.7, { color: COL.purple, thick: 16 });

  // 스태거 / 타이프온 / 스태거아웃 / 카운터
  var st = text("STAGGER WORDS HERE", { font: "enMid", size: 48, tracking: 300, pos: [540, 1380], t0: 0.5, t1: t1, name: "SMK stagger" });
  staggerIn(st, 0.5, { by: "words", dur: 0.5, dist: 80 }); staggerOut(st, 2.4, { dur: 0.3 });
  var ty = text("NOW LOADING", { font: "en", size: 40, tracking: 500, color: COL.lime, pos: [540, 1460], t0: 0.3, t1: t1, name: "SMK typeOn" });
  typeOn(ty, 0.3, 0.4);
  counter(0, 100, 0.3, 2.0, { font: "en", size: 32, color: COL.lime, pos: [900, 1520], t1: t1, name: "SMK counter" });

  // 로딩바 (anchor left + scale X)
  rect({ w: 640, h: 8, color: COL.gray2, pos: [220, 1520], anchor: "left", t0: 0.3, t1: t1, name: "SMK track" });
  var fill = rect({ w: 640, h: 8, color: COL.lime, pos: [220, 1520], anchor: "left", t0: 0.3, t1: t1, name: "SMK fill" });
  setKeys(fill.scale, [[0.3, [0, 100]], [2.0, [100, 100]]], "out");

  // 카드 / 알약 / 아이콘 / 화살표 / 스캔라인
  var cd = card({ w: 320, h: 400, pos: [230, 1620], t0: 0.6, t1: t1, name: "SMK card", price: "AED 149", badge: "NEW" });
  slideIn(cd, 0.6, "left", { dist: 500 });
  var pl = pill("SHOP", { pos: [600, 1560], color: COL.lime, textColor: COL.black, t0: 0.8, t1: t1, name: "SMK pill" });
  slideIn(pl, 0.8, "right", { dist: 400 });
  var pl2 = pill("BRANDS", { pos: [840, 1560], stroke: { color: COL.white, width: 2 }, t0: 0.9, t1: t1, name: "SMK pill2" });
  slideIn(pl2, 0.9, "right", { dist: 400 });
  var hb = icon("heart", { pos: [560, 1740], size: 120, color: COL.lime, t0: 1.0, t1: t1, name: "SMK heart" });
  popIn(hb, 1.0); pulse(hb, 1.8, { amount: 1.15 });
  var bb = icon("bubble", { pos: [720, 1740], size: 90, color: COL.purple, t0: 1.2, t1: t1, name: "SMK bubble" });
  popIn(bb, 1.2);
  var pp = icon("plus", { pos: [880, 1740], size: 90, color: COL.lime, t0: 1.4, t1: t1, name: "SMK plus" });
  popIn(pp, 1.4); popOut(pp, 2.5);
  arrow(1.0, 1.5, { x0: 150, x1: 930, y: 1180, color: COL.lime, thick: 12, head: 80, t1: t1 });
  scanline(0.5, 1.5, { x: 540, w: 600, yFrom: 520, yTo: 1480 });

  // 3D 카드 틸트 + moveTo/scaleTo/rotateTo
  var r3 = rect({ w: 300, h: 180, r: 24, color: COL.gray, pos: [860, 420], t0: 0.2, t1: t1, name: "SMK 3d" });
  make3D(r3); rotX(r3).setValue(12);
  rotateTo(r3, 0.2, 2.0, 0, 20); moveTo(r3, 0.2, 2.0, [760, 420]); scaleTo(r3, 0.2, 1.0, 80, 100);

  // 슬라이드 인/아웃, 페이드 인/아웃
  var so = text("SLIDE", { font: "en", size: 80, pos: [200, 300], t0: 0.2, t1: t1, name: "SMK slide" });
  slideIn(so, 0.2, "up", { dist: 300 }); slideOut(so, 2.0, "left", { dist: 500 });
  var fo = text("FADE", { font: "en", size: 80, pos: [540, 300], t0: 0.2, t1: t1, name: "SMK fade" });
  fadeIn(fo, 0.2, 0.3); fadeOut(fo, 2.0, 0.3);

  // 전면 솔리드 + 검정 글씨 + 플래시
  solid(COL.lime, 2.7, 3.0, "SMK lime solid");
  var lg = text("LET'S GO!", { font: "en", size: 200, color: COL.black, vscale: 115, pos: [540, 960], t0: 2.7, t1: 3.0, name: "SMK letsgo" });
  impactIn(lg, 2.7, { from: 120 }); rgbSplit(lg, 2.7, { frames: 3, offset: 22 });
  flash(COL.white, 1.5, { peak: 60, dur: 0.1 });
  log("smoke: built");
});
