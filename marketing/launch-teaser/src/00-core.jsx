/* =====================================================================
 * potata 런칭 티저 — After Effects 2026 ExtendScript (ES3 문법만!)
 * 00-core.jsx : 상수 · 타이밍표 · 헬퍼 API (SSoT)
 *
 * 장면 파일(10-*.jsx 등)은 이 파일의 헬퍼만 사용한다.
 * 빌드: python build.py → build-teaser.jsx (ASCII 이스케이프 + RUN_ID 주입)
 * 실행: AfterFX.exe -r build-teaser.jsx
 * ===================================================================== */

// ---------- 경로 (빌드 시 RUN_ID 가 앞에 주입됨) ----------
if (typeof RUN_ID === "undefined") { var RUN_ID = "dev"; }
var OUT_DIR = "C:/Users/jangk/Downloads/potata-teaser";
var AUDIO_PATH = "C:/Users/jangk/Downloads/밤티 말고 Potata (1).wav";
var BANNER_PATH = "C:/Users/jangk/Projects/Coding/potata/public/home-banner.jpg";
// AI 생성 모델 사진(Higgsfield Soul 2.0) — 카드 이미지 영역을 채운다. 없으면 회색 카드로 그리고 로그에 남긴다.
var PHOTO_DIR = "C:/Users/jangk/Projects/Coding/potata/marketing/launch-teaser/photos";
var PHOTO_NAMES = ["feed-1", "feed-2", "feed-3", "feed-4", "tryon", "style-1", "style-2", "style-3", "style-4", "share"];
var RENDER_ON_ERROR = false;   // 장면 오류가 있으면 렌더하지 않고 로그만 남긴다

// ---------- 캔버스 ----------
var W = 1080, H = 1920, FPS = 30, DUR = 40.88, CX = 540, CY = 960;
var FD = 1 / FPS;
function f(n) { return n * FD; }          // n프레임 → 초

// ---------- 색 (0~1 RGB) ----------
var COL = {
  black:  [0.020, 0.020, 0.020],   // #050505 배경
  white:  [0.961, 0.961, 0.969],   // #F5F5F7 전경
  lime:   [0.800, 0.953, 0.506],   // #CCF381 brand-neon
  purple: [0.545, 0.361, 0.965],   // #8B5CF6 primary
  gray:   [0.102, 0.102, 0.110],   // #1A1A1C UI 카드
  gray2:  [0.180, 0.180, 0.200],   // #2E2E33 UI 카드 보조
  gray3:  [0.420, 0.420, 0.450],   // #6B6B73 비활성 텍스트
  red:    [1.000, 0.100, 0.200],   // RGB split 전용
  cyan:   [0.000, 0.900, 1.000]    // RGB split 전용
};

// ---------- 타이밍표 (초) — 가사 단어 타임스탬프 + 강한 온셋 기준 ----------
var T = {
  // [Intro - chant] Seoul! (Now loading) / UAE! (Now loading) / Po-ta-ta! (Let's go!)
  seoul: 0.00, loading1: 0.62, uaeU: 2.20, uaeA: 2.72, uaeE: 3.14, loading2: 3.62, loadingDone: 4.28,
  po1: 4.74, ta1: 4.95, ta2: 5.16, letsGo: 5.80, introEnd: 6.44,
  // [Verse] K-fashion? Too far? Not anymore / 스크롤 한 번이면 서울이 문 앞에 / Discover 툭 / Try it on 톡 / Style it 짠 / Share it pop
  kfashion: 7.00, tooFar: 8.28, strike: 8.66, notAnymore: 9.00,
  scroll: 10.30, scrollW2: 10.78, scrollW3: 11.78, scrollW4: 12.24, scrollEnd: 13.44,
  discover: 13.44, tuk: 13.96, tryItOn: 14.44, tok: 15.18, styleIt: 15.42, zzan: 16.00,
  shareIt: 16.26, pop1: 17.40, pop2: 17.80, verseEnd: 18.46,
  // [Hook] 밤티 말고 Potata! (Po-ta-ta!) x2 / Seoul to Dubai, 오늘은 Potata / 밤티 말고 Potata! (Yeah!)
  hook1: 18.46, hook1b: 18.82, hook1Potata: 19.20, resp1a: 20.60, resp1b: 20.81, resp1c: 21.02,
  hook2: 21.38, hook2b: 22.26, hook2Potata: 22.58, resp2a: 23.80, resp2b: 24.05, resp2c: 24.45,
  seoulTo: 24.72, dubai: 25.44, today: 25.88, todayPotata: 26.58,
  hook3: 28.00, hook3b: 29.12, hook3Potata: 29.46, yeah: 31.46, yeahEnd: 32.34,
  // [Outro] Follow the build… / Po-ta-ta! (빠밤!)
  follow: 32.34, the: 32.74, build: 33.14, buildEnd: 33.58,
  oPo: 33.88, oTa1: 34.53, oTa2: 35.60, bbam1: 37.31, bbam2: 37.94, finalHit: 39.66, end: 40.88
};
var BPM = 143.55, BEAT = 60 / BPM, BAR = BEAT * 4;
var BEATS = [0.046, 0.464, 0.882, 1.3, 1.741, 2.206, 2.624, 3.042, 3.46, 3.901, 4.319, 4.737, 5.155, 5.596, 6.037, 6.455, 6.896, 7.314, 7.755, 8.173, 8.615, 9.033, 9.451, 9.892, 10.333, 10.751, 11.169, 11.61, 12.028, 12.469, 12.887, 13.328, 13.746, 14.164, 14.605, 15.023, 15.441, 15.882, 16.3, 16.742, 17.16, 17.578, 18.019, 18.46, 18.901, 19.296, 19.737, 20.178, 20.596, 21.037, 21.455, 21.873, 22.314, 22.732, 23.174, 23.615, 24.033, 24.451, 24.892, 25.31, 25.751, 26.169, 26.61, 27.028, 27.469, 27.887, 28.328, 28.746, 29.164, 29.605, 30.023, 30.465, 30.883, 31.324, 31.742, 32.183, 32.624, 33.042, 33.46, 33.878, 34.319, 34.737, 35.178, 35.596, 36.037, 36.455, 36.897, 37.314, 37.756, 38.174, 38.615, 39.033, 39.474, 39.892, 40.31];

// ---------- 컨텍스트 / 장면 등록 ----------
var ctx = { comp: null, cam: null, ctrl: null, beat: null, shakeSlider: null, audio: null, banner: null, bg: null, log: [], errors: 0 };
var SCENES = [];
/** scene(name, from, to, fn) — 장면 파일이 호출해 등록. fn(ctx) 안에서 레이어를 만든다. */
function scene(name, from, to, fn) { SCENES.push({ name: name, from: from, to: to, fn: fn }); }
function log(msg) { ctx.log.push(String(msg)); try { $.writeln(msg); } catch (e) {} }
function merge(a, b) { var o = {}, k; for (k in a) { if (a.hasOwnProperty(k)) { o[k] = a[k]; } } for (k in b) { if (b.hasOwnProperty(k)) { o[k] = b[k]; } } return o; }
function rgba(c) { return [c[0], c[1], c[2], 1]; }
function hasHangul(s) { for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); if (c >= 0xAC00 && c <= 0xD7A3) { return true; } } return false; }

// ---------- 폰트 ----------
var FONT = { en: "Outfit-ExtraBold", enMid: "Outfit-SemiBold", ko: "NotoSansKR-Black" };
function pickFont(cands) {
  try {
    if (app.fonts && app.fonts.getFontsByPostScriptName) {
      for (var i = 0; i < cands.length; i++) { var arr = app.fonts.getFontsByPostScriptName(cands[i]); if (arr && arr.length > 0) { return cands[i]; } }
    }
  } catch (e) { log("pickFont: " + e); }
  return cands[0];
}
function resolveFonts() {
  FONT.en = pickFont(["Outfit-ExtraBold", "Outfit-Black", "Outfit-Bold", "Impact", "Arial-BoldMT"]);
  FONT.enMid = pickFont(["Outfit-SemiBold", "Outfit-Medium", "Outfit-Bold", "Outfit-ExtraBold", "Arial-BoldMT"]);
  FONT.ko = pickFont(["NotoSansKR-Black", "NotoSansKR-ExtraBold", "NotoSansKR-Bold", "NotoSansCJKkr-Black", "MalgunGothicBold", "MalgunGothic"]);
  log("FONT en=" + FONT.en + " enMid=" + FONT.enMid + " ko=" + FONT.ko);
}
function fontFor(key) { if (key === "en") { return FONT.en; } if (key === "ko") { return FONT.ko; } if (key === "enMid") { return FONT.enMid; } return key; }

// ---------- 값/키프레임 기본 ----------
function dims(prop) { var v = prop.value; return (v instanceof Array) ? v.length : 1; }
function pad(prop, v) {
  if (!(v instanceof Array)) { return v; }
  var n = dims(prop); if (v.length >= n) { return v; }
  var out = v.slice(0); var fill = (prop.matchName === "ADBE Scale") ? 100 : 0;
  while (out.length < n) { out.push(fill); }
  return out;
}
function setv(prop, v) { prop.setValue(pad(prop, v)); }
function key(prop, t, v) { prop.setValueAtTime(t, pad(prop, v)); return prop.nearestKeyIndex(t); }
function clampInf(x) { return Math.max(0.1, Math.min(100, x)); }
function easeKey(prop, idx, inInf, outInf) {
  if (inInf === undefined) { inInf = 75; } if (outInf === undefined) { outInf = 75; }
  var ki = new KeyframeEase(0, clampInf(inInf)), ko = new KeyframeEase(0, clampInf(outInf));
  var tries = [dims(prop), 1, 2, 3], i, j;
  for (i = 0; i < tries.length; i++) {
    var n = tries[i], a = [], b = [];
    for (j = 0; j < n; j++) { a.push(ki); b.push(ko); }
    try {
      prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
      prop.setTemporalEaseAtKey(idx, a, b);
      return;
    } catch (e) {}
  }
}
function holdKey(prop, idx) { try { prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD); } catch (e) {} }
/** propAny(group, [matchName 또는 표시명 ...]) — 첫 번째로 존재하는 속성을 돌려준다(버전별 matchName 차이 흡수) */
function propAny(group, names) {
  for (var i = 0; i < names.length; i++) { var p = null; try { p = group.property(names[i]); } catch (e) { p = null; } if (p) { return p; } }
  throw new Error("property not found: " + names.join(" / "));
}
function linearSpatial(prop) {
  try {
    if (!prop.isSpatial) { return; }
    var n = dims(prop), z = (n === 3) ? [0, 0, 0] : [0, 0];
    for (var i = 1; i <= prop.numKeys; i++) { prop.setSpatialTangentsAtKey(i, z, z); }
  } catch (e) {}
}
/**
 * setKeys(prop, [[t, v], ...], mode, inf)
 *  mode: "out"(급출발→감속, 기본) | "in"(가속→급정지) | "inout" | "linear" | "hold"
 */
function setKeys(prop, keys, mode, inf) {
  mode = mode || "out"; inf = inf || 75; var idxs = [], i;
  for (i = 0; i < keys.length; i++) { idxs.push(key(prop, keys[i][0], keys[i][1])); }
  for (i = 0; i < idxs.length; i++) {
    var first = (i === 0), last = (i === idxs.length - 1);
    if (mode === "hold") { holdKey(prop, idxs[i]); }
    else if (mode === "linear") { try { prop.setInterpolationTypeAtKey(idxs[i], KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR); } catch (e) {} }
    else {
      var inInf = inf, outInf = inf;
      if (mode === "out") { if (first) { outInf = 0.1; } if (last) { inInf = 88; } }
      else if (mode === "in") { if (first) { outInf = 88; } if (last) { inInf = 0.1; } }
      easeKey(prop, idxs[i], inInf, outInf);
    }
  }
  linearSpatial(prop);
  return idxs;
}

// ---------- 레이어 공통 ----------
function setRange(layer, t0, t1) {
  if (t0 === undefined || t0 === null) { t0 = 0; } if (t1 === undefined || t1 === null) { t1 = DUR; }
  if (t1 > DUR) { t1 = DUR; } if (t0 < 0) { t0 = 0; } if (t1 <= t0) { t1 = t0 + FD; }
  // AE 는 inPoint 를 바꿀 때 레이어 길이를 유지하며 outPoint 를 밀어낸다(r02 에서 글리치 복제본이 0.72s 살아남은 원인).
  // 그래서 먼저 자리를 넉넉히 만든 뒤 반드시 in → out 순서로 확정한다.
  if (t0 >= layer.outPoint) { layer.outPoint = t0 + Math.max(FD, t1 - t0) + 1; }
  layer.inPoint = t0; layer.outPoint = t1;
}
function attach(layer, o) {
  o = o || {};
  if (o.parentLayer) { layer.parent = o.parentLayer; }
  else if (o.parent !== false) { layer.parent = ctx.cam; }
}
function cutAt(L, t) { if (t < L.outPoint) { L.outPoint = t; } }
function fadeIn(L, t, dur) { setKeys(L.opacity, [[t, 0], [t + (dur || f(4)), 100]], "linear"); }
function fadeOut(L, t, dur, keep) { dur = dur || f(4); setKeys(L.opacity, [[t, 100], [t + dur, 0]], "linear"); if (!keep) { cutAt(L, t + dur); } }
function make3D(L) { L.threeDLayer = true; return L; }
/** xform(L, matchName) — Transform 그룹 속성. layer.property("ADBE Rotate X") 는 null 을 돌려주므로 반드시 이걸 쓴다 */
function xform(L, matchName) { return propAny(L.property("ADBE Transform Group"), [matchName]); }
function rotX(L) { return xform(L, "ADBE Rotate X"); }
function rotY(L) { return xform(L, "ADBE Rotate Y"); }
/** bbox(L, t) → 월드 좌표 박스 {left, top, width, height, cx, cy} (회전 무시) */
function bbox(L, t) {
  var r = L.sourceRectAtTime(t, false), p = L.position.valueAtTime(t, false), a = L.anchorPoint.valueAtTime(t, false), s = L.scale.valueAtTime(t, false);
  var sx = s[0] / 100, sy = s[1] / 100;
  var left = p[0] + (r.left - a[0]) * sx, top = p[1] + (r.top - a[1]) * sy, w = r.width * sx, h = r.height * sy;
  return { left: left, top: top, width: w, height: h, cx: left + w / 2, cy: top + h / 2 };
}

// ---------- 텍스트 ----------
/**
 * text(str, o) — 텍스트 레이어. 앵커는 글자 박스 기준(기본 중앙)으로 맞춰지므로 pos 가 곧 글자 중심이다.
 * o: { font:"en"|"enMid"|"ko"|<PostScript명>(생략 시 한글 포함이면 ko), size, color, pos:[x,y], t0, t1, name,
 *      tracking(1/1000em), justify:"center"|"left"|"right", anchor:"center"|"left"|"right"|"top"|"bottom"|"topleft",
 *      stroke:{color,width}, fillNone:true(아웃라인 전용), leading, vscale(세로 비율 %, condensed 느낌), parent:false, parentLayer }
 * 줄바꿈은 "\r".
 */
function text(str, o) {
  o = o || {};
  var L = ctx.comp.layers.addText(str);
  L.name = o.name || ("T " + str.substr(0, 18));
  var tp = L.property("ADBE Text Properties").property("ADBE Text Document");
  var td = tp.value;
  td.font = fontFor(o.font || (hasHangul(str) ? "ko" : "en"));
  td.fontSize = o.size || 120;
  td.applyFill = !o.fillNone;
  if (!o.fillNone) { td.fillColor = o.color || COL.white; }
  if (o.stroke) { td.applyStroke = true; td.strokeColor = o.stroke.color || COL.white; td.strokeWidth = o.stroke.width || 4; td.strokeOverFill = false; } else { td.applyStroke = false; }
  td.tracking = (o.tracking === undefined) ? 0 : o.tracking;
  var j = o.justify || "center";
  td.justification = (j === "left") ? ParagraphJustification.LEFT_JUSTIFY : ((j === "right") ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY);
  if (o.leading) { try { td.autoLeading = false; td.leading = o.leading; } catch (e1) {} }
  if (o.vscale) { try { td.verticalScale = o.vscale; } catch (e2) {} }
  tp.setValue(td);
  var t0 = o.t0 || 0;
  var r = L.sourceRectAtTime(t0, false);
  var ax = r.left + r.width / 2, ay = r.top + r.height / 2, an = o.anchor || "center";
  if (an === "left") { ax = r.left; } else if (an === "right") { ax = r.left + r.width; }
  else if (an === "top") { ay = r.top; } else if (an === "bottom") { ay = r.top + r.height; }
  else if (an === "topleft") { ax = r.left; ay = r.top; }
  setv(L.anchorPoint, [ax, ay]);
  setv(L.position, o.pos || [CX, CY]);
  L.motionBlur = true;
  setRange(L, o.t0, o.t1);
  attach(L, o);
  return L;
}
/** counter(from, to, t0, t1, o) — 숫자 카운트업 텍스트 (o.suffix 기본 "%") */
function counter(from, to, t0, t1, o) {
  o = o || {}; var suffix = (o.suffix === undefined) ? "%" : o.suffix;
  var L = text(String(to) + suffix, merge({ t0: t0 }, o));
  L.property("ADBE Text Properties").property("ADBE Text Document").expression =
    "Math.round(linear(time, " + t0 + ", " + t1 + ", " + from + ", " + to + ")) + \"" + suffix + "\"";
  return L;
}

// ---------- 도형 ----------
function shapeBase(name, o) { var L = ctx.comp.layers.addShape(); L.name = name; setv(L.position, o.pos || [CX, CY]); L.motionBlur = true; return L; }
function anchorOffset(o) {
  var w = o.w || 100, h = o.h || 100, an = o.anchor || "center";
  if (an === "left") { return [w / 2, 0]; } if (an === "right") { return [-w / 2, 0]; }
  if (an === "top") { return [0, h / 2]; } if (an === "bottom") { return [0, -h / 2]; }
  if (an === "topleft") { return [w / 2, h / 2]; }
  return [0, 0];
}
function addFillStroke(grp, o) {
  var g = grp.property("ADBE Vectors Group");
  if (!o.noFill) { var fl = g.addProperty("ADBE Vector Graphic - Fill"); fl.property("ADBE Vector Fill Color").setValue(rgba(o.color || COL.white)); }
  if (o.stroke) { var st = g.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue(rgba(o.stroke.color || COL.white)); st.property("ADBE Vector Stroke Width").setValue(o.stroke.width || 4); }
}
/** rect(o): { w, h, r(둥글기), color, stroke:{color,width}, noFill, pos, anchor, t0, t1, name, parent, parentLayer } — pos 는 앵커 지점의 월드 좌표 */
function rect(o) {
  o = o || {};
  var L = shapeBase(o.name || "Rect", o);
  var grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
  var rc = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
  rc.property("ADBE Vector Rect Size").setValue([o.w || 100, o.h || 100]);
  rc.property("ADBE Vector Rect Position").setValue(anchorOffset(o));
  rc.property("ADBE Vector Rect Roundness").setValue(o.r || 0);
  addFillStroke(grp, o);
  setRange(L, o.t0, o.t1); attach(L, o); return L;
}
/** ellipse(o): { w, h, color, stroke, noFill, pos, t0, t1, name } */
function ellipse(o) {
  o = o || {};
  var L = shapeBase(o.name || "Ellipse", o);
  var grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
  var el = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
  el.property("ADBE Vector Ellipse Size").setValue([o.w || 100, o.h || o.w || 100]);
  el.property("ADBE Vector Ellipse Position").setValue(anchorOffset(o));
  addFillStroke(grp, o);
  setRange(L, o.t0, o.t1); attach(L, o); return L;
}
/** solid(color, t0, t1, name) — 전체 화면 솔리드. 카메라 흔들림에 영향받지 않도록 parent 없음 */
function solid(color, t0, t1, name) { var L = ctx.comp.layers.addSolid(color, name || "Solid", W, H, 1, DUR); setRange(L, t0, t1); return L; }
/** image(item, o) — 푸티지 레이어. o:{pos, scale, t0, t1, name} */
function image(item, o) {
  o = o || {}; var L = ctx.comp.layers.add(item); L.name = o.name || "Image";
  setv(L.position, o.pos || [CX, CY]); if (o.scale) { setv(L.scale, [o.scale, o.scale]); }
  L.motionBlur = true; setRange(L, o.t0, o.t1); attach(L, o); return L;
}
/** roundRectShape(x, y, w, h, r) — 마스크용 둥근 사각형 Shape (레이어 좌표, 시계 방향) */
function roundRectShape(x, y, w, h, r) {
  var k = r * 0.5523, sh = new Shape();
  sh.vertices = [[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r], [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r]];
  sh.inTangents = [[-k, 0], [0, 0], [0, -k], [0, 0], [k, 0], [0, 0], [0, k], [0, 0]];
  sh.outTangents = [[0, 0], [k, 0], [0, 0], [0, k], [0, 0], [-k, 0], [0, 0], [0, -k]];
  sh.closed = true; return sh;
}
/**
 * photoBox(item, o) — 사진을 w×h 창에 cover 로 채우고 둥근 사각형 마스크로 자른다 → 레이어 반환.
 * o:{w, h, r, pos(창 중심 월드 좌표), focusY(0~1, 창 중심이 올 사진 세로 위치 · 기본 0.35 = 얼굴 쪽), t0, t1, name, parentLayer}
 */
function photoBox(item, o) {
  var w = o.w, h = o.h, r = o.r || 0, iw = item.width, ih = item.height;
  var s = Math.max(w / iw, h / ih);                 // cover 배율: 창을 빈틈없이 덮는 최소 배율
  var hw = w / s / 2, hh = h / s / 2;               // 창 반폭·반높이(레이어 좌표)
  var fy = (o.focusY === undefined) ? 0.35 : o.focusY;
  var ay = Math.min(Math.max(ih * fy, hh), ih - hh); // 창이 사진 밖으로 나가지 않게 고정
  var L = image(item, { pos: o.pos, scale: s * 100, t0: o.t0, t1: o.t1, name: o.name || "Photo", parentLayer: o.parentLayer });
  setv(L.anchorPoint, [iw / 2, ay]);                // 앵커 = 창 중심 → position 이 곧 창 중심
  L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom").property("ADBE Mask Shape").setValue(roundRectShape(iw / 2 - hw, ay - hh, hw * 2, hh * 2, r / s));
  return L;
}
/**
 * photoFlash(item, t, dur, o) — 비트에 맞춘 전면 사진 하드컷 → 사진 레이어. 뒤에 깔리도록 글자보다 먼저 만든다.
 * 흔들림에 가장자리가 드러나지 않게 6% 크게 채우고, 검정 막(o.dim, 기본 45)으로 어둡게 해 위 글자가 읽히게 한다. 1.08→1.00 짧은 줌.
 */
function photoFlash(item, t, dur, o) {
  o = o || {}; var nm = o.name || "Photo flash";
  if (!item) { log(nm + ": 사진 없음 — 하드컷 생략"); return null; }
  var L = photoBox(item, { w: W * 1.06, h: H * 1.06, r: 0, pos: [CX, CY], focusY: 0.4, t0: t, t1: t + dur, name: nm });
  var s = L.scale.value[0];
  setKeys(L.scale, [[t, [s * 1.08, s * 1.08]], [t + dur, [s, s]]], "out");
  var d = rect({ w: W * 1.2, h: H * 1.2, color: COL.black, pos: [CX, CY], t0: t, t1: t + dur, name: nm + " dim" });
  d.opacity.setValue((o.dim === undefined) ? 45 : o.dim);
  return L;
}
/** group(name, pos, t0, t1) — 널 컨트롤러. 자식은 parentLayer 로 붙이고, 이 널을 움직이면 묶음이 움직인다 */
function group(name, pos, t0, t1) {
  var N = ctx.comp.layers.addNull(DUR); N.name = name; setv(N.anchorPoint, [0, 0]); setv(N.position, pos || [CX, CY]);
  setRange(N, t0, t1); N.parent = ctx.cam; return N;
}

// ---------- UI 조각 ----------
/** pill(label, o): 알약 버튼(도형+텍스트) → 널 반환. o:{pos, h:56, padX:28, size:24, color(배경), textColor, stroke, t0, t1, name, font} */
function pill(label, o) {
  o = o || {}; var h = o.h || 56, size = o.size || 24, p = o.pos || [CX, CY];
  var N = group((o.name || ("Pill " + label)) + " ctrl", p, o.t0, o.t1);
  var tmp = text(label, { font: o.font || "en", size: size, color: o.textColor || COL.white, pos: p, t0: o.t0, t1: o.t1, tracking: (o.tracking === undefined) ? 40 : o.tracking, parentLayer: N, name: "pill text " + label });
  var r = tmp.sourceRectAtTime(o.t0 || 0, false);
  var w = r.width + 2 * (o.padX || 28);
  var bgL = rect({ w: w, h: h, r: h / 2, color: o.color || COL.gray, noFill: !o.color && !!o.stroke, stroke: o.stroke, pos: p, t0: o.t0, t1: o.t1, parentLayer: N, name: "pill bg " + label });
  bgL.moveAfter(tmp);
  return N;
}
/**
 * card(o): 상품/OOTD 카드 묶음(널+도형) → 널 반환.
 * o:{w:440, h:560, pos, t0, t1, name, price:"AED 149", badge:"NEW", color, imgColor, accent(COL.lime), photo(푸티지), focusY}
 */
function card(o) {
  o = o || {}; var w = o.w || 440, h = o.h || 560, p = o.pos || [CX, CY], nm = o.name || "Card";
  var N = group(nm + " ctrl", p, o.t0, o.t1);
  var base = { t0: o.t0, t1: o.t1, parentLayer: N };
  rect(merge(base, { w: w, h: h, r: 28, color: o.color || COL.gray, pos: p, name: nm + " body" }));
  var imgH = Math.round(h * 0.62);
  rect(merge(base, { w: w - 24, h: imgH, r: 20, color: o.imgColor || COL.gray2, pos: [p[0], p[1] - h / 2 + 12 + imgH / 2], name: nm + " img" }));
  if (o.photo) { photoBox(o.photo, merge(base, { w: w - 24, h: imgH, r: 20, pos: [p[0], p[1] - h / 2 + 12 + imgH / 2], focusY: o.focusY, name: nm + " photo" })); }
  rect(merge(base, { w: Math.round(w * 0.58), h: 16, r: 8, color: COL.white, pos: [p[0] - w / 2 + 24, p[1] + h / 2 - 112], anchor: "left", name: nm + " line1" }));
  rect(merge(base, { w: Math.round(w * 0.36), h: 12, r: 6, color: COL.gray3, pos: [p[0] - w / 2 + 24, p[1] + h / 2 - 80], anchor: "left", name: nm + " line2" }));
  if (o.price) {
    var pw = 150, ph = 44, px = p[0] + w / 2 - 24 - pw / 2, py = p[1] + h / 2 - 48;
    rect(merge(base, { w: pw, h: ph, r: ph / 2, color: o.accent || COL.lime, pos: [px, py], name: nm + " price bg" }));
    text(o.price, merge(base, { font: "en", size: 22, color: COL.black, pos: [px, py], tracking: 20, name: nm + " price" }));
  }
  if (o.badge) {
    var bw = 92, bh = 36, bx = p[0] - w / 2 + 24 + bw / 2, by = p[1] - h / 2 + 24 + bh / 2;
    rect(merge(base, { w: bw, h: bh, r: 8, color: COL.purple, pos: [bx, by], name: nm + " badge bg" }));
    text(o.badge, merge(base, { font: "en", size: 20, color: COL.white, pos: [bx, by], tracking: 60, name: nm + " badge" }));
  }
  return N;
}
/** icon(kind, o): "heart" | "bubble" | "plus" | "dot" → 널 반환. o:{pos, size:120, color, t0, t1, name} */
function icon(kind, o) {
  o = o || {}; var s = o.size || 120, p = o.pos || [CX, CY], c = o.color || COL.lime;
  var N = group((o.name || ("Icon " + kind)) + " ctrl", p, o.t0, o.t1);
  var base = { t0: o.t0, t1: o.t1, parentLayer: N };
  if (kind === "heart") { text("\u2665", merge(base, { font: "ko", size: s, color: c, pos: p, name: "heart" })); }
  else if (kind === "bubble") {
    ellipse(merge(base, { w: s, h: s * 0.82, color: c, pos: p, name: "bubble" }));
    ellipse(merge(base, { w: s * 0.26, h: s * 0.26, color: c, pos: [p[0] - s * 0.34, p[1] + s * 0.36], name: "bubble tail" }));
  }
  else if (kind === "plus") {
    ellipse(merge(base, { w: s, h: s, color: c, pos: p, name: "plus bg" }));
    rect(merge(base, { w: s * 0.5, h: s * 0.1, r: s * 0.05, color: COL.black, pos: p, name: "plus h" }));
    rect(merge(base, { w: s * 0.1, h: s * 0.5, r: s * 0.05, color: COL.black, pos: p, name: "plus v" }));
  }
  else { ellipse(merge(base, { w: s, h: s, color: c, pos: p, name: "dot" })); }
  return N;
}
/** arrow(t0, t1, o): 왼→오로 그려지는 화살표(선+촉). o:{x0, x1, y, color, thick:10, head:70} → 널 반환 */
function arrow(t0, t1, o) {
  o = o || {}; var x0 = o.x0 || 140, x1 = o.x1 || 940, y = o.y || CY, th = o.thick || 10, hd = o.head || 70, c = o.color || COL.lime;
  var N = group("Arrow ctrl", [x0, y], t0, o.t1);
  var base = { t0: t0, t1: o.t1, parentLayer: N };
  var line = rect(merge(base, { w: x1 - x0, h: th, r: th / 2, color: c, pos: [x0, y], anchor: "left", name: "arrow line" }));
  setKeys(line.scale, [[t0, [0, 100]], [t1, [100, 100]]], "out", 85);
  var h1 = rect(merge(base, { w: hd, h: th, r: th / 2, color: c, pos: [x1, y], anchor: "right", name: "arrow head1" }));
  var h2 = rect(merge(base, { w: hd, h: th, r: th / 2, color: c, pos: [x1, y], anchor: "right", name: "arrow head2" }));
  h1.rotation.setValue(-45); h2.rotation.setValue(45);
  var tHead = t1 - f(2);
  setKeys(h1.opacity, [[tHead, 0], [tHead + f(1), 100]], "linear");
  setKeys(h2.opacity, [[tHead, 0], [tHead + f(1), 100]], "linear");
  return N;
}

// ---------- 모션 프리셋 (5종 모션 언어) ----------
/** 1) impactIn(L, t, o): 115%→100% 착지 + 2프레임 페이드. o:{from:115, dur:f(5), scale:100(최종)} */
function impactIn(L, t, o) {
  o = o || {}; var from = o.from || 115, dur = o.dur || f(5), base = o.scale || 100;
  setKeys(L.scale, [[t, [from * base / 100, from * base / 100]], [t + dur, [base, base]]], "out", 85);
  setKeys(L.opacity, [[t, 0], [t + f(2), 100]], "linear");
}
/** 2) slideIn(L, t, dir, o): dir("left"|"right"|"up"|"down") 쪽에서 들어와 현재 위치에 정지. o:{dist:420, dur:0.32, noFade} */
function slideIn(L, t, dir, o) {
  o = o || {}; var dist = o.dist || 420, dur = o.dur || 0.32;
  var p = L.position.valueAtTime(t, false), x = p[0], y = p[1], from = [x, y];
  if (dir === "left") { from = [x - dist, y]; } else if (dir === "right") { from = [x + dist, y]; }
  else if (dir === "up") { from = [x, y - dist]; } else if (dir === "down") { from = [x, y + dist]; }
  setKeys(L.position, [[t, from], [t + dur, [x, y]]], o.mode || "out", 88);
  if (!o.noFade) { setKeys(L.opacity, [[t, 0], [t + f(2), 100]], "linear"); }
}
/** 2') slideOut(L, t, dir, o): 현재 위치에서 dir 방향(이동 방향)으로 빠져나가며 컷. o:{dist:420, dur:0.25, noFade, keep} */
function slideOut(L, t, dir, o) {
  o = o || {}; var dist = o.dist || 420, dur = o.dur || 0.25;
  var p = L.position.valueAtTime(t, false), x = p[0], y = p[1], to = [x, y];
  if (dir === "left") { to = [x - dist, y]; } else if (dir === "right") { to = [x + dist, y]; }
  else if (dir === "up") { to = [x, y - dist]; } else if (dir === "down") { to = [x, y + dist]; }
  setKeys(L.position, [[t, [x, y]], [t + dur, to]], "in", 88);
  if (!o.noFade) { setKeys(L.opacity, [[t + dur - f(3), 100], [t + dur, 0]], "linear"); }
  if (!o.keep) { cutAt(L, t + dur); }
}
/** moveTo(L, t0, t1, toPos, mode) / scaleTo(L, t0, t1, from, to, mode) / rotateTo */
function moveTo(L, t0, t1, toPos, mode) { var p = L.position.valueAtTime(t0, false); setKeys(L.position, [[t0, [p[0], p[1]]], [t1, toPos]], mode || "inout", 70); }
function scaleTo(L, t0, t1, from, to, mode) { setKeys(L.scale, [[t0, [from, from]], [t1, [to, to]]], mode || "inout", 70); }
function rotateTo(L, t0, t1, from, to, mode) { setKeys(L.rotation, [[t0, from], [t1, to]], mode || "inout", 70); }
/** 3) staggerIn(L, t, o): 글자/단어 순차 등장(텍스트 애니메이터). o:{dur:0.45, by:"chars"|"words", dist:140, dir:"up"|"down"|"left"|"right"|"none", scaleFrom, shape:"ramp"|"square", blur} */
function staggerIn(L, t, o) {
  o = o || {}; var dur = o.dur || 0.45, dist = (o.dist === undefined) ? 140 : o.dist, dir = o.dir || "up";
  var an = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
  an.name = "StaggerIn";
  var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
  var adv = sel.property("ADBE Text Range Advanced");
  if (o.by === "words") { adv.property("ADBE Text Range Type2").setValue(3); }
  propAny(adv, ["ADBE Text Range Shape", "ADBE Text Selector Shape", "Shape"]).setValue(o.shape === "square" ? 1 : 2);
  var props = an.property("ADBE Text Animator Properties");
  props.addProperty("ADBE Text Opacity").setValue(0);
  if (dist && dir !== "none") {
    var off = [0, 0, 0];
    if (dir === "up") { off = [0, dist, 0]; } else if (dir === "down") { off = [0, -dist, 0]; }
    else if (dir === "left") { off = [dist, 0, 0]; } else if (dir === "right") { off = [-dist, 0, 0]; }
    props.addProperty("ADBE Text Position 3D").setValue(off);
  }
  if (o.scaleFrom !== undefined) { props.addProperty("ADBE Text Scale 3D").setValue([o.scaleFrom, o.scaleFrom, 100]); }
  if (o.blur) { props.addProperty("ADBE Text Blur").setValue([o.blur, o.blur]); }
  if (o.shape === "square") {
    // 타자기: 사각 선택 범위를 앞에서부터 일정 속도로 줄인다 (Start 0→100, linear — ease 를 주면 첫 프레임에 글자가 한꺼번에 뜬다)
    setKeys(sel.property("ADBE Text Percent Start"), [[t, 0], [t + dur, 100]], "linear");
  } else {
    // Ramp Up 은 End 뒤 글자를 전부 선택(숨김)하므로, 폭 W 의 창을 Offset 으로 -W→100 쓸어 지나가게 한다
    var win = o.window || 30;
    sel.property("ADBE Text Percent Start").setValue(0);
    sel.property("ADBE Text Percent End").setValue(win);
    setKeys(sel.property("ADBE Text Percent Offset"), [[t, -win], [t + dur, 100]], "out", 70);
  }
  return an;
}
/** 3') staggerOut(L, t, o): 앞 글자부터 순차 퇴장 후 컷. o:{dur:0.3, by, dist:80, dir(이동 방향), keep} */
function staggerOut(L, t, o) {
  o = o || {}; var dur = o.dur || 0.3, dist = (o.dist === undefined) ? 80 : o.dist, dir = o.dir || "up";
  var an = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
  an.name = "StaggerOut";
  var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
  var adv = sel.property("ADBE Text Range Advanced");
  if (o.by === "words") { adv.property("ADBE Text Range Type2").setValue(3); }
  // Ramp Down: 창 앞 글자 = 전부 선택(숨김), 창 뒤 = 미선택(보임). 창을 -W→100 으로 쓸면 앞 글자부터 사라진다
  propAny(adv, ["ADBE Text Range Shape", "ADBE Text Selector Shape", "Shape"]).setValue(3);
  var props = an.property("ADBE Text Animator Properties");
  props.addProperty("ADBE Text Opacity").setValue(0);
  if (dist && dir !== "none") {
    var off = [0, 0, 0];
    if (dir === "up") { off = [0, -dist, 0]; } else if (dir === "down") { off = [0, dist, 0]; }
    else if (dir === "left") { off = [-dist, 0, 0]; } else if (dir === "right") { off = [dist, 0, 0]; }
    props.addProperty("ADBE Text Position 3D").setValue(off);
  }
  var win = o.window || 30;
  sel.property("ADBE Text Percent Start").setValue(0);
  sel.property("ADBE Text Percent End").setValue(win);
  setKeys(sel.property("ADBE Text Percent Offset"), [[t, -win], [t + dur, 100]], "in", 70);
  if (!o.keep) { cutAt(L, t + dur); }
  return an;
}
/** typeOn(L, t, dur): 타자기 등장(글자 단위 즉시 표시) */
function typeOn(L, t, dur) { return staggerIn(L, t, { dur: dur || 0.4, dist: 0, dir: "none", shape: "square" }); }
/**
 * gloss(str, o) — 한국어 문구 아래 작은 영어 표기(한·영 이중 표기). 한국어보다 2프레임 늦게 typeOn.
 * o:{pos, t0, t1, size(36), color(lime), tracking(250), anchor, justify, delay(초, 기본 2f), still(true = 등장 모션 없음 · 스티커 안), name, parentLayer}
 */
function gloss(str, o) {
  var t = o.t0 + ((o.delay === undefined) ? f(2) : o.delay);
  if (o.still) { t = o.t0; }
  var L = text(str, { font: "enMid", size: o.size || 36, color: o.color || COL.lime, tracking: (o.tracking === undefined) ? 250 : o.tracking,
    anchor: o.anchor, justify: o.justify, pos: o.pos, t0: t, t1: o.t1, name: o.name || ("gloss " + str), parentLayer: o.parentLayer });
  if (!o.still) { typeOn(L, t, 0.15); }
  return L;
}
/** 4) rgbSplit(L, t, o): RGB 분리 글리치 — t부터 frames 프레임만. 원본 위에 빨강/시안 복제본(ADD) 생성. o:{frames:2, offset:14} */
function rgbSplit(L, t, o) {
  o = o || {}; var frames = o.frames || 2, off = o.offset || 14;
  var spec = [[COL.red, -1], [COL.cyan, 1]];
  var a = L.anchorPoint.valueAtTime(t, false);
  for (var i = 0; i < 2; i++) {
    var D = L.duplicate(); D.name = L.name + (i === 0 ? " _R" : " _C");
    // 원본의 페이드 키(impactIn 의 opacity 0→100)를 물려받으면 글리치 첫 프레임이 투명해지므로 복제본은 항상 100%
    try { D.opacity.expression = ""; while (D.opacity.numKeys > 0) { D.opacity.removeKey(1); } D.opacity.setValue(100); } catch (eOp) {}
    var fx = D.property("ADBE Effect Parade").addProperty("ADBE Fill");
    try { fx.property("ADBE Fill-0002").setValue(rgba(spec[i][0])); } catch (e) { fx.property("Color").setValue(rgba(spec[i][0])); }
    D.blendingMode = BlendingMode.ADD;
    setRange(D, t, t + f(frames));
    var sgn = spec[i][1], keys = [];
    for (var k = 0; k < frames; k++) {
      var jit = off * ((k % 2 === 0) ? 1 : 0.55) * sgn;
      keys.push([t + f(k), [a[0] + jit, a[1] + ((k % 2 === 1) ? -jit * 0.3 : jit * 0.2)]]);
    }
    setKeys(D.anchorPoint, keys, "hold");
  }
}
/** 4') flash(color, t, o): 전체 화면 번쩍. o:{dur:0.16, peak:100} → 솔리드 반환 */
function flash(color, t, o) {
  o = o || {}; var dur = o.dur || 0.16, peak = (o.peak === undefined) ? 100 : o.peak;
  var S = solid(color, t, t + dur, "Flash");
  setKeys(S.opacity, [[t, peak], [t + dur, 0]], "out", 70);
  return S;
}
/** 4'') shake(t, o): 카메라 흔들림(CTRL Shake 슬라이더). o:{amount:1(0~2), dur:0.35} */
function shake(t, o) {
  o = o || {}; var amt = (o.amount === undefined) ? 1 : o.amount, dur = o.dur || 0.35, s = ctx.shakeSlider;
  // 앞선 shake 의 감쇠 키가 이번 구간 안에 남아 있으면 새 흔들림이 1프레임 만에 꺼지므로 먼저 지운다
  clearKeys(s, t - f(1) + 0.0001, t + dur - 0.0001);
  key(s, t - f(1), 0); key(s, t, amt); var i = key(s, t + dur, 0); easeKey(s, i, 80, 80);
}
/** clearKeys(prop, from, to) — [from, to] 구간의 키프레임 제거 */
function clearKeys(prop, from, to) {
  for (var k = prop.numKeys; k >= 1; k--) { var kt = prop.keyTime(k); if (kt >= from && kt <= to) { prop.removeKey(k); } }
}
/** 5) popIn(L, t, o): 탄성 팝(0→114→95→100). 아이콘·배지 전용. o:{dur:0.36, scale:100} */
function popIn(L, t, o) {
  o = o || {}; var base = o.scale || 100, dur = o.dur || 0.36;
  setKeys(L.scale, [[t, [0, 0]], [t + dur * 0.5, [base * 1.14, base * 1.14]], [t + dur * 0.78, [base * 0.95, base * 0.95]], [t + dur, [base, base]]], "inout", 60);
  setKeys(L.opacity, [[t, 0], [t + f(1), 100]], "linear");
}
/** 5') popOut(L, t, o): 축소 퇴장 후 컷. o:{dur:0.18, keep} */
function popOut(L, t, o) {
  o = o || {}; var dur = o.dur || 0.18, cur = L.scale.valueAtTime(t, false)[0];
  setKeys(L.scale, [[t, [cur, cur]], [t + dur, [0, 0]]], "in", 80);
  if (!o.keep) { cutAt(L, t + dur); }
}
/** pulse(L, t, o): 비트 한 번에 맞춰 튀기(응답 챈트용). o:{amount:1.1, dur:0.22} */
function pulse(L, t, o) {
  o = o || {}; var amt = o.amount || 1.1, dur = o.dur || 0.22, cur = L.scale.valueAtTime(t, false)[0];
  setKeys(L.scale, [[t, [cur, cur]], [t + dur * 0.35, [cur * amt, cur * amt]], [t + dur, [cur, cur]]], "inout", 60);
}
/** beatScale(L, amount): 비트마다 amount% 튀는 expression (키프레임 위에 더해짐) */
function beatScale(L, amount) {
  amount = (amount === undefined) ? 6 : amount;
  L.scale.expression = "var b = thisComp.layer(\"CTRL\").effect(\"Beat\")(\"Slider\"); var a = " + amount + "; value + [a * b, a * b" + (dims(L.scale) === 3 ? ", 0" : "") + "];";
}
/** beatOpacity(L, lo, hi): 비트에 따라 불투명도 lo~hi */
function beatOpacity(L, lo, hi) { L.opacity.expression = "var b = thisComp.layer(\"CTRL\").effect(\"Beat\")(\"Slider\"); linear(b, 0, 1, " + lo + ", " + hi + ");"; }
/** strike(L, t, o): 텍스트 위에 취소선을 왼→오로 긋기. o:{color:COL.purple, dur:0.18, thick:14, yOffset:0, pad:24, t1} → 도형 반환 */
function strike(L, t, o) {
  o = o || {}; var dur = o.dur || 0.18, padX = (o.pad === undefined) ? 24 : o.pad;
  var b = bbox(L, t);
  var B = rect({ w: b.width + 2 * padX, h: o.thick || 14, color: o.color || COL.purple, pos: [b.left - padX, b.cy + (o.yOffset || 0)], anchor: "left", t0: t, t1: o.t1 || L.outPoint, name: "Strike" });
  setKeys(B.scale, [[t, [0, 100]], [t + dur, [100, 100]]], "out", 85);
  return B;
}
/** scanline(t0, t1, o): 발광 스캔라인이 y0→y1 로 이동. o:{x, w:700, h:6, yFrom, yTo, color} */
function scanline(t0, t1, o) {
  o = o || {}; var x = o.x || CX, w = o.w || 700, y0 = (o.yFrom === undefined) ? 500 : o.yFrom, y1 = (o.yTo === undefined) ? 1400 : o.yTo;
  var Lb = rect({ w: w, h: o.h || 6, color: o.color || COL.lime, pos: [x, y0], t0: t0, t1: t1, name: "Scanline" });
  glow(Lb, { radius: 40, intensity: 1.6, threshold: 20 });
  setKeys(Lb.position, [[t0, [x, y0]], [t1, [x, y1]]], "linear");
  return Lb;
}

// ---------- 이펙트 ----------
function fxAdd(L, matchName) { return L.property("ADBE Effect Parade").addProperty(matchName); }
/** glow(L, o): o:{threshold:55(%), radius:60, intensity:1.0} */
function glow(L, o) {
  o = o || {}; var g = fxAdd(L, "ADBE Glo2");
  try { g.property("ADBE Glo2-0002").setValue((o.threshold === undefined) ? 55 : o.threshold); g.property("ADBE Glo2-0003").setValue(o.radius || 60); g.property("ADBE Glo2-0004").setValue((o.intensity === undefined) ? 1.0 : o.intensity); }
  catch (e) { log("glow props: " + e); }
  return g;
}
/** tint(L, blackTo, whiteTo, amount): 듀오톤 */
function tint(L, blackTo, whiteTo, amount) {
  var tn = fxAdd(L, "ADBE Tint");
  try { tn.property("ADBE Tint-0001").setValue(rgba(blackTo)); tn.property("ADBE Tint-0002").setValue(rgba(whiteTo)); tn.property("ADBE Tint-0003").setValue((amount === undefined) ? 100 : amount); }
  catch (e) { log("tint props: " + e); }
  return tn;
}
function blend(L, mode) {
  var m = null;
  if (mode === "ADD") { m = BlendingMode.ADD; } else if (mode === "SCREEN") { m = BlendingMode.SCREEN; } else if (mode === "MULTIPLY") { m = BlendingMode.MULTIPLY; }
  else if (mode === "OVERLAY") { m = BlendingMode.OVERLAY; } else if (mode === "DIFFERENCE") { m = BlendingMode.DIFFERENCE; }
  if (m !== null) { L.blendingMode = m; }
}

// ---------- 프로젝트 셋업 / 마무리 / 렌더 ----------
function importFootage(path) {
  try { var fl = new File(path); if (!fl.exists) { log("missing footage: " + path); return null; } return app.project.importFile(new ImportOptions(fl)); }
  catch (e) { log("import fail " + path + ": " + e); return null; }
}
function enableFileAccess() {
  try { app.preferences.savePrefAsLong("Main Pref Section", "Pref_SCRIPTING_FILE_NETWORK_SECURITY", 1); app.preferences.saveToDisk(); app.preferences.reload(); } catch (e) {}
}
function beatExpression() {
  return "var b = [" + BEATS.join(",") + "]; var s = 0; for (var i = 0; i < b.length; i++) { if (time >= b[i]) { var d = time - b[i]; var v = Math.max(0, 1 - d / 0.28); if (v > s) { s = v; } } else { break; } } s;";
}
function setupProject() {
  try { if (app.project) { app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); } } catch (e0) {}
  app.newProject();
  var proj = app.project; proj.bitsPerChannel = 8;
  var comp = proj.items.addComp("POTATA Teaser 9x16", W, H, 1, DUR, FPS);
  comp.motionBlur = true; comp.bgColor = COL.black; ctx.comp = comp;
  var audio = importFootage(AUDIO_PATH);
  if (audio) { var AL = comp.layers.add(audio); AL.name = "AUDIO"; ctx.audio = AL; }
  ctx.banner = importFootage(BANNER_PATH);
  ctx.photos = {};
  for (var pi = 0; pi < PHOTO_NAMES.length; pi++) {
    ctx.photos[PHOTO_NAMES[pi]] = importFootage(PHOTO_DIR + "/" + PHOTO_NAMES[pi] + ".jpg");   // 실패 시 null + "missing footage" 로그 → 회색 카드
  }
  ctx.bg = comp.layers.addSolid(COL.black, "BG", W, H, 1, DUR);
  var ctrl = comp.layers.addNull(DUR); ctrl.name = "CTRL"; ctx.ctrl = ctrl;
  var beatFx = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control"); beatFx.name = "Beat";
  ctx.beat = beatFx.property("ADBE Slider Control-0001"); ctx.beat.expression = beatExpression();
  var shkFx = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control"); shkFx.name = "Shake";
  ctx.shakeSlider = shkFx.property("ADBE Slider Control-0001"); ctx.shakeSlider.setValue(0);
  var cam = comp.layers.addNull(DUR); cam.name = "CAM"; setv(cam.anchorPoint, [0, 0]); setv(cam.position, [0, 0]); ctx.cam = cam;
}
function finalize() {
  ctx.cam.position.expression = "var s = thisComp.layer(\"CTRL\").effect(\"Shake\")(\"Slider\"); var w = wiggle(30, 46); value + (w - value) * s;";
  ctx.cam.moveToBeginning(); ctx.ctrl.moveToBeginning();
  if (ctx.audio) { ctx.audio.moveToEnd(); } ctx.bg.moveToEnd(); if (ctx.audio) { ctx.audio.moveToEnd(); }
  var folder = new Folder(OUT_DIR); if (!folder.exists) { folder.create(); }
  app.project.save(new File(OUT_DIR + "/potata-teaser.aep"));
  log("saved aep");
}
function writeLog() {
  try {
    var folder = new Folder(OUT_DIR); if (!folder.exists) { folder.create(); }
    var fl = new File(OUT_DIR + "/build-log-" + RUN_ID + ".txt"); fl.encoding = "UTF-8";
    if (fl.open("w")) { fl.write(ctx.log.join("\n")); fl.close(); }
  } catch (e) {}
  try { ctx.comp.comment = ctx.log.join("\n"); } catch (e2) {}
}
function render() {
  var rq = app.project.renderQueue, item = rq.items.add(ctx.comp), om = item.outputModule(1);
  var tried = ["H.264 - Match Render Settings - 15 Mbps", "H.264 - Match Render Settings - 40 Mbps", "H.264 - Match Render Settings - 5 Mbps"], ok = false, i;
  try { log("OM templates: " + om.templates.join(" | ")); } catch (e0) {}
  for (i = 0; i < tried.length && !ok; i++) { try { om.applyTemplate(tried[i]); ok = true; log("OM template: " + tried[i]); } catch (e1) {} }
  var outFile;
  if (ok) { outFile = new File(OUT_DIR + "/potata-teaser-" + RUN_ID + ".mp4"); }
  else {
    try { om.applyTemplate("PNG Sequence"); } catch (e2) {}
    var fr = new Folder(OUT_DIR + "/frames-" + RUN_ID); if (!fr.exists) { fr.create(); }
    outFile = new File(OUT_DIR + "/frames-" + RUN_ID + "/teaser_[#####].png"); log("OM fallback: PNG sequence");
  }
  om.file = outFile; item.render = true;
  // 부분 렌더(스모크 테스트·구간 확인용): 빌드 시 var RENDER_SPAN = [시작, 끝] 을 앞에 주입하면 그 구간만 렌더
  if (typeof RENDER_SPAN !== "undefined" && RENDER_SPAN) { try { item.timeSpanStart = RENDER_SPAN[0]; item.timeSpanDuration = RENDER_SPAN[1] - RENDER_SPAN[0]; log("render span " + RENDER_SPAN[0] + "-" + RENDER_SPAN[1]); } catch (eSpan) { log("span err: " + eSpan); } }
  log("render start -> " + outFile.fsName);
  rq.render();
  log("render done");
}
function runAll() {
  log("RUN " + RUN_ID + " start");
  enableFileAccess(); resolveFonts(); setupProject();
  SCENES.sort(function (a, b) { return a.from - b.from; });
  for (var i = 0; i < SCENES.length; i++) {
    var sc = SCENES[i];
    try { sc.fn(ctx); log("OK " + sc.name + " [" + sc.from + "-" + sc.to + "]"); }
    catch (e) { ctx.errors++; log("ERR " + sc.name + ": " + e.toString() + " (line " + e.line + ")"); }
  }
  finalize(); writeLog();
  if (ctx.errors === 0 || RENDER_ON_ERROR) { try { render(); } catch (e2) { log("RENDER ERR: " + e2.toString()); } }
  else { log("render skipped: " + ctx.errors + " scene error(s)"); }
  log("RUN " + RUN_ID + " end");
  writeLog();
}
