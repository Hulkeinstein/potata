var RUN_ID = "r06b";
var RENDER_SPAN = null;

// ===== 00-core.jsx =====
/* =====================================================================
 * potata \ub7f0\uce6d \ud2f0\uc800 \u2014 After Effects 2026 ExtendScript (ES3 \ubb38\ubc95\ub9cc!)
 * 00-core.jsx : \uc0c1\uc218 \u00b7 \ud0c0\uc774\ubc0d\ud45c \u00b7 \ud5ec\ud37c API (SSoT)
 *
 * \uc7a5\uba74 \ud30c\uc77c(10-*.jsx \ub4f1)\uc740 \uc774 \ud30c\uc77c\uc758 \ud5ec\ud37c\ub9cc \uc0ac\uc6a9\ud55c\ub2e4.
 * \ube4c\ub4dc: python build.py \u2192 build-teaser.jsx (ASCII \uc774\uc2a4\ucf00\uc774\ud504 + RUN_ID \uc8fc\uc785)
 * \uc2e4\ud589: AfterFX.exe -r build-teaser.jsx
 * ===================================================================== */

// ---------- \uacbd\ub85c (\ube4c\ub4dc \uc2dc RUN_ID \uac00 \uc55e\uc5d0 \uc8fc\uc785\ub428) ----------
if (typeof RUN_ID === "undefined") { var RUN_ID = "dev"; }
var OUT_DIR = "C:/Users/jangk/Downloads/potata-teaser";
var AUDIO_PATH = "C:/Users/jangk/Downloads/\ubc24\ud2f0 \ub9d0\uace0 Potata (1).wav";
var BANNER_PATH = "C:/Users/jangk/Projects/Coding/potata/public/home-banner.jpg";
// AI \uc0dd\uc131 \ubaa8\ub378 \uc0ac\uc9c4(Higgsfield Soul 2.0) \u2014 \uce74\ub4dc \uc774\ubbf8\uc9c0 \uc601\uc5ed\uc744 \ucc44\uc6b4\ub2e4. \uc5c6\uc73c\uba74 \ud68c\uc0c9 \uce74\ub4dc\ub85c \uadf8\ub9ac\uace0 \ub85c\uadf8\uc5d0 \ub0a8\uae34\ub2e4.
var PHOTO_DIR = "C:/Users/jangk/Projects/Coding/potata/marketing/launch-teaser/photos";
var PHOTO_NAMES = ["feed-1", "feed-2", "feed-3", "feed-4", "tryon", "style-1", "style-2", "style-3", "style-4", "share"];
var RENDER_ON_ERROR = false;   // \uc7a5\uba74 \uc624\ub958\uac00 \uc788\uc73c\uba74 \ub80c\ub354\ud558\uc9c0 \uc54a\uace0 \ub85c\uadf8\ub9cc \ub0a8\uae34\ub2e4

// ---------- \uce94\ubc84\uc2a4 ----------
var W = 1080, H = 1920, FPS = 30, DUR = 40.88, CX = 540, CY = 960;
var FD = 1 / FPS;
function f(n) { return n * FD; }          // n\ud504\ub808\uc784 \u2192 \ucd08

// ---------- \uc0c9 (0~1 RGB) ----------
var COL = {
  black:  [0.020, 0.020, 0.020],   // #050505 \ubc30\uacbd
  white:  [0.961, 0.961, 0.969],   // #F5F5F7 \uc804\uacbd
  lime:   [0.800, 0.953, 0.506],   // #CCF381 brand-neon
  purple: [0.545, 0.361, 0.965],   // #8B5CF6 primary
  gray:   [0.102, 0.102, 0.110],   // #1A1A1C UI \uce74\ub4dc
  gray2:  [0.180, 0.180, 0.200],   // #2E2E33 UI \uce74\ub4dc \ubcf4\uc870
  gray3:  [0.420, 0.420, 0.450],   // #6B6B73 \ube44\ud65c\uc131 \ud14d\uc2a4\ud2b8
  red:    [1.000, 0.100, 0.200],   // RGB split \uc804\uc6a9
  cyan:   [0.000, 0.900, 1.000]    // RGB split \uc804\uc6a9
};

// ---------- \ud0c0\uc774\ubc0d\ud45c (\ucd08) \u2014 \uac00\uc0ac \ub2e8\uc5b4 \ud0c0\uc784\uc2a4\ud0ec\ud504 + \uac15\ud55c \uc628\uc14b \uae30\uc900 ----------
var T = {
  // [Intro - chant] Seoul! (Now loading) / UAE! (Now loading) / Po-ta-ta! (Let's go!)
  seoul: 0.00, loading1: 0.62, uaeU: 2.20, uaeA: 2.72, uaeE: 3.14, loading2: 3.62, loadingDone: 4.28,
  po1: 4.74, ta1: 4.95, ta2: 5.16, letsGo: 5.80, introEnd: 6.44,
  // [Verse] K-fashion? Too far? Not anymore / \uc2a4\ud06c\ub864 \ud55c \ubc88\uc774\uba74 \uc11c\uc6b8\uc774 \ubb38 \uc55e\uc5d0 / Discover \ud22d / Try it on \ud1a1 / Style it \uc9e0 / Share it pop
  kfashion: 7.00, tooFar: 8.28, strike: 8.66, notAnymore: 9.00,
  scroll: 10.30, scrollW2: 10.78, scrollW3: 11.78, scrollW4: 12.24, scrollEnd: 13.44,
  discover: 13.44, tuk: 13.96, tryItOn: 14.44, tok: 15.18, styleIt: 15.42, zzan: 16.00,
  shareIt: 16.26, pop1: 17.40, pop2: 17.80, verseEnd: 18.46,
  // [Hook] \ubc24\ud2f0 \ub9d0\uace0 Potata! (Po-ta-ta!) x2 / Seoul to Dubai, \uc624\ub298\uc740 Potata / \ubc24\ud2f0 \ub9d0\uace0 Potata! (Yeah!)
  hook1: 18.46, hook1b: 18.82, hook1Potata: 19.20, resp1a: 20.60, resp1b: 20.81, resp1c: 21.02,
  hook2: 21.38, hook2b: 22.26, hook2Potata: 22.58, resp2a: 23.80, resp2b: 24.05, resp2c: 24.45,
  seoulTo: 24.72, dubai: 25.44, today: 25.88, todayPotata: 26.58,
  hook3: 28.00, hook3b: 29.12, hook3Potata: 29.46, yeah: 31.46, yeahEnd: 32.34,
  // [Outro] Follow the build\u2026 / Po-ta-ta! (\ube60\ubc24!)
  follow: 32.34, the: 32.74, build: 33.14, buildEnd: 33.58,
  oPo: 33.88, oTa1: 34.53, oTa2: 35.60, bbam1: 37.31, bbam2: 37.94, finalHit: 39.66, end: 40.88
};
var BPM = 143.55, BEAT = 60 / BPM, BAR = BEAT * 4;
var BEATS = [0.046, 0.464, 0.882, 1.3, 1.741, 2.206, 2.624, 3.042, 3.46, 3.901, 4.319, 4.737, 5.155, 5.596, 6.037, 6.455, 6.896, 7.314, 7.755, 8.173, 8.615, 9.033, 9.451, 9.892, 10.333, 10.751, 11.169, 11.61, 12.028, 12.469, 12.887, 13.328, 13.746, 14.164, 14.605, 15.023, 15.441, 15.882, 16.3, 16.742, 17.16, 17.578, 18.019, 18.46, 18.901, 19.296, 19.737, 20.178, 20.596, 21.037, 21.455, 21.873, 22.314, 22.732, 23.174, 23.615, 24.033, 24.451, 24.892, 25.31, 25.751, 26.169, 26.61, 27.028, 27.469, 27.887, 28.328, 28.746, 29.164, 29.605, 30.023, 30.465, 30.883, 31.324, 31.742, 32.183, 32.624, 33.042, 33.46, 33.878, 34.319, 34.737, 35.178, 35.596, 36.037, 36.455, 36.897, 37.314, 37.756, 38.174, 38.615, 39.033, 39.474, 39.892, 40.31];

// ---------- \ucee8\ud14d\uc2a4\ud2b8 / \uc7a5\uba74 \ub4f1\ub85d ----------
var ctx = { comp: null, cam: null, ctrl: null, beat: null, shakeSlider: null, audio: null, banner: null, bg: null, log: [], errors: 0 };
var SCENES = [];
/** scene(name, from, to, fn) \u2014 \uc7a5\uba74 \ud30c\uc77c\uc774 \ud638\ucd9c\ud574 \ub4f1\ub85d. fn(ctx) \uc548\uc5d0\uc11c \ub808\uc774\uc5b4\ub97c \ub9cc\ub4e0\ub2e4. */
function scene(name, from, to, fn) { SCENES.push({ name: name, from: from, to: to, fn: fn }); }
function log(msg) { ctx.log.push(String(msg)); try { $.writeln(msg); } catch (e) {} }
function merge(a, b) { var o = {}, k; for (k in a) { if (a.hasOwnProperty(k)) { o[k] = a[k]; } } for (k in b) { if (b.hasOwnProperty(k)) { o[k] = b[k]; } } return o; }
function rgba(c) { return [c[0], c[1], c[2], 1]; }
function hasHangul(s) { for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); if (c >= 0xAC00 && c <= 0xD7A3) { return true; } } return false; }

// ---------- \ud3f0\ud2b8 ----------
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

// ---------- \uac12/\ud0a4\ud504\ub808\uc784 \uae30\ubcf8 ----------
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
/** propAny(group, [matchName \ub610\ub294 \ud45c\uc2dc\uba85 ...]) \u2014 \uccab \ubc88\uc9f8\ub85c \uc874\uc7ac\ud558\ub294 \uc18d\uc131\uc744 \ub3cc\ub824\uc900\ub2e4(\ubc84\uc804\ubcc4 matchName \ucc28\uc774 \ud761\uc218) */
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
 *  mode: "out"(\uae09\ucd9c\ubc1c\u2192\uac10\uc18d, \uae30\ubcf8) | "in"(\uac00\uc18d\u2192\uae09\uc815\uc9c0) | "inout" | "linear" | "hold"
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

// ---------- \ub808\uc774\uc5b4 \uacf5\ud1b5 ----------
function setRange(layer, t0, t1) {
  if (t0 === undefined || t0 === null) { t0 = 0; } if (t1 === undefined || t1 === null) { t1 = DUR; }
  if (t1 > DUR) { t1 = DUR; } if (t0 < 0) { t0 = 0; } if (t1 <= t0) { t1 = t0 + FD; }
  // AE \ub294 inPoint \ub97c \ubc14\uafc0 \ub54c \ub808\uc774\uc5b4 \uae38\uc774\ub97c \uc720\uc9c0\ud558\uba70 outPoint \ub97c \ubc00\uc5b4\ub0b8\ub2e4(r02 \uc5d0\uc11c \uae00\ub9ac\uce58 \ubcf5\uc81c\ubcf8\uc774 0.72s \uc0b4\uc544\ub0a8\uc740 \uc6d0\uc778).
  // \uadf8\ub798\uc11c \uba3c\uc800 \uc790\ub9ac\ub97c \ub109\ub109\ud788 \ub9cc\ub4e0 \ub4a4 \ubc18\ub4dc\uc2dc in \u2192 out \uc21c\uc11c\ub85c \ud655\uc815\ud55c\ub2e4.
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
/** xform(L, matchName) \u2014 Transform \uadf8\ub8f9 \uc18d\uc131. layer.property("ADBE Rotate X") \ub294 null \uc744 \ub3cc\ub824\uc8fc\ubbc0\ub85c \ubc18\ub4dc\uc2dc \uc774\uac78 \uc4f4\ub2e4 */
function xform(L, matchName) { return propAny(L.property("ADBE Transform Group"), [matchName]); }
function rotX(L) { return xform(L, "ADBE Rotate X"); }
function rotY(L) { return xform(L, "ADBE Rotate Y"); }
/** bbox(L, t) \u2192 \uc6d4\ub4dc \uc88c\ud45c \ubc15\uc2a4 {left, top, width, height, cx, cy} (\ud68c\uc804 \ubb34\uc2dc) */
function bbox(L, t) {
  var r = L.sourceRectAtTime(t, false), p = L.position.valueAtTime(t, false), a = L.anchorPoint.valueAtTime(t, false), s = L.scale.valueAtTime(t, false);
  var sx = s[0] / 100, sy = s[1] / 100;
  var left = p[0] + (r.left - a[0]) * sx, top = p[1] + (r.top - a[1]) * sy, w = r.width * sx, h = r.height * sy;
  return { left: left, top: top, width: w, height: h, cx: left + w / 2, cy: top + h / 2 };
}

// ---------- \ud14d\uc2a4\ud2b8 ----------
/**
 * text(str, o) \u2014 \ud14d\uc2a4\ud2b8 \ub808\uc774\uc5b4. \uc575\ucee4\ub294 \uae00\uc790 \ubc15\uc2a4 \uae30\uc900(\uae30\ubcf8 \uc911\uc559)\uc73c\ub85c \ub9de\ucdb0\uc9c0\ubbc0\ub85c pos \uac00 \uace7 \uae00\uc790 \uc911\uc2ec\uc774\ub2e4.
 * o: { font:"en"|"enMid"|"ko"|<PostScript\uba85>(\uc0dd\ub7b5 \uc2dc \ud55c\uae00 \ud3ec\ud568\uc774\uba74 ko), size, color, pos:[x,y], t0, t1, name,
 *      tracking(1/1000em), justify:"center"|"left"|"right", anchor:"center"|"left"|"right"|"top"|"bottom"|"topleft",
 *      stroke:{color,width}, fillNone:true(\uc544\uc6c3\ub77c\uc778 \uc804\uc6a9), leading, vscale(\uc138\ub85c \ube44\uc728 %, condensed \ub290\ub08c), parent:false, parentLayer }
 * \uc904\ubc14\uafc8\uc740 "\r".
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
/** counter(from, to, t0, t1, o) \u2014 \uc22b\uc790 \uce74\uc6b4\ud2b8\uc5c5 \ud14d\uc2a4\ud2b8 (o.suffix \uae30\ubcf8 "%") */
function counter(from, to, t0, t1, o) {
  o = o || {}; var suffix = (o.suffix === undefined) ? "%" : o.suffix;
  var L = text(String(to) + suffix, merge({ t0: t0 }, o));
  L.property("ADBE Text Properties").property("ADBE Text Document").expression =
    "Math.round(linear(time, " + t0 + ", " + t1 + ", " + from + ", " + to + ")) + \"" + suffix + "\"";
  return L;
}

// ---------- \ub3c4\ud615 ----------
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
/** rect(o): { w, h, r(\ub465\uae00\uae30), color, stroke:{color,width}, noFill, pos, anchor, t0, t1, name, parent, parentLayer } \u2014 pos \ub294 \uc575\ucee4 \uc9c0\uc810\uc758 \uc6d4\ub4dc \uc88c\ud45c */
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
/** solid(color, t0, t1, name) \u2014 \uc804\uccb4 \ud654\uba74 \uc194\ub9ac\ub4dc. \uce74\uba54\ub77c \ud754\ub4e4\ub9bc\uc5d0 \uc601\ud5a5\ubc1b\uc9c0 \uc54a\ub3c4\ub85d parent \uc5c6\uc74c */
function solid(color, t0, t1, name) { var L = ctx.comp.layers.addSolid(color, name || "Solid", W, H, 1, DUR); setRange(L, t0, t1); return L; }
/** image(item, o) \u2014 \ud478\ud2f0\uc9c0 \ub808\uc774\uc5b4. o:{pos, scale, t0, t1, name} */
function image(item, o) {
  o = o || {}; var L = ctx.comp.layers.add(item); L.name = o.name || "Image";
  setv(L.position, o.pos || [CX, CY]); if (o.scale) { setv(L.scale, [o.scale, o.scale]); }
  L.motionBlur = true; setRange(L, o.t0, o.t1); attach(L, o); return L;
}
/** roundRectShape(x, y, w, h, r) \u2014 \ub9c8\uc2a4\ud06c\uc6a9 \ub465\uadfc \uc0ac\uac01\ud615 Shape (\ub808\uc774\uc5b4 \uc88c\ud45c, \uc2dc\uacc4 \ubc29\ud5a5) */
function roundRectShape(x, y, w, h, r) {
  var k = r * 0.5523, sh = new Shape();
  sh.vertices = [[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r], [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r]];
  sh.inTangents = [[-k, 0], [0, 0], [0, -k], [0, 0], [k, 0], [0, 0], [0, k], [0, 0]];
  sh.outTangents = [[0, 0], [k, 0], [0, 0], [0, k], [0, 0], [-k, 0], [0, 0], [0, -k]];
  sh.closed = true; return sh;
}
/**
 * photoBox(item, o) \u2014 \uc0ac\uc9c4\uc744 w\u00d7h \ucc3d\uc5d0 cover \ub85c \ucc44\uc6b0\uace0 \ub465\uadfc \uc0ac\uac01\ud615 \ub9c8\uc2a4\ud06c\ub85c \uc790\ub978\ub2e4 \u2192 \ub808\uc774\uc5b4 \ubc18\ud658.
 * o:{w, h, r, pos(\ucc3d \uc911\uc2ec \uc6d4\ub4dc \uc88c\ud45c), focusY(0~1, \ucc3d \uc911\uc2ec\uc774 \uc62c \uc0ac\uc9c4 \uc138\ub85c \uc704\uce58 \u00b7 \uae30\ubcf8 0.35 = \uc5bc\uad74 \ucabd), t0, t1, name, parentLayer}
 */
function photoBox(item, o) {
  var w = o.w, h = o.h, r = o.r || 0, iw = item.width, ih = item.height;
  var s = Math.max(w / iw, h / ih);                 // cover \ubc30\uc728: \ucc3d\uc744 \ube48\ud2c8\uc5c6\uc774 \ub36e\ub294 \ucd5c\uc18c \ubc30\uc728
  var hw = w / s / 2, hh = h / s / 2;               // \ucc3d \ubc18\ud3ed\u00b7\ubc18\ub192\uc774(\ub808\uc774\uc5b4 \uc88c\ud45c)
  var fy = (o.focusY === undefined) ? 0.35 : o.focusY;
  var ay = Math.min(Math.max(ih * fy, hh), ih - hh); // \ucc3d\uc774 \uc0ac\uc9c4 \ubc16\uc73c\ub85c \ub098\uac00\uc9c0 \uc54a\uac8c \uace0\uc815
  var L = image(item, { pos: o.pos, scale: s * 100, t0: o.t0, t1: o.t1, name: o.name || "Photo", parentLayer: o.parentLayer });
  setv(L.anchorPoint, [iw / 2, ay]);                // \uc575\ucee4 = \ucc3d \uc911\uc2ec \u2192 position \uc774 \uace7 \ucc3d \uc911\uc2ec
  L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom").property("ADBE Mask Shape").setValue(roundRectShape(iw / 2 - hw, ay - hh, hw * 2, hh * 2, r / s));
  return L;
}
/**
 * photoFlash(item, t, dur, o) \u2014 \ube44\ud2b8\uc5d0 \ub9de\ucd98 \uc804\uba74 \uc0ac\uc9c4 \ud558\ub4dc\ucef7 \u2192 \uc0ac\uc9c4 \ub808\uc774\uc5b4. \ub4a4\uc5d0 \uae54\ub9ac\ub3c4\ub85d \uae00\uc790\ubcf4\ub2e4 \uba3c\uc800 \ub9cc\ub4e0\ub2e4.
 * \ud754\ub4e4\ub9bc\uc5d0 \uac00\uc7a5\uc790\ub9ac\uac00 \ub4dc\ub7ec\ub098\uc9c0 \uc54a\uac8c 6% \ud06c\uac8c \ucc44\uc6b0\uace0, \uac80\uc815 \ub9c9(o.dim, \uae30\ubcf8 45)\uc73c\ub85c \uc5b4\ub461\uac8c \ud574 \uc704 \uae00\uc790\uac00 \uc77d\ud788\uac8c \ud55c\ub2e4. 1.08\u21921.00 \uc9e7\uc740 \uc90c.
 */
function photoFlash(item, t, dur, o) {
  o = o || {}; var nm = o.name || "Photo flash";
  if (!item) { log(nm + ": \uc0ac\uc9c4 \uc5c6\uc74c \u2014 \ud558\ub4dc\ucef7 \uc0dd\ub7b5"); return null; }
  var L = photoBox(item, { w: W * 1.06, h: H * 1.06, r: 0, pos: [CX, CY], focusY: 0.4, t0: t, t1: t + dur, name: nm });
  var s = L.scale.value[0];
  setKeys(L.scale, [[t, [s * 1.08, s * 1.08]], [t + dur, [s, s]]], "out");
  var d = rect({ w: W * 1.2, h: H * 1.2, color: COL.black, pos: [CX, CY], t0: t, t1: t + dur, name: nm + " dim" });
  d.opacity.setValue((o.dim === undefined) ? 45 : o.dim);
  return L;
}
/** group(name, pos, t0, t1) \u2014 \ub110 \ucee8\ud2b8\ub864\ub7ec. \uc790\uc2dd\uc740 parentLayer \ub85c \ubd99\uc774\uace0, \uc774 \ub110\uc744 \uc6c0\uc9c1\uc774\uba74 \ubb36\uc74c\uc774 \uc6c0\uc9c1\uc778\ub2e4 */
function group(name, pos, t0, t1) {
  var N = ctx.comp.layers.addNull(DUR); N.name = name; setv(N.anchorPoint, [0, 0]); setv(N.position, pos || [CX, CY]);
  setRange(N, t0, t1); N.parent = ctx.cam; return N;
}

// ---------- UI \uc870\uac01 ----------
/** pill(label, o): \uc54c\uc57d \ubc84\ud2bc(\ub3c4\ud615+\ud14d\uc2a4\ud2b8) \u2192 \ub110 \ubc18\ud658. o:{pos, h:56, padX:28, size:24, color(\ubc30\uacbd), textColor, stroke, t0, t1, name, font} */
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
 * card(o): \uc0c1\ud488/OOTD \uce74\ub4dc \ubb36\uc74c(\ub110+\ub3c4\ud615) \u2192 \ub110 \ubc18\ud658.
 * o:{w:440, h:560, pos, t0, t1, name, price:"AED 149", badge:"NEW", color, imgColor, accent(COL.lime), photo(\ud478\ud2f0\uc9c0), focusY}
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
/** icon(kind, o): "heart" | "bubble" | "plus" | "dot" \u2192 \ub110 \ubc18\ud658. o:{pos, size:120, color, t0, t1, name} */
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
/** arrow(t0, t1, o): \uc67c\u2192\uc624\ub85c \uadf8\ub824\uc9c0\ub294 \ud654\uc0b4\ud45c(\uc120+\ucd09). o:{x0, x1, y, color, thick:10, head:70} \u2192 \ub110 \ubc18\ud658 */
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

// ---------- \ubaa8\uc158 \ud504\ub9ac\uc14b (5\uc885 \ubaa8\uc158 \uc5b8\uc5b4) ----------
/** 1) impactIn(L, t, o): 115%\u2192100% \ucc29\uc9c0 + 2\ud504\ub808\uc784 \ud398\uc774\ub4dc. o:{from:115, dur:f(5), scale:100(\ucd5c\uc885)} */
function impactIn(L, t, o) {
  o = o || {}; var from = o.from || 115, dur = o.dur || f(5), base = o.scale || 100;
  setKeys(L.scale, [[t, [from * base / 100, from * base / 100]], [t + dur, [base, base]]], "out", 85);
  setKeys(L.opacity, [[t, 0], [t + f(2), 100]], "linear");
}
/** 2) slideIn(L, t, dir, o): dir("left"|"right"|"up"|"down") \ucabd\uc5d0\uc11c \ub4e4\uc5b4\uc640 \ud604\uc7ac \uc704\uce58\uc5d0 \uc815\uc9c0. o:{dist:420, dur:0.32, noFade} */
function slideIn(L, t, dir, o) {
  o = o || {}; var dist = o.dist || 420, dur = o.dur || 0.32;
  var p = L.position.valueAtTime(t, false), x = p[0], y = p[1], from = [x, y];
  if (dir === "left") { from = [x - dist, y]; } else if (dir === "right") { from = [x + dist, y]; }
  else if (dir === "up") { from = [x, y - dist]; } else if (dir === "down") { from = [x, y + dist]; }
  setKeys(L.position, [[t, from], [t + dur, [x, y]]], o.mode || "out", 88);
  if (!o.noFade) { setKeys(L.opacity, [[t, 0], [t + f(2), 100]], "linear"); }
}
/** 2') slideOut(L, t, dir, o): \ud604\uc7ac \uc704\uce58\uc5d0\uc11c dir \ubc29\ud5a5(\uc774\ub3d9 \ubc29\ud5a5)\uc73c\ub85c \ube60\uc838\ub098\uac00\uba70 \ucef7. o:{dist:420, dur:0.25, noFade, keep} */
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
/** 3) staggerIn(L, t, o): \uae00\uc790/\ub2e8\uc5b4 \uc21c\ucc28 \ub4f1\uc7a5(\ud14d\uc2a4\ud2b8 \uc560\ub2c8\uba54\uc774\ud130). o:{dur:0.45, by:"chars"|"words", dist:140, dir:"up"|"down"|"left"|"right"|"none", scaleFrom, shape:"ramp"|"square", blur} */
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
    // \ud0c0\uc790\uae30: \uc0ac\uac01 \uc120\ud0dd \ubc94\uc704\ub97c \uc55e\uc5d0\uc11c\ubd80\ud130 \uc77c\uc815 \uc18d\ub3c4\ub85c \uc904\uc778\ub2e4 (Start 0\u2192100, linear \u2014 ease \ub97c \uc8fc\uba74 \uccab \ud504\ub808\uc784\uc5d0 \uae00\uc790\uac00 \ud55c\uaebc\ubc88\uc5d0 \ub72c\ub2e4)
    setKeys(sel.property("ADBE Text Percent Start"), [[t, 0], [t + dur, 100]], "linear");
  } else {
    // Ramp Up \uc740 End \ub4a4 \uae00\uc790\ub97c \uc804\ubd80 \uc120\ud0dd(\uc228\uae40)\ud558\ubbc0\ub85c, \ud3ed W \uc758 \ucc3d\uc744 Offset \uc73c\ub85c -W\u2192100 \uc4f8\uc5b4 \uc9c0\ub098\uac00\uac8c \ud55c\ub2e4
    var win = o.window || 30;
    sel.property("ADBE Text Percent Start").setValue(0);
    sel.property("ADBE Text Percent End").setValue(win);
    setKeys(sel.property("ADBE Text Percent Offset"), [[t, -win], [t + dur, 100]], "out", 70);
  }
  return an;
}
/** 3') staggerOut(L, t, o): \uc55e \uae00\uc790\ubd80\ud130 \uc21c\ucc28 \ud1f4\uc7a5 \ud6c4 \ucef7. o:{dur:0.3, by, dist:80, dir(\uc774\ub3d9 \ubc29\ud5a5), keep} */
function staggerOut(L, t, o) {
  o = o || {}; var dur = o.dur || 0.3, dist = (o.dist === undefined) ? 80 : o.dist, dir = o.dir || "up";
  var an = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
  an.name = "StaggerOut";
  var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
  var adv = sel.property("ADBE Text Range Advanced");
  if (o.by === "words") { adv.property("ADBE Text Range Type2").setValue(3); }
  // Ramp Down: \ucc3d \uc55e \uae00\uc790 = \uc804\ubd80 \uc120\ud0dd(\uc228\uae40), \ucc3d \ub4a4 = \ubbf8\uc120\ud0dd(\ubcf4\uc784). \ucc3d\uc744 -W\u2192100 \uc73c\ub85c \uc4f8\uba74 \uc55e \uae00\uc790\ubd80\ud130 \uc0ac\ub77c\uc9c4\ub2e4
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
/** typeOn(L, t, dur): \ud0c0\uc790\uae30 \ub4f1\uc7a5(\uae00\uc790 \ub2e8\uc704 \uc989\uc2dc \ud45c\uc2dc) */
function typeOn(L, t, dur) { return staggerIn(L, t, { dur: dur || 0.4, dist: 0, dir: "none", shape: "square" }); }
/**
 * gloss(str, o) \u2014 \ud55c\uad6d\uc5b4 \ubb38\uad6c \uc544\ub798 \uc791\uc740 \uc601\uc5b4 \ud45c\uae30(\ud55c\u00b7\uc601 \uc774\uc911 \ud45c\uae30). \ud55c\uad6d\uc5b4\ubcf4\ub2e4 2\ud504\ub808\uc784 \ub2a6\uac8c typeOn.
 * o:{pos, t0, t1, size(36), color(lime), tracking(250), anchor, justify, delay(\ucd08, \uae30\ubcf8 2f), still(true = \ub4f1\uc7a5 \ubaa8\uc158 \uc5c6\uc74c \u00b7 \uc2a4\ud2f0\ucee4 \uc548), name, parentLayer}
 */
function gloss(str, o) {
  var t = o.t0 + ((o.delay === undefined) ? f(2) : o.delay);
  if (o.still) { t = o.t0; }
  var L = text(str, { font: "enMid", size: o.size || 36, color: o.color || COL.lime, tracking: (o.tracking === undefined) ? 250 : o.tracking,
    anchor: o.anchor, justify: o.justify, pos: o.pos, t0: t, t1: o.t1, name: o.name || ("gloss " + str), parentLayer: o.parentLayer });
  if (!o.still) { typeOn(L, t, 0.15); }
  return L;
}
/** 4) rgbSplit(L, t, o): RGB \ubd84\ub9ac \uae00\ub9ac\uce58 \u2014 t\ubd80\ud130 frames \ud504\ub808\uc784\ub9cc. \uc6d0\ubcf8 \uc704\uc5d0 \ube68\uac15/\uc2dc\uc548 \ubcf5\uc81c\ubcf8(ADD) \uc0dd\uc131. o:{frames:2, offset:14} */
function rgbSplit(L, t, o) {
  o = o || {}; var frames = o.frames || 2, off = o.offset || 14;
  var spec = [[COL.red, -1], [COL.cyan, 1]];
  var a = L.anchorPoint.valueAtTime(t, false);
  for (var i = 0; i < 2; i++) {
    var D = L.duplicate(); D.name = L.name + (i === 0 ? " _R" : " _C");
    // \uc6d0\ubcf8\uc758 \ud398\uc774\ub4dc \ud0a4(impactIn \uc758 opacity 0\u2192100)\ub97c \ubb3c\ub824\ubc1b\uc73c\uba74 \uae00\ub9ac\uce58 \uccab \ud504\ub808\uc784\uc774 \ud22c\uba85\ud574\uc9c0\ubbc0\ub85c \ubcf5\uc81c\ubcf8\uc740 \ud56d\uc0c1 100%
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
/** 4') flash(color, t, o): \uc804\uccb4 \ud654\uba74 \ubc88\uca4d. o:{dur:0.16, peak:100} \u2192 \uc194\ub9ac\ub4dc \ubc18\ud658 */
function flash(color, t, o) {
  o = o || {}; var dur = o.dur || 0.16, peak = (o.peak === undefined) ? 100 : o.peak;
  var S = solid(color, t, t + dur, "Flash");
  setKeys(S.opacity, [[t, peak], [t + dur, 0]], "out", 70);
  return S;
}
/** 4'') shake(t, o): \uce74\uba54\ub77c \ud754\ub4e4\ub9bc(CTRL Shake \uc2ac\ub77c\uc774\ub354). o:{amount:1(0~2), dur:0.35} */
function shake(t, o) {
  o = o || {}; var amt = (o.amount === undefined) ? 1 : o.amount, dur = o.dur || 0.35, s = ctx.shakeSlider;
  // \uc55e\uc120 shake \uc758 \uac10\uc1e0 \ud0a4\uac00 \uc774\ubc88 \uad6c\uac04 \uc548\uc5d0 \ub0a8\uc544 \uc788\uc73c\uba74 \uc0c8 \ud754\ub4e4\ub9bc\uc774 1\ud504\ub808\uc784 \ub9cc\uc5d0 \uaebc\uc9c0\ubbc0\ub85c \uba3c\uc800 \uc9c0\uc6b4\ub2e4
  clearKeys(s, t - f(1) + 0.0001, t + dur - 0.0001);
  key(s, t - f(1), 0); key(s, t, amt); var i = key(s, t + dur, 0); easeKey(s, i, 80, 80);
}
/** clearKeys(prop, from, to) \u2014 [from, to] \uad6c\uac04\uc758 \ud0a4\ud504\ub808\uc784 \uc81c\uac70 */
function clearKeys(prop, from, to) {
  for (var k = prop.numKeys; k >= 1; k--) { var kt = prop.keyTime(k); if (kt >= from && kt <= to) { prop.removeKey(k); } }
}
/** 5) popIn(L, t, o): \ud0c4\uc131 \ud31d(0\u2192114\u219295\u2192100). \uc544\uc774\ucf58\u00b7\ubc30\uc9c0 \uc804\uc6a9. o:{dur:0.36, scale:100} */
function popIn(L, t, o) {
  o = o || {}; var base = o.scale || 100, dur = o.dur || 0.36;
  setKeys(L.scale, [[t, [0, 0]], [t + dur * 0.5, [base * 1.14, base * 1.14]], [t + dur * 0.78, [base * 0.95, base * 0.95]], [t + dur, [base, base]]], "inout", 60);
  setKeys(L.opacity, [[t, 0], [t + f(1), 100]], "linear");
}
/** 5') popOut(L, t, o): \ucd95\uc18c \ud1f4\uc7a5 \ud6c4 \ucef7. o:{dur:0.18, keep} */
function popOut(L, t, o) {
  o = o || {}; var dur = o.dur || 0.18, cur = L.scale.valueAtTime(t, false)[0];
  setKeys(L.scale, [[t, [cur, cur]], [t + dur, [0, 0]]], "in", 80);
  if (!o.keep) { cutAt(L, t + dur); }
}
/** pulse(L, t, o): \ube44\ud2b8 \ud55c \ubc88\uc5d0 \ub9de\ucdb0 \ud280\uae30(\uc751\ub2f5 \ucc48\ud2b8\uc6a9). o:{amount:1.1, dur:0.22} */
function pulse(L, t, o) {
  o = o || {}; var amt = o.amount || 1.1, dur = o.dur || 0.22, cur = L.scale.valueAtTime(t, false)[0];
  setKeys(L.scale, [[t, [cur, cur]], [t + dur * 0.35, [cur * amt, cur * amt]], [t + dur, [cur, cur]]], "inout", 60);
}
/** beatScale(L, amount): \ube44\ud2b8\ub9c8\ub2e4 amount% \ud280\ub294 expression (\ud0a4\ud504\ub808\uc784 \uc704\uc5d0 \ub354\ud574\uc9d0) */
function beatScale(L, amount) {
  amount = (amount === undefined) ? 6 : amount;
  L.scale.expression = "var b = thisComp.layer(\"CTRL\").effect(\"Beat\")(\"Slider\"); var a = " + amount + "; value + [a * b, a * b" + (dims(L.scale) === 3 ? ", 0" : "") + "];";
}
/** beatOpacity(L, lo, hi): \ube44\ud2b8\uc5d0 \ub530\ub77c \ubd88\ud22c\uba85\ub3c4 lo~hi */
function beatOpacity(L, lo, hi) { L.opacity.expression = "var b = thisComp.layer(\"CTRL\").effect(\"Beat\")(\"Slider\"); linear(b, 0, 1, " + lo + ", " + hi + ");"; }
/** strike(L, t, o): \ud14d\uc2a4\ud2b8 \uc704\uc5d0 \ucde8\uc18c\uc120\uc744 \uc67c\u2192\uc624\ub85c \uae0b\uae30. o:{color:COL.purple, dur:0.18, thick:14, yOffset:0, pad:24, t1} \u2192 \ub3c4\ud615 \ubc18\ud658 */
function strike(L, t, o) {
  o = o || {}; var dur = o.dur || 0.18, padX = (o.pad === undefined) ? 24 : o.pad;
  var b = bbox(L, t);
  var B = rect({ w: b.width + 2 * padX, h: o.thick || 14, color: o.color || COL.purple, pos: [b.left - padX, b.cy + (o.yOffset || 0)], anchor: "left", t0: t, t1: o.t1 || L.outPoint, name: "Strike" });
  setKeys(B.scale, [[t, [0, 100]], [t + dur, [100, 100]]], "out", 85);
  return B;
}
/** scanline(t0, t1, o): \ubc1c\uad11 \uc2a4\uce94\ub77c\uc778\uc774 y0\u2192y1 \ub85c \uc774\ub3d9. o:{x, w:700, h:6, yFrom, yTo, color} */
function scanline(t0, t1, o) {
  o = o || {}; var x = o.x || CX, w = o.w || 700, y0 = (o.yFrom === undefined) ? 500 : o.yFrom, y1 = (o.yTo === undefined) ? 1400 : o.yTo;
  var Lb = rect({ w: w, h: o.h || 6, color: o.color || COL.lime, pos: [x, y0], t0: t0, t1: t1, name: "Scanline" });
  glow(Lb, { radius: 40, intensity: 1.6, threshold: 20 });
  setKeys(Lb.position, [[t0, [x, y0]], [t1, [x, y1]]], "linear");
  return Lb;
}

// ---------- \uc774\ud399\ud2b8 ----------
function fxAdd(L, matchName) { return L.property("ADBE Effect Parade").addProperty(matchName); }
/** glow(L, o): o:{threshold:55(%), radius:60, intensity:1.0} */
function glow(L, o) {
  o = o || {}; var g = fxAdd(L, "ADBE Glo2");
  try { g.property("ADBE Glo2-0002").setValue((o.threshold === undefined) ? 55 : o.threshold); g.property("ADBE Glo2-0003").setValue(o.radius || 60); g.property("ADBE Glo2-0004").setValue((o.intensity === undefined) ? 1.0 : o.intensity); }
  catch (e) { log("glow props: " + e); }
  return g;
}
/** tint(L, blackTo, whiteTo, amount): \ub4c0\uc624\ud1a4 */
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

// ---------- \ud504\ub85c\uc81d\ud2b8 \uc14b\uc5c5 / \ub9c8\ubb34\ub9ac / \ub80c\ub354 ----------
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
    ctx.photos[PHOTO_NAMES[pi]] = importFootage(PHOTO_DIR + "/" + PHOTO_NAMES[pi] + ".jpg");   // \uc2e4\ud328 \uc2dc null + "missing footage" \ub85c\uadf8 \u2192 \ud68c\uc0c9 \uce74\ub4dc
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
  // \ubd80\ubd84 \ub80c\ub354(\uc2a4\ubaa8\ud06c \ud14c\uc2a4\ud2b8\u00b7\uad6c\uac04 \ud655\uc778\uc6a9): \ube4c\ub4dc \uc2dc var RENDER_SPAN = [\uc2dc\uc791, \ub05d] \uc744 \uc55e\uc5d0 \uc8fc\uc785\ud558\uba74 \uadf8 \uad6c\uac04\ub9cc \ub80c\ub354
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

// ===== 10-s01-intro-seoul.jsx =====
// S01 intro-seoul \u2014 "Seoul! (Now loading)" (0.00\u20132.20)
// \uc608\uc678: \ub85c\ub529 UI(\ub77c\ubca8\u00b7\ud2b8\ub799\u00b7\ucc44\uc6c0\u00b7\ud37c\uc13c\ud2b8)\ub9cc 4.42 \uae4c\uc9c0 \uc0b0\ub2e4(SPEC \u00a73 S01 \uc608\uc678 4.40 + slideOut \uc644\uacb0, \u00a70.4 \ub05d +0.30 \uc548). \ub098\uba38\uc9c0\ub294 2.20 \uc5d0\uc11c \ub04a\ub294\ub2e4.
scene("S01", T.seoul, T.uaeU, function (ctx) {
  var t0 = T.seoul, t1 = T.uaeU;
  // SPEC \uc758 4.30(\ud1f4\uc7a5 \uc2dc\uc791)\uc740 T \uc5d0 \ud0a4\uac00 \uc5c6\uc5b4 T.loadingDone(4.28) \uae30\uc900 \uc624\ud504\uc14b\uc73c\ub85c \uc4f4\ub2e4
  var tUiOut = T.loadingDone + 0.02;   // 4.30
  // SPEC \uc758 "4.40 \uae4c\uc9c0" \uc640 "4.30 \ubd80\ud130 slideOut dur 0.12"(=4.42) \ub294 \uc11c\ub85c \ubaa8\uc21c \u2014 \u00a70.12(\uba85\uc2dc\ub41c \ud1f4\uc7a5 \ubaa8\uc158\uc740 \uc218\ud589) \uc5d0 \ub530\ub77c \ubaa8\uc158\uc774 \ub05d\uae4c\uc9c0 \ubcf4\uc774\ub294 4.42 \ub97c \ud0dd\ud55c\ub2e4
  var tUiEnd = tUiOut + 0.12;          // 4.42 (SPEC 4.40 \ubcf4\ub2e4 0.02 \ub2a6\uc74c, \u00a70.4 \ub05d +0.30 \uc548)
  var seoulOutDur = 0.18;              // 2.20 slideOut \uae38\uc774 \u2192 SEOUL \ub808\uc774\uc5b4\ub294 2.38 \uae4c\uc9c0(\ud5c8\uc6a9 \uc624\ucc28 +0.30 \uc548)

  // 2\ud504\ub808\uc784 \ub9c8\uc774\ud06c\ub85c \ubaa8\uc158(\ubc88\uca4d\u00b7\uc2ec\uc7a5\ubc15\ub3d9)\uc740 \ud0a4\ub97c \ud504\ub808\uc784 \uaca9\uc790\uc5d0 \ub9de\ucdb0\uc57c \ub80c\ub354 \ud504\ub808\uc784\uc774 40% \uc5d0 \uc815\ud655\ud788 \ub2ff\ub294\ub2e4
  // (4.28 = 128.4f, BEATS[4] 1.741 = 52.23f \ucc98\ub7fc \ube44\uc815\ub82c \uc2dc\uac01\uc5d0 \ucc0d\uc73c\uba74 \ub525\uc774 \ub450 \ud504\ub808\uc784\uc5d0 \uac78\uccd0 \uc595\uc544\uc9c4\ub2e4)
  function snap(t) { return Math.round(t * FPS) / FPS; }

  // \uc2ec\uc7a5\ubc15\ub3d9: opacity 100\u219240\u2192100, \uac01 2\ud504\ub808\uc784, linear(hold \uc544\ub2d8)
  function heartbeat(L, t) {
    t = snap(t);
    setKeys(L.opacity, [[t, 100], [t + f(1), 40], [t + f(2), 100]], "linear");
  }

  // ---------- \ub4a4: \ub85c\ub529 UI (\ubcf4\uc870) ----------
  // \ud2b8\ub799 640\u00d78 gray2, \uc88c\uce21 \uc575\ucee4 (220, 1200)
  var track = rect({ w: 640, h: 8, color: COL.gray2, anchor: "left", pos: [220, 1200], t0: T.loading1, t1: tUiEnd, name: "S01 loading track" });

  // \ucc44\uc6c0 640\u00d78 lime, \ud2b8\ub799\uacfc \uac19\uc740 \uc704\uce58. \uc88c\uce21 \uc575\ucee4\ub77c scale X \uac00 \uc67c\u2192\uc624\ub85c \ucc2c\ub2e4
  var fill = rect({ w: 640, h: 8, color: COL.lime, anchor: "left", pos: [220, 1200], t0: T.loading1, t1: tUiEnd, name: "S01 loading fill" });
  // r02 \uac80\uc218: \ud37c\uc13c\ud2b8 \uc22b\uc790(linear expression)\uc640 \uc9c4\ud589\ub960\uc774 \uc5b4\uae0b\ub098\uc9c0 \uc54a\ub3c4\ub85d \ucc44\uc6c0\ub3c4 linear
  setKeys(fill.scale, [[T.loading1, [0, 100]], [T.uaeU, [50, 100]]], "linear");          // 0.62\u21922.20: 0\u219250
  setKeys(fill.scale, [[T.loading2, [50, 100]], [T.loadingDone, [100, 100]]], "linear");  // 3.62\u21924.28: 50\u2192100 (2.20~3.62 \ub294 50 \uc720\uc9c0)
  // 4.28 \ubc88\uca4d \u2014 SPEC \uc9c0\uc815 \ubc29\uc2dd \uadf8\ub300\ub85c opacity 100\u219240\u2192100 (2\ud504\ub808\uc784). 128f(4.2667) \ub85c \uc2a4\ub0c5\ud574 \ub525\uc774 f129(4.30) \uc5d0\uc11c \uc815\ud655\ud788 40%
  var tFl = snap(T.loadingDone);
  setKeys(fill.opacity, [[tFl, 100], [tFl + f(1), 40], [tFl + f(2), 100]], "linear");

  // "NOW LOADING" lime en 40 tracking 500 \u2014 \ud3ed \uc5b4\ub9bc: 11\u00d70.62\u00d740 \u2248 273 + \uc790\uac04 (500/1000\u00d740)\u00d710 = 200 \u2192 \u2248 473px \u2264 920
  var label = text("NOW LOADING", { font: "en", size: 40, tracking: 500, color: COL.lime, pos: [540, 1120], t0: T.loading1, t1: tUiEnd, name: "S01 loading label" });
  typeOn(label, T.loading1, 0.3);

  // \ud37c\uc13c\ud2b8 \u2014 "100%" \ud3ed \uc5b4\ub9bc: 4\u00d70.62\u00d732 \u2248 79px. SPEC \uc740 pos \ub9cc \uc92c\uc73c\ubbc0\ub85c \uc88c\uce21 \uc575\ucee4\ub85c 900\u2192979 \ub85c \uc624\ub978\ucabd\uc73c\ub85c\ub9cc \uc790\ub77c\uac8c \ud574
  // \ucc44\uc6c0\ubc14 \uc6b0\uce21 \ub05d(860)\uacfc \uac04\uaca9 40px \uc744 \uace0\uc815\ud55c\ub2e4(\uc911\uc559 \uc575\ucee4\uba74 "100%" \ub54c \uc88c\uce21 \ub05d \u2248860 \uc73c\ub85c \ubc14\uc5d0 \ub9de\ub2ff\uace0 \uc790\ub9bf\uc218\ub9c8\ub2e4 \ub5a8\ub9b0\ub2e4).
  // counter \uae30\ubcf8 expression \uc744 \ub450 \uad6c\uac04(0\u219250 / 50\u2192100)\uc73c\ub85c \ub36e\uc5b4\uc4f4\ub2e4
  var pct = counter(0, 100, T.loading1, T.loadingDone, { font: "en", size: 32, color: COL.lime, pos: [900, 1200], anchor: "left", justify: "left", t1: tUiEnd, name: "S01 loading pct" });
  pct.property("ADBE Text Properties").property("ADBE Text Document").expression =
    "Math.round(time <= " + T.uaeU + " ? linear(time, " + T.loading1 + ", " + T.uaeU + ", 0, 50) : linear(time, " + T.loading2 + ", " + T.loadingDone + ", 50, 100)) + \"%\"";

  // 4.30 \ubd80\ud130 \ub85c\ub529 UI \uc804\uccb4\uac00 \uc544\ub798\ub85c \ud1f4\uc7a5 (dur 0.12 \u2192 4.42 \uc5d0\uc11c \ucef7 = tUiEnd)
  slideOut(track, tUiOut, "down", { dist: 300, dur: 0.12 });
  slideOut(fill, tUiOut, "down", { dist: 300, dur: 0.12 });
  slideOut(label, tUiOut, "down", { dist: 300, dur: 0.12 });
  slideOut(pct, tUiOut, "down", { dist: 300, dur: 0.12 });

  // ---------- \uc55e: \uc8fc\uc778\uacf5 "SEOUL" ----------
  // \ud3ed \uc5b4\ub9bc: 5\u00d70.62\u00d7300 = 930 \u2212 \uc790\uac04 (40/1000\u00d7300)\u00d74 = 48 \u2192 \u2248 882px \u2264 920
  var seoul = text("SEOUL", { font: "en", size: 300, vscale: 110, tracking: -40, color: COL.white, pos: [540, 900], t0: t0, t1: t1 + seoulOutDur, name: "S01 SEOUL" });
  impactIn(seoul, t0);
  rgbSplit(seoul, t0, { frames: 2, offset: 18 });   // \ubcf5\uc81c\ubcf8\uc774 impactIn \ud0a4\ub97c \ubb3c\ub824\ubc1b\ub3c4\ub85d impactIn \ub4a4\uc5d0 \ud638\ucd9c
  // core shake() \ub294 t\u22121f \uc5d0 0 \ud0a4\ub97c \ucc0d\ub294\ub2e4. t0 = 0 \uc774\uba74 \uc74c\uc218 \uc2dc\uac01(\u22120.033) \ud0a4\uac00 \ub418\ub294\ub370 AE \uac00 \ubc1b\uc544\uc8fc\ub294\uc9c0 \ubbf8\uac80\uc99d(\uc2a4\ubaa8\ud06c\ub294 shake(0.1)\ub9cc)\uc774\ub77c
  // 1\ud504\ub808\uc784 \ub2a6\ucdb0 \ud0a4\ub97c 0/0.033/0.383 \uc5d0 \ub454\ub2e4. f0 \uc740 impactIn \ub54c\ubb38\uc5d0 SEOUL opacity 0 \uc774\ub77c \uccb4\uac10 \ucc28\uc774 \uc5c6\uc74c
  shake(t0 + f(1), { amount: 0.6 });
  heartbeat(seoul, BEATS[3]);   // 1.300 \ube44\ud2b8 (= 39f, \uc2a4\ub0c5\ud574\ub3c4 \ub3d9\uc77c)
  heartbeat(seoul, BEATS[4]);   // 1.741 \ube44\ud2b8 \u2192 52f(1.733) \uc2a4\ub0c5: \ub525\uc774 f53 \uc5d0\uc11c \uc815\ud655\ud788 40%
  slideOut(seoul, t1, "up", { dist: 600, dur: seoulOutDur });   // 2.20 \u2192 2.38 \ucef7
});

// ===== 11-s02-intro-uae.jsx =====
// S02 intro-uae \u2014 "UAE! (Now loading)" (2.20\u20134.28)
// U\u00b7A\u00b7E \uac00 \uc21c\uc11c\ub300\ub85c \ucc29\uc9c0(\uc8fc\uc778\uacf5 \uad50\ub300) \u2192 lime \ubc11\uc904 \u2192 3.62 \uc5d0 \uc804\uccb4\uac00 72% \ub85c \uc904\uba70 y 760 \uc73c\ub85c \uc0c1\uc2b9 \u2192 4.28 \uc704\ub85c \uc2ac\ub77c\uc774\ub4dc\uc544\uc6c3.
// \ud14d\uc2a4\ud2b8 \ud3ed \uc5b4\ub9bc(\u00a70.10): en \ub300\ubb38\uc790 1\uae00\uc790 \u2248 0.62 \u00d7 420 = 260px \u2264 920px.
scene("S02", T.uaeU, T.loadingDone, function (ctx) {
  var slideDur = 0.16;                        // 4.28 \ud1f4\uc7a5 \uc2ac\ub77c\uc774\ub4dc \uae38\uc774(SPEC). \ub808\uc774\uc5b4\ub294 \uc774\ub9cc\ud07c\ub9cc \uc7a5\uba74 \ub05d\uc744 \ub118\uc5b4 \uc0b0\ub2e4(\ud5c8\uc6a9 +0.30 \uc548)
  var tEnd = T.loadingDone + slideDur;        // 4.44 \u2014 slideOut \uc774 \ub05d\uae4c\uc9c0 \ubcf4\uc774\ub824\uba74 t1 \uc774 \uc5ec\uae30\uae4c\uc9c0 \uc640\uc57c \ud55c\ub2e4
  var shrink = 0.72;                          // 3.62 \ucd95\uc18c \ube44\uc728(scaleTo 100\u219272)
  var shrinkDur = 0.25;
  var baseY = 900, upY = 760;                 // \uae00\uc790 \uc911\uc2ec y: \ub4f1\uc7a5 900 \u2192 \uc0c1\uc2b9 \ud6c4 760
  var gx = CX;                                // \ucd95\uc18c \uae30\uc900 x(\uc138 \uae00\uc790\uc758 \uac00\uc6b4\ub370 = 540)

  // 3.62 \uc0c1\uc2b9: \uae00\uc790 \uc911\uc2ec\uc774 y 760 \uc774 \ub418\ub3c4\ub85d \uc62c\ub9b0\ub2e4. group \uc73c\ub85c \ubb36\uc9c0 \ub9d0\ub77c\ub294 SPEC \uc5d0 \ub530\ub77c \ub808\uc774\uc5b4\ub9c8\ub2e4 \ub530\ub85c \uac78\ub418,
  // \ud558\ub098\ub85c \ubb36\uc5b4 \uc904\uc778 \uac83\ucc98\ub7fc \ubcf4\uc774\ub3c4\ub85d x \uc640 \ubc11\uc904\uc758 \uc138\ub85c \uac04\uaca9\ub3c4 \uac19\uc740 \ube44\uc728(0.72)\ub85c 540\u00b7900 \uae30\uc900\uc73c\ub85c \ubaa8\uc740\ub2e4.
  function liftTo(L, x, y) {
    var nx = gx + (x - gx) * shrink;
    var ny = upY + (y - baseY) * shrink;
    scaleTo(L, T.loading2, T.loading2 + shrinkDur, 100, 100 * shrink, "inout");
    moveTo(L, T.loading2, T.loading2 + shrinkDur, [nx, ny], "inout");
  }

  // \uae00\uc790 1\uac1c: impactIn(from 130) + rgbSplit(2f, 20) + shake(0.8).
  // impactIn \uc744 \uba3c\uc800 \uac78\uc5b4\uc57c rgbSplit \uc758 \ubcf5\uc81c\ubcf8(duplicate)\uc774 \ucc29\uc9c0 \ud0a4\ud504\ub808\uc784\uc744 \ubb3c\ub824\ubc1b\uc544 \uae00\uc790\uc640 \ud568\uaed8 \ub5a8\uc5b4\uc9c4\ub2e4.
  function letter(ch, x, t) {
    var L = text(ch, { font: "en", size: 420, color: COL.white, pos: [x, baseY], t0: t, t1: tEnd, name: "S02 " + ch });
    impactIn(L, t, { from: 130 });
    rgbSplit(L, t, { frames: 2, offset: 20 });
    shake(t, { amount: 0.8 });
    return L;
  }

  // \ub4a4 \u2192 \uc55e: \ubc11\uc904(\ubcf4\uc870) \u2192 U \u2192 A \u2192 E (\uc8fc\uc778\uacf5\uc740 \uc2dc\uac01 \uc21c\uc11c\ub300\ub85c \uad50\ub300)
  // r02 \uac80\uc218: y 1110 \uc740 S01 "NOW LOADING" \ub77c\ubca8(y 1120)\uc744 \uad00\ud1b5\ud574 \ucde8\uc18c\uc120\ucc98\ub7fc \ubcf4\uc5ec \uae00\uc790 \ubc14\ub85c \uc544\ub798(1072)\ub85c \uc62c\ub9bc
  var ulY = 1072;
  var ul = rect({ w: 560, h: 14, color: COL.lime, pos: [260, ulY], anchor: "left", t0: T.uaeE, t1: tEnd, name: "S02 underline" });
  setKeys(ul.scale, [[T.uaeE, [0, 100]], [T.uaeE + 0.26, [100, 100]]], "out");   // 3.14\u21923.40 \uc67c\u2192\uc624\ub85c \uae0b\uae30(anchor left \uae30\uc900)

  var U = letter("U", 300, T.uaeU);
  var A = letter("A", 540, T.uaeA);
  var E = letter("E", 780, T.uaeE);

  // 3.62 (Now loading 2): \uc138 \uae00\uc790\u00b7\ubc11\uc904 \uac01\uac01 72% \ub85c \uc904\uba70 \uc704\ub85c(0.25s inout). \ub85c\ub529\ubc14 100% \ucc44\uc6c0\uc740 S01 \ub2f4\ub2f9.
  liftTo(U, 300, baseY);
  liftTo(A, 540, baseY);
  liftTo(E, 780, baseY);
  liftTo(ul, 260, ulY);

  // 4.28: \uc138 \uae00\uc790\u00b7\ubc11\uc904 \uc804\ubd80 \uc704\ub85c \uc2ac\ub77c\uc774\ub4dc\uc544\uc6c3(dist 700, dur 0.16) \u2192 cutAt 4.44
  var outs = [U, A, E, ul], i;
  for (i = 0; i < outs.length; i++) { slideOut(outs[i], T.loadingDone, "up", { dist: 700, dur: slideDur }); }
});

// ===== 12-s03-intro-potata.jsx =====
// S03 intro-potata \u2014 Po-ta-ta! (Let's go!) (4.28\u20137.00)
// \ud5ec\ud37c API \ub294 00-core.jsx \uac00 SSoT. \ub808\uc774\uc5b4\ub294 \ub4a4\u2192\uc55e \uc21c\uc11c\ub85c \ub9cc\ub4e0\ub2e4.
scene("S03", T.loadingDone, T.kfashion, function (ctx) {
  var t0 = T.loadingDone, t1 = T.kfashion;
  // SPEC: purple \uc810\uc740 \uc7a5\uba74 \uc2dc\uc791(4.28)\u00b7LET'S GO \ucef7(6.44) \ub4a4 0.02s \ubd80\ud130 (4.30 / 6.46)
  var DOT_GAP = 0.02;
  // SPEC \uc9c0\uc815 \ube44\ud2b8: 5.596(\uc138 \ub2e8\uc5b4 pulse) \u00b7 6.455(LET'S GO rgbSplit 2\ud68c\ucc28)
  var tPulse = BEATS[13], tGlitch2 = BEATS[15];

  // 1) 4.30\u20134.74 \uc228 \uace0\ub974\uae30 \u2014 \uc911\uc559 purple \uc810 24px, \ube44\ud2b8\uc5d0 \ub530\ub77c \ubd88\ud22c\uba85\ub3c4 20~100
  var dot1 = ellipse({ w: 24, h: 24, color: COL.purple, pos: [540, 960], t0: t0 + DOT_GAP, t1: T.po1, name: "S03 dot 1" });
  beatOpacity(dot1, 20, 100);

  // 2) 4.74 "PO" lime \u2014 \uc8fc\uc778\uacf5. \ud3ed \uc5b4\ub9bc 2 \u00d7 0.62 \u00d7 360 = 446px (\u2264 920)
  var po = text("PO", { font: "en", size: 360, color: COL.lime, pos: [540, 760], t0: T.po1, t1: T.letsGo, name: "S03 PO" });
  impactIn(po, T.po1, { from: 125 });
  rgbSplit(po, T.po1);
  shake(T.po1, { amount: 1.0 });

  // 3) 4.95 "TA" white \u2014 \ud3ed \uc5b4\ub9bc 446px
  var ta1 = text("TA", { font: "en", size: 360, color: COL.white, pos: [540, 1010], t0: T.ta1, t1: T.letsGo, name: "S03 TA 1" });
  impactIn(ta1, T.ta1, { from: 125 });

  // 4) 5.16 "TA" purple \u2014 \ud3ed \uc5b4\ub9bc 446px
  var ta2 = text("TA", { font: "en", size: 360, color: COL.purple, pos: [540, 1260], t0: T.ta2, t1: T.letsGo, name: "S03 TA 2" });
  impactIn(ta2, T.ta2, { from: 125 });
  shake(T.ta2, { amount: 1.0 });

  // 5) 5.596 \ube44\ud2b8 \u2014 \uc138 \ub2e8\uc5b4 pulse(1.06). \uc138 \ub2e8\uc5b4\ub294 t1 5.80 \uc5d0\uc11c \ud558\ub4dc\ucef7
  pulse(po, tPulse, { amount: 1.06 });
  pulse(ta1, tPulse, { amount: 1.06 });
  pulse(ta2, tPulse, { amount: 1.06 });

  // 6) 5.80\u20136.44 "LET'S GO!" \u2014 lime \uc194\ub9ac\ub4dc(\ud558\ub4dc\ucef7 \uc778/\uc544\uc6c3, parent \uc5c6\uc74c) \uc704\uc5d0 black \ud14d\uc2a4\ud2b8
  //    \ud3ed \uc5b4\ub9bc: \ub300\ubb38\uc790 6\uc790 \u00d7 0.62 + (' 0.25 + \uacf5\ubc31 0.25 + ! 0.30) \u2248 4.52em \u00d7 200 \u2248 904px (\u2264 920, \ube60\ub4ef\ud568)
  solid(COL.lime, T.letsGo, T.introEnd, "S03 letsgo bg");
  var lg = text("LET'S GO!", { font: "en", size: 185, vscale: 115, color: COL.black, pos: [540, 960], t0: T.letsGo, t1: T.introEnd, name: "S03 LET'S GO" });
  impactIn(lg, T.letsGo, { from: 120 });
  rgbSplit(lg, T.letsGo, { frames: 3, offset: 22 });
  shake(T.letsGo, { amount: 1.3 });
  // 6.455 \ube44\ud2b8\uc5d0 rgbSplit(2f) \ud55c \ubc88 \ub354 \u2014 SPEC \uadf8\ub300\ub85c(\uc194\ub9ac\ub4dc\u00b7\ud14d\uc2a4\ud2b8 \ucef7 6.44 \uc9c1\ud6c4\ub77c \uac80\uc815 \uc704\uc5d0 R/C \uc794\uc0c1 2\ud504\ub808\uc784)
  rgbSplit(lg, tGlitch2, { frames: 2 });

  // 7) 6.46\u20137.00 \uac80\uc815 \u2014 purple \uc810 \ub2e4\uc2dc
  var dot2 = ellipse({ w: 24, h: 24, color: COL.purple, pos: [540, 960], t0: T.introEnd + DOT_GAP, t1: t1, name: "S03 dot 2" });
  beatOpacity(dot2, 20, 100);
});

// ===== 13-s04-hook-text.jsx =====
// S04 hook-text \u2014 "K-fashion? Too far? Not anymore" (7.00\u201310.30)
scene("S04", T.kfashion, T.scroll, function (ctx) {
  var t0 = T.kfashion, t1 = T.scroll;
  var P = [540, 940];                 // SPEC: \uc138 \ubb38\uad6c \ubaa8\ub450 \uac19\uc740 \uc911\uc2ec
  var outDur = 0.15;                  // "K-FASHION?" slideOut \uae38\uc774
  var tGlitch2 = T.scroll - 0.20;     // 10.10 \u2014 SPEC \uba85\uc2dc \uc2dc\uac01(T \ud0a4 \uc5c6\uc74c \u2192 \uc7a5\uba74 \ub05d \uae30\uc900 \uc5ed\uc0b0)

  // \ud3ed \uc5b4\ub9bc(\u00a70.10 \u00b7 Outfit ExtraBold 1\uae00\uc790 \u2248 0.62\u00d7size) \u2014 \ud55c \uc904 \u2264 920px \uc774 \ub418\ub3c4\ub85d size \uc870\uc815.
  // SPEC \uc218\uce58 \uadf8\ub300\ub85c\uba74 \uc2e4\uce21(Outfit-ExtraBold.ttf advance)\uc73c\ub85c\ub3c4 \uce94\ubc84\uc2a4 1080 \uc744 \ub118\ub294\ub2e4.
  //  "K-FASHION?" 10\uc790 tracking -30 : SPEC 190 \u2192 \uc5b4\ub9bc 1178px / \uc2e4\uce21 1131px (\ucd08\uacfc) \u2192 148 \u2192 \uc5b4\ub9bc 918px / \uc2e4\uce21 881px (\uc5b4\ub9bc\uc740 tracking \ubbf8\ubc18\uc601)
  //  "TOO FAR."    8\uc790              : SPEC 230 \u2192 \uc5b4\ub9bc 1141px / \uc2e4\uce21 1097px (\ucd08\uacfc) \u2192 185 \u2192 \uc5b4\ub9bc 918px / \uc2e4\uce21 882px
  //  "ANYMORE."    8\uc790(\uae34 \uc904)       : SPEC 210 \u2192 \uc5b4\ub9bc 1042px / \uc2e4\uce21 1146px (\ucd08\uacfc) \u2192 165 \u2192 \uc5b4\ub9bc 818px / \uc2e4\uce21 900px
  //  leading \uc740 SPEC \ube44\uc728(200/210) \uc720\uc9c0 \u2192 157

  // ---- 1) "K-FASHION?" 7.00 \ub4f1\uc7a5 \u2192 8.28 \uc704\ub85c \uc2ac\ub77c\uc774\ub4dc \uc544\uc6c3 (\uc8fc\uc778\uacf5) ----
  var kf = text("K-FASHION?", { font: "en", size: 148, vscale: 115, tracking: -30, color: COL.white, pos: P, t0: t0, t1: T.tooFar + outDur, name: "S04 K-FASHION?" });
  impactIn(kf, t0);
  slideOut(kf, T.tooFar, "up", { dist: 500, dur: outDur });
  rgbSplit(kf, t0, { frames: 3, offset: 20 });
  shake(t0, { amount: 1.0 });

  // ---- 2) "TOO FAR." 8.28 \ub4f1\uc7a5 \u2192 8.66 \ucde8\uc18c\uc120 \u2192 9.00 \ud558\ub4dc\ucef7 ----
  var tf = text("TOO FAR.", { font: "en", size: 185, color: COL.white, pos: P, t0: T.tooFar, t1: T.notAnymore, name: "S04 TOO FAR." });
  impactIn(tf, T.tooFar);
  var st = strike(tf, T.strike, { color: COL.purple, thick: 22, dur: 0.14 });   // t1 = tf.outPoint(9.00)
  st.name = "S04 strike";
  // shake \ub294 \uacf5\uc720 CTRL Shake \uc2ac\ub77c\uc774\ub354\uc5d0 (t-1f, 0)\u00b7(t, amt)\u00b7(t+dur, 0) \uc138 \ud0a4\ub97c \ucc0d\ub294\ub2e4(\uae30\ubcf8 dur 0.35).
  // \uae30\ubcf8\uac12\uc774\uba74 \uaf2c\ub9ac \ud0a4(9.01:0)\uac00 9.00 shake(1.2) \ubc14\ub85c \ub4a4\uc5d0 \ub0a8\uc544 \uadf8 \ud754\ub4e4\ub9bc\uc774 1\ud504\ub808\uc784 \ub9cc\uc5d0 \uaebc\uc9c0\ubbc0\ub85c,
  // \uaf2c\ub9ac\uac00 \ub2e4\uc74c shake \uc758 \uc120\ud589 \ud0a4(9.00-1f=8.967)\ubcf4\ub2e4 1\ud504\ub808\uc784 \uc55e(8.933)\uc5d0\uc11c \ub05d\ub098\ub3c4\ub85d dur \ub97c T \uae30\uc900\uc73c\ub85c \uc900\ub2e4.
  shake(T.strike, { amount: 0.5, dur: T.notAnymore - T.strike - f(2) });   // = 0.273

  // ---- 3) "NOT ANYMORE." 9.00\u201310.30 : lime \uc194\ub9ac\ub4dc(parent \uc5c6\uc74c) \uc704 \uac80\uc815 \ub450 \uc904 ----
  solid(COL.lime, T.notAnymore, t1, "S04 lime bg");
  var na = text("NOT\rANYMORE.", { font: "en", size: 165, leading: 157, color: COL.black, pos: P, t0: T.notAnymore, t1: t1, name: "S04 NOT ANYMORE." });
  impactIn(na, T.notAnymore, { from: 120 });
  pulse(na, BEATS[22], { amount: 1.05 });   // 9.451
  pulse(na, BEATS[23], { amount: 1.05 });   // 9.892
  // rgbSplit \uc740 \ubcf5\uc81c\ubcf8\uc774 scale \ud0a4\ub97c \uadf8\ub300\ub85c \ubb3c\ub824\ubc1b\ub3c4\ub85d pulse \ub4a4\uc5d0 \uac74\ub2e4
  rgbSplit(na, T.notAnymore, { frames: 2 });
  rgbSplit(na, tGlitch2, { frames: 2, offset: 16 });
  shake(T.notAnymore, { amount: 1.2 });
  // 10.30 \ud558\ub4dc\ucef7 (t1)
});

// ===== 14-s05-scroll.jsx =====
// S05 scroll \u2014 \uc2a4\ud06c\ub864 \ud55c \ubc88\uc774\uba74 \uc11c\uc6b8\uc774 \ubb38 \uc55e\uc5d0 (10.30\u201313.44)
// \uc8fc\uc778\uacf5 = \ud53c\ub4dc \uc2a4\ud06c\ub864(\ub110 \ud558\ub098\uac00 3\ucd08 \ub3d9\uc548 \ud55c \ubc88 \uae38\uac8c \uc62c\ub77c\uac04\ub2e4). \uac00\uc0ac\ub294 \ubcf4\uc870(\uc9e7\uc740 slideIn), \uace0\uc2a4\ud2b8\ub294 \ub290\ub9b0 \ud328\ub7f4\ub799\uc2a4.
scene("S05", T.scroll, T.scrollEnd, function (ctx) {
  var t0 = T.scroll, t1 = T.scrollEnd;
  var tScrollStop = T.scrollEnd - 0.14;   // 13.30 \u2014 \uae34 \uc2a4\ud06c\ub864\uc774 \uba48\ucd94\ub294 \uc2dc\uac01 (SPEC \uba85\uc2dc\uac12, T \ud0a4 \uc5c6\uc74c)
  var tShake = T.scrollEnd - 0.576;       // 12.864 \u2014 shake \uc628\uc14b (SPEC \uba85\uc2dc\uac12, T \ud0a4 \uc5c6\uc74c)
  var feedOutDur = 0.16, feedOutDist = 2200;   // r02 \uac80\uc218: dist 900 \uc73c\ub860 \uc544\ub798\ucabd \uce74\ub4dc\uac00 S06 \uae4c\uc9c0 \ub0a8\uc544 2200 \uc73c\ub85c \uc644\uc804\ud788 \ub0b4\ubcf4\ub0b8\ub2e4
  var tFeedEnd = T.scrollEnd + feedOutDur;     // 13.60 \u2014 \ud53c\ub4dc slideOut \uc774 \ub05d\uae4c\uc9c0 \ubcf4\uc774\ub3c4\ub85d (\u00a70.4 \ub05d +0.30 \ud5c8\uc6a9 \uc548)
  var i;

  // \uac00\uc0ac \ud55c \ub2e8\uc5b4: \uc67c\ucabd \uc815\ub82c \ud14d\uc2a4\ud2b8 + slideIn("down" = \uc544\ub798\ucabd\uc5d0\uc11c \uc62c\ub77c\uc640 \uc815\uc9c0)
  function lyric(str, x, y, t, color, name) {
    var L = text(str, { font: "ko", size: 92, color: color, pos: [x, y], anchor: "left", justify: "left", t0: t, t1: t1, name: name });
    slideIn(L, t, "down", { dist: 60, dur: 0.2 });
    return L;
  }
  // \ub2e4\uc74c \ub2e8\uc5b4 x = \uc774\uc804 \ub2e8\uc5b4 \uc624\ub978\ucabd \ub05d + 28 (\uc774\uc804 \ub2e8\uc5b4\uc758 slideIn \uc774 \ub05d\ub09c \ub4a4 \uc2dc\uac01\uc5d0 \uc7b0\ub2e4)
  function nextX(prev, t) { var b = bbox(prev, t); return b.left + b.width + 28; }

  // ---------- \ub4a4: \uace0\uc2a4\ud2b8 "SCROLL" \uc544\uc6c3\ub77c\uc778 \u2014 \ub290\ub9b0 \ud328\ub7f4\ub799\uc2a4 y 1500\u2192700 ----------
  // \ud3ed \uc5b4\ub9bc(\u00a70.10): 6\uc790 \u00d7 0.62 \u00d7 320 \u2248 1190px. SPEC \uac00 size 320 \uc744 \uba85\uc2dc\ud55c \ubc30\uacbd \uc7a5\uc2dd(opacity 30)\uc774\ub77c \uc88c\uc6b0\ub85c \ud758\ub7ec\ub118\uce58\ub294 \uac83\uc774 \uc758\ub3c4.
  var ghost = text("SCROLL", { font: "en", size: 320, fillNone: true, stroke: { color: COL.white, width: 3 }, pos: [540, 1500], t0: t0, t1: t1, name: "S05 ghost" });
  ghost.opacity.setValue(30);
  setKeys(ghost.position, [[t0, [540, 1500]], [t1, [540, 700]]], "linear");

  // ---------- \ud53c\ub4dc: \ub110 + \uce74\ub4dc 4\uc7a5 ----------
  var SAFE_UP = 260;   // r06: \ub9b4\uc2a4 \ud558\ub2e8 UI(\uc544\ub798 480px)\ub97c \ud53c\ud574 \ud53c\ub4dc\u00b7\uac00\uc0ac\u00b7\ub760\ub97c \ud1b5\uc9f8\ub85c \uc62c\ub9b0\ub2e4
  var feed = group("S05 feed", [540, 1180 - SAFE_UP], t0, tFeedEnd);   // r02 \uac80\uc218: 1300 \uc774\uba74 1\ubc88 \uce74\ub4dc \uc81c\ubaa9 \uc904\uc774 \uac00\uc0ac 1\ud589(1480)\uacfc \uac19\uc740 \ub192\uc774\ub77c 120 \uc62c\ub9bc
  // \uce74\ub4dc w 460 h 600, \uc138\ub85c \uac04\uaca9 40 \u2192 \uc911\uc2ec y 1300/1940/2580/3220. \uae4a\uc774\uac10: 2\u00b74\ubc88 scale 92, x +40.
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
    c.parent = feed;   // \uce74\ub4dc \ub110\uc744 \ud53c\ub4dc \ub110 \uc544\ub798\ub85c \ubb36\ub294\ub2e4 (parent \ub300\uc785\uc740 \uc2dc\uac01 \uc704\uce58\ub97c \ubcf4\uc874\ud558\uba70 \uc0c1\ub300 \uc88c\ud45c\ub85c \ud658\uc0b0\ub41c\ub2e4)
  }
  // \uc8fc\uc778\uacf5: \ud55c \ubc88\uc758 \uae34 \uc2a4\ud06c\ub864 y 1300\u2192-500 (10.30\u219213.30, inout)
  moveTo(feed, t0, tScrollStop, [540, -620 - SAFE_UP], "inout");
  shake(tShake, { amount: 0.5 });
  // 13.44: \ud53c\ub4dc\ub9cc \uc704\ub85c \ube60\uc838\ub098\uac04\ub2e4 (dur 0.2 \u2192 13.64 \ucef7). \uac00\uc0ac\u00b7\uace0\uc2a4\ud2b8\ub294 t1 13.44 \ud558\ub4dc\ucef7.
  slideOut(feed, t1, "up", { dist: feedOutDist, dur: feedOutDur });

  // ---------- \uac00\uc0ac \ubc11 \ucea1\uc158 \ub760 (r02 \uac80\uc218: \uce74\ub4dc \uc2a4\ucf08\ub808\ud1a4 \uc904\u00b7\uac00\uaca9 \uc54c\uc57d\uc774 \uac00\uc0ac\ub97c \uad00\ud1b5\ud574 \uc77d\uae30 \uc5b4\ub824\uc6c0) ----------
  var band = rect({ w: W, h: 330, color: COL.black, pos: [540, 1545 - SAFE_UP], t0: t0, t1: t1, name: "S05 caption band" });
  band.opacity.setValue(80);

  // ---------- \uac00\uc0ac (\ud53c\ub4dc\ubcf4\ub2e4 \uc704) ----------
  // \ud3ed \uc5b4\ub9bc(\u00a70.10, Noto Sans KR 1\uc790 \u2248 0.95 \u00d7 92 \u2248 87px, \uacf5\ubc31\ub3c4 1\uc790\ub85c \uc0c1\ud55c \uacc4\uc0b0):
  //   1\ud589 "\uc2a4\ud06c\ub864"(3\uc790 \u2248 262) + 28 + "\ud55c \ubc88\uc774\uba74"(5\uc790 \u2248 437) \u2248 727px \u2264 920 \u2713  (x 100 \uc2dc\uc791 \u2192 \ub05d \u2248 827 < 1000 \uc548\uc804\uc601\uc5ed)
  //   2\ud589 "\uc11c\uc6b8\uc774"(3\uc790 \u2248 262) + 28 + "\ubb38 \uc55e\uc5d0"(4\uc790 \u2248 350) \u2248 640px \u2264 920 \u2713
  var LX = 100;   // \uccab \ub2e8\uc5b4 x \u2014 SPEC \ubbf8\uba85\uc2dc, \uc548\uc804\uc601\uc5ed(x \u2265 80) \uc548\uc5d0\uc11c \uc120\ud0dd
  var w1 = lyric("\uc2a4\ud06c\ub864", LX, 1480 - SAFE_UP, T.scroll, COL.white, "S05 lyric 1 \uc2a4\ud06c\ub864");
  var w2 = lyric("\ud55c \ubc88\uc774\uba74", nextX(w1, T.scrollW2), 1480 - SAFE_UP, T.scrollW2, COL.white, "S05 lyric 2 \ud55c \ubc88\uc774\uba74");
  var w3 = lyric("\uc11c\uc6b8\uc774", LX, 1600 - SAFE_UP, T.scrollW3, COL.lime, "S05 lyric 3 \uc11c\uc6b8\uc774");
  var w4 = lyric("\ubb38 \uc55e\uc5d0", nextX(w3, T.scrollW4), 1600 - SAFE_UP, T.scrollW4, COL.white, "S05 lyric 4 \ubb38 \uc55e\uc5d0");
  // \uc774\uc911 \ud45c\uae30: 2\ud589 \uc2dc\uc791\uc5d0 \ub9de\ucdb0 \ud55c \uc904\ub85c. \ud3ed \uc5b4\ub9bc 31\uc790 \u00d7 0.62 \u00d7 32 \u2248 615 + tracking 200(6.4px \u00d7 30) \u2248 807px \u2192 x 100~907, \ucea1\uc158 \ub760(1380~1710) \uc548
  gloss("ONE SCROLL. SEOUL AT YOUR DOOR.", { pos: [LX, 1686 - SAFE_UP], anchor: "left", justify: "left", size: 32, tracking: 200, t0: T.scrollW3, t1: t1, name: "S05 gloss" });
});

// ===== 15-s06-discover.jsx =====
// S06 discover \u2014 "Discover, \ud22d!" (13.44\u201314.44)
// \ub4a4\uc5d0\uc11c \uc544\uc6c3\ub77c\uc778 "DISCOVER" \uac00 \uc67c\u2192\uc624\ub85c \ud750\ub974\uace0, \ud770 "DISCOVER" \uac00 \ucc29\uc9c0, \uba54\ub274 pill \ud589\uc774 \uc624\ub978\ucabd\uc5d0\uc11c \ubc00\ub824 \ub4e4\uc5b4\uc628 \ub4a4
// 13.96 \uc5d0 "\ud22d!" \uc2a4\ud2f0\ucee4\uac00 \ud31d. 14.44 \uc5d0 \uc804\ubd80 \uc67c\ucabd\uc73c\ub85c \ube60\uc838\ub098\uac00\ub294 \ud729 \uc804\ud658(\ub2e4\uc74c S07 \uc740 \uc624\ub978\ucabd\uc5d0\uc11c \ub4e4\uc5b4\uc628\ub2e4).
scene("S06", T.discover, T.tryItOn, function (ctx) {
  var t0 = T.discover, t1 = T.tryItOn;
  var OUT_DUR = 0.12;                  // \ud729 \uc804\ud658 slideOut \uae38\uc774
  var tEnd = t1 + OUT_DUR;             // \uc790\uc2dd \ub808\uc774\uc5b4 t1 \u2014 slideOut \uc774 \ub05d\ub098\ub294 \uc2dc\uac01(\ud5c8\uc6a9 \uc624\ucc28 \ub05d +0.30 \uc548)
  var tPill = t0 + 0.06;               // SPEC "13.50" (T \ud0a4 \uc5c6\uc74c) \u2014 13.44 + 0.06 = 13.5 \uc815\ud655(\ud504\ub808\uc784 405). f(2) \ub97c \ub354\ud558\uba74 13.5067 \uc774\ub77c 1\ud504\ub808\uc784 \ub2a6\uac8c \ubcf4\uc778\ub2e4.
  var PILL_Y = 1200, PILL_X0 = 60, PILL_GAP = 16;
  var PILL_SIZE = 30, PILL_PAD = 28;   // r02 \uac80\uc218: 22 \ub294 \ud3f0\uc5d0\uc11c 8pt \uc218\uc900\uc774\ub77c 30 \uc73c\ub85c(\ub9c8\uc9c0\ub9c9 pill \uc740 \ud654\uba74 \ubc16\uc73c\ub85c \uac78\ub824\ub3c4 \ub428)   // PILL_PAD \ub294 pill() \uae30\ubcf8 padX \uc640 \uac19\uc740 \uac12(\ud3ed \uc5b4\ub9bc fallback \uc6a9)
  var i, N, w, lb, tp, opt;

  // pill() \uc740 \ub110\ub9cc \ub3cc\ub824\uc8fc\ubbc0\ub85c, \uc0dd\uc131\ub41c \ubc30\uacbd rect("pill bg <label>")\ub97c \uc774\ub984\uc73c\ub85c \ucc3e\uc544 \uc2e4\uc81c \ud3ed\uc744 \uc7b0\ub2e4.
  // \ubabb \ucc3e\uc73c\uba74 \ub85c\uadf8\ub97c \ub0a8\uae30\uace0 \u00a70.10 \uc5b4\ub9bc(\ub300\ubb38\uc790 1\uae00\uc790 \u2248 0.62 \u00d7 size)\uc73c\ub85c \ub300\uc2e0\ud55c\ub2e4.
  function pillWidth(label, t) {
    var bg = null;
    try { bg = ctx.comp.layer("pill bg " + label); } catch (e) { bg = null; }
    if (bg) { return bbox(bg, t).width; }
    log("S06: pill bg not found for " + label + " - width estimated");
    return label.length * 0.62 * PILL_SIZE + 2 * PILL_PAD;
  }

  // ---- \ub4a4: \uace0\uc2a4\ud2b8 \uc544\uc6c3\ub77c\uc778 "DISCOVER" \u2014 x -300\u21921380 linear (13.44\u219214.44) ----
  // \ud3ed \u2248 8 \u00d7 0.62 \u00d7 260 = 1290px: \ud654\uba74 \ubc16\uc5d0\uc11c \ubc16\uc73c\ub85c \ud750\ub974\ub294 \ubc30\uacbd \uc694\uc18c\ub77c 920 \uc81c\ud55c \ub300\uc0c1\uc774 \uc544\ub2c8\ub2e4(SPEC \uac00 size 260 \uba85\uc2dc).
  var ghost = text("DISCOVER", { font: "en", size: 260, fillNone: true, stroke: { color: COL.white, width: 4 }, pos: [-300, 760], t0: t0, t1: tEnd, name: "S06 ghost" });
  setKeys(ghost.position, [[t0, [-300, 760]], [t1, [1380, 760]]], "linear");
  ghost.opacity.setValue(35);  // r02 \uac80\uc218: 100% \uc544\uc6c3\ub77c\uc778\uc774 \uc8fc\uc778\uacf5 \uc81c\ubaa9\ubcf4\ub2e4 \ud280\uc5b4 S05 \uace0\uc2a4\ud2b8(30)\uc640 \ube44\uc2b7\ud558\uac8c \ub0ae\ucda4

  // ---- \uc8fc\uc778\uacf5: "DISCOVER" white en 150 at (540, 980) \u2014 \ud3ed \u2248 8 \u00d7 0.62 \u00d7 150 = 744px \u2264 920 ----
  var title = text("DISCOVER", { font: "en", size: 150, color: COL.white, pos: [540, 980], t0: t0, t1: tEnd, name: "S06 title" });
  impactIn(title, t0);
  rgbSplit(title, t0, { frames: 2 });

  // ---- \uba54\ub274 pill \ud589 y 1200: x 60 \ubd80\ud130 \uac04\uaca9 16 \uc73c\ub85c \uc774\uc5b4 \ubd99\uc784(\ub9c8\uc9c0\ub9c9\uc740 \ud654\uba74 \ubc16\uc774\uc5b4\ub3c4 \ub428) ----
  // \uac01 pill \uc740 \uc784\uc2dc\ub85c \uc911\uc559\uc5d0 \ub9cc\ub4e0 \ub4a4 \ud3ed\uc744 \uc7ac\uc11c \ub110 \uc704\uce58\ub9cc \uc62e\uae34\ub2e4(\uc790\uc2dd\uc740 \ub110 \uae30\uc900 [0,0] \uc774\ub77c \ud568\uaed8 \uc774\ub3d9).
  // 2\ud504\ub808\uc784\uc529 \uc9c0\uc5f0\ud574 \uc624\ub978\ucabd\uc5d0\uc11c slideIn. \ub110\uc758 opacity \ub294 \uc790\uc2dd\uc5d0 \uc548 \uba39\uc73c\ubbc0\ub85c \uc790\uc2dd t0 = \uac01 pill \uc758 \ub4f1\uc7a5 \uc2dc\uac01.
  var labels = ["CATEGORY", "SHOP", "OOTD", "FOR YOU", "RANKING", "BRANDS"];
  var pills = [];
  var xCursor = PILL_X0;
  for (i = 0; i < labels.length; i++) {
    lb = labels[i];
    tp = tPill + f(2) * i;
    opt = { pos: [CX, PILL_Y], h: 68, size: PILL_SIZE, stroke: { color: COL.white, width: 2 }, t0: tp, t1: tEnd, name: "S06 pill " + lb };
    if (lb === "SHOP") { opt.color = COL.lime; opt.textColor = COL.black; }   // SHOP \ub9cc lime \ucc44\uc6c0 + \uac80\uc815 \uae00\uc790
    N = pill(lb, opt);
    w = pillWidth(lb, tp);
    setv(N.position, [xCursor + w / 2, PILL_Y]);
    xCursor += w + PILL_GAP;
    slideIn(N, tp, "right", { dist: 500, dur: 0.3 });
    pills.push(N);
  }

  // ---- 13.96 "\ud22d!" \uc2a4\ud2f0\ucee4: purple rect 180\u00d7120 r 24 + white ko "\ud22d!" 84, rotation -12, at (820, 860) ----
  // "\ud22d!" \ud3ed \u2248 0.95 \u00d7 84 + "!" \u2248 115px < 180 \ubc15\uc2a4.
  // r02 \uac80\uc218: (820, 860) \uc740 \uc544\ub798 \ubaa8\uc11c\ub9ac\uac00 DISCOVER \uc758 E\u00b7R \uc717\uc120\uc5d0 \ub2ff\uc544 (840, 815) \ub85c \uc62c\ub9bc
  var tuk = group("S06 tuk ctrl", [840, 815], T.tuk, tEnd);
  rect({ w: 180, h: 120, r: 24, color: COL.purple, pos: [840, 815], t0: T.tuk, t1: tEnd, parentLayer: tuk, name: "S06 tuk bg" });
  text("\ud22d!", { size: 84, color: COL.white, pos: [840, 815], t0: T.tuk, t1: tEnd, parentLayer: tuk, name: "S06 tuk text" });
  tuk.rotation.setValue(-12);
  popIn(tuk, T.tuk);
  shake(T.tuk, { amount: 0.4 });

  // ---- 14.44 \ud729 \uc804\ud658: \uc804\ubd80 \uc67c\ucabd\uc73c\ub85c slideOut(dist 800, dur 0.12) ----
  var outOpt = { dist: 800, dur: OUT_DUR };
  slideOut(ghost, t1, "left", merge(outOpt, { noFade: true }));  // \ud398\uc774\ub4dc \ud0a4\uac00 35% \uc124\uc815\uc744 100 \uc73c\ub85c \ub36e\uc9c0 \uc54a\uac8c
  // slideOut \uc740 14.44 \uc758 \ub4dc\ub9ac\ud504\ud2b8 \ub05d \ud0a4\ub97c \uc7ac\uc0ac\uc6a9\ud558\uba70 incoming \uc744 BEZIER(influence 88) \ub85c \ubc14\uafd4 13.44\u219214.44 \uac00 \uac15\ud55c ease-in \uc774 \ub41c\ub2e4.
  // SPEC \uc740 \uadf8 \uad6c\uac04\uc744 linear \ub85c \uba85\uc2dc\ud558\ubbc0\ub85c \uadf8 \ud0a4\uc758 incoming \ub9cc LINEAR \ub85c \ub418\ub3cc\ub9b0\ub2e4(outgoing BEZIER \ub294 \uc720\uc9c0 \u2192 \ud729 \uac00\uc18d\uc740 \uadf8\ub300\ub85c).
  try {
    ghost.position.setInterpolationTypeAtKey(ghost.position.nearestKeyIndex(t1), KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.BEZIER);
  } catch (eGhost) { log("S06: ghost drift key linear restore failed - " + eGhost); }
  slideOut(title, t1, "left", outOpt);
  for (i = 0; i < pills.length; i++) { slideOut(pills[i], t1, "left", outOpt); }
  slideOut(tuk, t1, "left", outOpt);
});

// ===== 16-s07-tryon.jsx =====
// S07 tryon \u2014 Try it on, \ud1a1! (14.44\u201315.42)
scene("S07", T.tryItOn, T.styleIt, function (ctx) {
  var t0 = T.tryItOn, t1 = T.styleIt;
  // 15.42 slideOut(dur 0.12) \uc774 \ubcf4\uc774\ub824\uba74 \ub808\uc774\uc5b4\uac00 \uadf8\ub9cc\ud07c \ub354 \uc0b4\uc544\uc57c \ud55c\ub2e4(\u00a70.4 \ud5c8\uc6a9 \uc624\ucc28 \ub05d +0.30 \uc548). slideOut \uc758 cutAt \uc740 \uc904\uc774\uae30\ub9cc \ud55c\ub2e4.
  var tOut = t1 + 0.12;
  var tTitle = t0 + 0.02;                      // 14.46 "TRY IT ON"
  var tScan0 = t0 + 0.06, tScan1 = T.tok + 0.02; // 14.50 \u2192 15.20 scanline
  var tUpload = t0 + 0.06, tMatch = t0 + 0.31, tTry = t0 + 0.56; // 14.50 / 14.75 / 15.00
  var IN = { dist: 800, dur: 0.14 };           // \uc624\ub978\ucabd\uc5d0\uc11c \ub4e4\uc5b4\uc634 (S06 \uc774 \uc67c\ucabd\uc73c\ub85c \ub098\uac00\ub294 \ud729\uacfc \ub9de\ubb3c\ub9bc)
  var OUT = { dist: 800, dur: 0.12 };          // 15.42 \uc804\ubd80 \uc67c\ucabd\uc73c\ub85c \ub098\uac10
  var i;

  // 1) \uce74\ub4dc \ubb36\uc74c (\ub9e8 \ub4a4): \ubc14\ub514 \u2192 \uc2e4\ub8e8\uc5e3 \uba38\ub9ac \u2192 \uc2e4\ub8e8\uc5e3 \ubab8 \u2192 \uc0c1\ub2e8 \ub77c\ubca8.
  //    \ub137\uc774 \ud55c \ub369\uc5b4\ub9ac\ub85c \ubcf4\uc774\ub3c4\ub85d \uac19\uc740 slideIn/slideOut \uc744 \uac01\uac01 \uac74\ub2e4(\ub110\ub85c \ubb36\uc73c\uba74 \ub110 opacity \uac00 \uc790\uc2dd\uc5d0 \uc548 \uba39\uc5b4 fade \uac00 \ube60\uc9c4\ub2e4).
  var cardL = rect({ w: 640, h: 900, r: 40, color: COL.gray, pos: [540, 930],   // r06: \ub9b4\uc2a4 \ud558\ub2e8 UI \ud68c\ud53c\ub85c 480~1380 \uc73c\ub85c \uc904\uc784
    t0: t0, t1: tOut, name: "S07 card" });
  // \uc774\uc911 \ud45c\uae30\ud310: \ud68c\uc0c9 \uc2e4\ub8e8\uc5e3 \ub300\uc2e0 AI \ubaa8\ub378 \uc804\uc2e0 \uc0ac\uc9c4(\ub77c\ubca8 y 560 \uc544\ub798 ~ \uce74\ub4dc \uc544\ub798 \ub05d 1500 \uc548, 600\u00d7880). \uc0ac\uc9c4\uc774 \uc5c6\uc73c\uba74 \uc2e4\ub8e8\uc5e3.
  var modelL;
  if (ctx.photos.tryon) {
    modelL = [photoBox(ctx.photos.tryon, { w: 600, h: 780, r: 28, pos: [540, 960], focusY: 0.45, t0: t0, t1: tOut, name: "S07 model photo" })];
  } else {
    modelL = [ellipse({ w: 130, h: 130, color: COL.gray2, pos: [540, 700], t0: t0, t1: tOut, name: "S07 silhouette head" }),
      rect({ w: 300, h: 430, r: 70, color: COL.gray2, pos: [540, 1010], t0: t0, t1: tOut, name: "S07 silhouette body" })];
  }
  // \ud3ed \uc5b4\ub9bc: "AI STUDIO" 9\uc790 \u00d7 0.62 \u00d7 30 \u2248 167px + tracking 400(=12px \u00d7 8\uce78 = 96px) \u2248 263px < 920 OK
  var labelL = text("AI STUDIO", { font: "en", size: 30, color: COL.lime, tracking: 400, pos: [540, 525], t0: t0, t1: tOut, name: "S07 label AI STUDIO" });
  var cardSet = [cardL].concat(modelL, [labelL]);
  for (i = 0; i < cardSet.length; i++) { slideIn(cardSet[i], t0, "right", IN); }

  // 2) \uc8fc\uc778\uacf5 "TRY IT ON" (14.46): impactIn + rgbSplit 2f
  // \ud3ed \uc5b4\ub9bc: 9\uc790(\uacf5\ubc31 2 \ud3ec\ud568) \u00d7 0.62 \u00d7 150 \u2248 837px < 920 OK
  var title = text("TRY IT ON", { font: "en", size: 150, color: COL.white, pos: [540, 380], t0: tTitle, t1: tOut, name: "S07 TRY IT ON" });
  impactIn(title, tTitle);
  rgbSplit(title, tTitle, { frames: 2 });

  // 3) \uc2a4\uce94\ub77c\uc778 14.50 \u2192 15.20 (\uce74\ub4dc \uc548 y 520 \u2192 1480). 15.42 \uc774\uc804\uc5d0 \ub05d\ub098\ubbc0\ub85c slideOut \ub300\uc0c1 \uc544\ub2d8.
  var scan = scanline(tScan0, tScan1, { x: 540, w: 600, yFrom: 570, yTo: 1350 });
  scan.name = "S07 scanline";

  // 4) \uc0c1\ud0dc\uc5b4: \uc624\ub978\ucabd \uc138\ub85c \ubc30\uce58 (x 930 \uc624\ub978\ucabd \uc815\ub82c), enMid 28 tracking 300 lime, \uac01 typeOn 0.1
  // \ud3ed \uc5b4\ub9bc: "UPLOAD" 6\uc790 \u00d7 0.62 \u00d7 28 \u2248 104px + tracking 300(=8.4px \u00d7 5\uce78 = 42px) \u2248 146px < 920 OK (MATCH \u2248 121, TRY \u2248 69)
  // r06: \uc138\ub85c 3\uc904(1560~1660)\uc740 \ub9b4\uc2a4 \ud558\ub2e8 UI \uc5d0 \uac00\ub824 \uce74\ub4dc \uc544\ub798 \uac00\ub85c \ud55c \uc904(y 1415)\ub85c \uc62e\uae34\ub2e4.
  //      \uae00\uc790 \ud3ed\uc774 \ub2ec\ub77c \uace0\uc815 x \ub85c\ub294 \uac04\uaca9\uc774 \uace0\ub974\uc9c0 \uc54a\uc73c\ubbc0\ub85c, \uba3c\uc800 \ub9cc\ub4e4\uace0 \uc2e4\uc81c \ud3ed(bbox)\uc744 \uc7b0 \ub4a4 \uac04\uaca9 60 \uc73c\ub85c \uac00\uc6b4\ub370 \uc815\ub82c\ud55c\ub2e4(typeOn \uc740 \uc7b0 \ub4a4\uc5d0).
  var statusWords = [["UPLOAD", tUpload], ["MATCH", tMatch], ["TRY", tTry]];
  var statusLayers = [], sW = [], sTotal = 0, STATUS_GAP = 60, sx;
  for (i = 0; i < statusWords.length; i++) {
    var sw = statusWords[i];
    var sL = text(sw[0], { font: "enMid", size: 34, color: COL.lime, tracking: 300, pos: [540, 1415], t0: sw[1], t1: tOut, name: "S07 status " + sw[0] });
    sW.push(bbox(sL, sw[1]).width); sTotal += sW[i];
    statusLayers.push(sL);
  }
  sx = 540 - (sTotal + STATUS_GAP * (statusWords.length - 1)) / 2;
  for (i = 0; i < statusLayers.length; i++) {
    setv(statusLayers[i].position, [sx + sW[i] / 2, 1415]);
    sx += sW[i] + STATUS_GAP;
    typeOn(statusLayers[i], statusWords[i][1], 0.1);
  }

  // 5) "\ud1a1!" \uc2a4\ud2f0\ucee4 (15.18): \ub110 \uc544\ub798 lime \ubc30\uacbd(180\u00d7120 r 24 \u2014 S06 "\ud22d!" \uacfc \uac19\uc740 \ud06c\uae30) + black ko "\ud1a1!" 84.
  //    \uc790\uc2dd\uc744 \uba3c\uc800 parent \ub85c \ubd99\uc778 \ub4a4 \ub110\uc744 10\ub3c4 \ub3cc\ub9b0\ub2e4(parent \uc124\uc815\uc740 world transform \uc744 \ubcf4\uc874\ud558\ubbc0\ub85c \uc21c\uc11c\uac00 \ubc14\ub00c\uba74 \ud68c\uc804\uc774 \uc0c1\uc1c4\ub428). popIn \uc740 \ub110\uc5d0.
  // \ud3ed \uc5b4\ub9bc: "\ud1a1" 1\uc790 \u00d7 0.95 \u00d7 84 \u2248 80px + "!" \u2248 25px \u2248 105px \u2014 \ubc30\uacbd 180 \uc548 OK
  var stk = group("S07 tok ctrl", [250, 640], T.tok, tOut);
  // \uc774\uc911 \ud45c\uae30: \uc2a4\ud2f0\ucee4\ub97c 150 \ub192\uc774\ub85c \ud0a4\uc6b0\uace0 "\ud1a1!" \uc544\ub798\uc5d0 "TAP!" \uc744 \ud568\uaed8 \ub123\ub294\ub2e4(\uc2a4\ud2f0\ucee4\uc9f8 popIn)
  rect({ w: 180, h: 150, r: 24, color: COL.lime, pos: [250, 640], t0: T.tok, t1: tOut, parentLayer: stk, name: "S07 tok bg" });
  text("\ud1a1!", { font: "ko", size: 84, color: COL.black, pos: [250, 622], t0: T.tok, t1: tOut, parentLayer: stk, name: "S07 tok text" });
  gloss("TAP!", { pos: [250, 684], size: 24, color: COL.black, tracking: 150, still: true, t0: T.tok, t1: tOut, parentLayer: stk, name: "S07 tok gloss" });
  stk.rotation.setValue(10);
  popIn(stk, T.tok);

  // 6) 15.42: \uc804\ubd80 slideOut("left", dist 800, dur 0.12). \uc2a4\ud2f0\ucee4\ub294 \ub110\ub9cc \ubc00\uc5b4\uc57c \uc218\ud3c9\uc73c\ub85c \ub098\uac04\ub2e4(\uc790\uc2dd position \uc740 \ud68c\uc804\ub41c \ub110 \uc88c\ud45c\uacc4).
  for (i = 0; i < cardSet.length; i++) { slideOut(cardSet[i], t1, "left", OUT); }
  slideOut(title, t1, "left", OUT);
  for (i = 0; i < statusLayers.length; i++) { slideOut(statusLayers[i], t1, "left", OUT); }
  slideOut(stk, t1, "left", OUT);
});

// ===== 17-s08-style.jsx =====
// S08 style \u2014 "Style it, \uc9e0!" (15.42\u201316.26)
// \ub9e4\uc2a4\ub108\ub9ac \uce74\ub4dc 4\uc7a5\uc774 \uc88c\uc6b0\uc5d0\uc11c \ub4e4\uc5b4\uc624\uace0 \u2192 "STYLE IT" \uc784\ud329\ud2b8 \u2192 "\uc9e0!" \uc2a4\ud2f0\ucee4 \ud31d + \uce74\uba54\ub77c \ud754\ub4e4\ub9bc \u2192 \uce74\ub4dc\uac00 \ub4e4\uc5b4\uc628 \ucabd\uc73c\ub85c \ub418\ub3cc\uc544 \ub098\uac00\uba70 S09 \ub85c.
scene("S08", T.styleIt, T.shareIt, function (ctx) {
  var t0 = T.styleIt, t1 = T.shareIt;
  var SLIDE_IN = { dist: 600, dur: 0.22 }, SLIDE_OUT = { dist: 700, dur: 0.12 };
  // \ud1f4\uc7a5 \uc2ac\ub77c\uc774\ub4dc(0.12s)\uac00 \ubcf4\uc774\ub3c4\ub85d \uce74\ub4dc\ub9cc \uc7a5\uba74 \ub05d +0.12 \uae4c\uc9c0 \uc0b0\ub2e4 (SPEC \u00a70.4 \ud5c8\uc6a9 \uc624\ucc28 +0.30 \uc548)
  var cardT1 = t1 + SLIDE_OUT.dur;

  // ---- 1) \ub9e4\uc2a4\ub108\ub9ac card() 4\uc7a5 (badge\u00b7price \uc5c6\uc74c) \u2014 \ub4a4 \u2192 \uc55e: \uae4a\uc774 92 \ub450 \uc7a5 \uba3c\uc800, 104 \ub450 \uc7a5 \ub098\uc911 ----
  // idx \ub294 SPEC \uc758 \uce74\ub4dc \ubc88\ud638(1~4). \uc785\uc7a5 \uc9c0\uc5f0 = (idx-1) \u00d7 2\ud504\ub808\uc784. \uce74\ub4dc\ub07c\ub9ac\ub294 \ud654\uba74\uc5d0\uc11c \uacb9\uce58\uc9c0 \uc54a\ub294\ub2e4.
  var cards = [
    // r02 \uac80\uc218: \uc81c\ubaa9 "STYLE IT"(y 960) \uc704\uc544\ub798 \uc5ec\ubc31\uc774 \uc5c6\uc5b4 \uc704 \ub450 \uc7a5\uc740 60 \uc62c\ub9ac\uace0 \uc544\ub798 \ub450 \uc7a5\uc740 60 \ub0b4\ub9bc
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
    // \uc790\uc2dd\uc774 \ub110\uc5d0 parent \ub41c \ub4a4\uc5d0 \uc2a4\ucf00\uc77c\uc744 \ubc14\uafd4\uc57c \uae4a\uc774 \uc2a4\ucf00\uc77c\uc774 \uc790\uc2dd(\uce74\ub4dc \ub3c4\ud615)\uc5d0 \uc804\ub2ec\ub41c\ub2e4
    setv(N.scale, [c.depth, c.depth]);
    slideIn(N, tIn, c.side, SLIDE_IN);     // \uc67c\ucabd \uce74\ub4dc\ub294 \uc67c\ucabd\uc5d0\uc11c, \uc624\ub978\ucabd \uce74\ub4dc\ub294 \uc624\ub978\ucabd\uc5d0\uc11c \ub4e4\uc5b4\uc628\ub2e4
    slideOut(N, t1, c.side, SLIDE_OUT);    // 16.26: \ub4e4\uc5b4\uc628 \ucabd\uc73c\ub85c \ub418\ub3cc\uc544 \ub098\uac04\ub2e4
  }

  // ---- 2) \uc8fc\uc778\uacf5 "STYLE IT" \u2014 \ud3ed \uc5b4\ub9bc: 8\uc790(\uacf5\ubc31 \ud3ec\ud568) \u00d7 0.62 \u00d7 170 \u2248 843px \u2264 920 ----
  var tTitle = t0 + 0.04;   // SPEC 15.46
  var title = text("STYLE IT", { font: "en", size: 170, color: COL.white, pos: [540, 960], t0: tTitle, t1: t1, name: "S08 title" });
  impactIn(title, tTitle);
  rgbSplit(title, tTitle, { frames: 2 });

  // ---- 3) "\uc9e0!" \uc2a4\ud2f0\ucee4 \u2014 purple \ubc30\uacbd + white ko 84, rotation -8 (\ub9e8 \uc55e) ----
  // \ubc30\uacbd \ud06c\uae30 \uc5b4\ub9bc: "\uc9e0!" \ud3ed \u2248 0.95\u00d784 + 0.3\u00d784 \u2248 105px, \ub192\uc774 \u2248 70px \u2192 \uc5ec\ubc31 \ud3ec\ud568 192\u00d7124
  var stkPos = [540, 1420];
  var stk = group("S08 zzan ctrl", stkPos, T.zzan, t1);
  // \uc774\uc911 \ud45c\uae30: \uc2a4\ud2f0\ucee4\ub97c 156 \ub192\uc774\ub85c \ud0a4\uc6b0\uace0 "\uc9e0!" \uc544\ub798\uc5d0 "TA-DA!" \ub97c \ud568\uaed8 \ub123\ub294\ub2e4
  rect({ w: 192, h: 156, r: 26, color: COL.purple, pos: stkPos, t0: T.zzan, t1: t1, parentLayer: stk, name: "S08 zzan bg" });
  text("\uc9e0!", { font: "ko", size: 84, color: COL.white, pos: [stkPos[0], stkPos[1] - 18], t0: T.zzan, t1: t1, parentLayer: stk, name: "S08 zzan text" });
  gloss("TA-DA!", { pos: [stkPos[0], stkPos[1] + 46], size: 24, color: COL.white, tracking: 150, still: true, t0: T.zzan, t1: t1, parentLayer: stk, name: "S08 zzan gloss" });
  stk.rotation.setValue(-8);   // \uc790\uc2dd parent \ud6c4 \ud68c\uc804 \u2192 \ubc30\uacbd+\uae00\uc790\uac00 \ubb36\uc74c\uc9f8 \uae30\uc6b8\uc5b4\uc9c4\ub2e4
  popIn(stk, T.zzan);
  shake(T.zzan, { amount: 0.4 });
});

// ===== 18-s09-share.jsx =====
// S09 share \u2014 Share it, pop! pop! (16.26\u201318.46)
scene("S09", T.shareIt, T.verseEnd, function (ctx) {
  var t0 = T.shareIt, t1 = T.verseEnd;
  var tCard = BEATS[38];          // 16.30 \u2014 BEATS \uac12 16.3 \uacfc \uc77c\uce58(SPEC "16.30")
  var tFollow = T.pop2 + 0.30;    // 18.10 \u2014 T \uc5d0 \uc5c6\ub294 \uc2dc\uac01\uc774\ub77c pop2 \uae30\uc900 \uc624\ud504\uc14b(SPEC "18.10")

  // \ud14d\uc2a4\ud2b8 \ud3ed \uc5b4\ub9bc(\u00a70.10, Outfit 1\uc790 \u2248 0.62\u00d7size):
  //   "SHARE IT" 8\uc790 \u00d7 0.62 \u00d7 170 \u2248 843px (< 920 OK, \uacf5\ubc31 \ud3ec\ud568 \uc5b4\ub9bc\uc774\ub77c \uc2e4\uc81c\ub294 \ub354 \uc881\ub2e4)
  //   "1.2K"     4\uc790 \u00d7 0.62 \u00d7 40  \u2248 99px
  //   "248"      3\uc790 \u00d7 0.62 \u00d7 40  \u2248 74px
  //   "+ FOLLOW" 8\uc790 \u00d7 0.62 \u00d7 26  \u2248 129px (+ pill padX 28\u00d72 \u2192 \uc54c\uc57d \ud3ed \u2248 185px, x 788~972)

  // \ub4a4 \u2192 \uc55e \uc21c\uc11c\ub85c \uc0dd\uc131: \ubcf4\uc870(OOTD \uce74\ub4dc) \u2192 \uc8fc\uc778\uacf5(SHARE IT) \u2192 \uc2a4\ud2f0\ucee4(\ud558\ud2b8\u00b7\ub9d0\ud48d\uc120\u00b7FOLLOW)

  // 16.30 OOTD \ud3ec\uc2a4\ud2b8 \uce74\ub4dc 560\u00d7720 \u2014 \uc544\ub798(+300)\uc5d0\uc11c \uc62c\ub77c\uc640 (540, 1180) \uc5d0 \uc815\uc9c0
  var post = card({ w: 560, h: 720, pos: [540, 860], badge: "OOTD", photo: ctx.photos.share, focusY: 0.3, t0: tCard, t1: t1, name: "S09 ootd card" });
  slideIn(post, tCard, "down", { dist: 300, dur: 0.3 });

  // 16.26 \uc8fc\uc778\uacf5 "SHARE IT" \u2014 impactIn \ub4a4\uc5d0 rgbSplit(\ubcf5\uc81c\ubcf8\uc774 \ucc29\uc9c0 \ud0a4\ub97c \ubb3c\ub824\ubc1b\ub3c4\ub85d \uc21c\uc11c \uc720\uc9c0)
  var title = text("SHARE IT", { font: "en", size: 170, color: COL.white, pos: [540, 400], t0: t0, t1: t1, name: "S09 share it" });
  impactIn(title, t0);
  rgbSplit(title, t0, { frames: 2 });

  // 17.40 (pop1) \ud558\ud2b8 popIn + \uc88b\uc544\uc694 \uc218 fadeIn + \uce74\uba54\ub77c \ud754\ub4e4\ub9bc 0.5
  var heart = icon("heart", { color: COL.lime, size: 150, pos: [250, 1340], t0: T.pop1, t1: t1, name: "S09 heart" });
  popIn(heart, T.pop1);
  var likes = text("1.2K", { font: "enMid", size: 40, color: COL.white, pos: [390, 1340], t0: T.pop1, t1: t1, name: "S09 like count" });   // r02 \uac80\uc218: \ud558\ud2b8\uc5d0 \ubd99\uc5b4 \ubcf4\uc5ec +30
  fadeIn(likes, T.pop1);
  shake(T.pop1, { amount: 0.5 });

  // 17.80 (pop2) \ub9d0\ud48d\uc120 popIn + \ub313\uae00 \uc218(\uc88b\uc544\uc694 \uc218\uc640 \uac19\uc740 \uc2a4\ud0c0\uc77c\ub85c fadeIn)
  var bubble = icon("bubble", { color: COL.purple, size: 110, pos: [520, 1340], t0: T.pop2, t1: t1, name: "S09 bubble" });
  popIn(bubble, T.pop2);
  var comments = text("248", { font: "enMid", size: 40, color: COL.white, pos: [640, 1340], t0: T.pop2, t1: t1, name: "S09 comment count" });   // r02 \uac80\uc218: \ub9d0\ud48d\uc120\uc5d0 \ubd99\uc5b4 \ubcf4\uc5ec +25
  fadeIn(comments, T.pop2);

  // 18.10 "+ FOLLOW" \uc54c\uc57d(lime \ubc30\uacbd \u00b7 black \uae00\uc790) popIn
  var follow = pill("+ FOLLOW", { color: COL.lime, textColor: COL.black, size: 26, pos: [820, 1340], t0: tFollow, t1: t1, name: "S09 follow pill" });
  popIn(follow, tFollow);

  // 18.46 \ud558\ub4dc\ucef7 \u2014 \ubaa8\ub4e0 \ub808\uc774\uc5b4 t1 = T.verseEnd, \ud1f4\uc7a5 \ubaa8\uc158 \uc5c6\uc74c
});

// ===== 19-s10-logo-reveal.jsx =====
// S10 logo-reveal \u2014 \ubc24\ud2f0 \ub9d0\uace0 POTATA! \ud6c4\ub834 1\u00b72 + \uc751\ub2f5 \ucc48\ud2b8 (18.46\u201324.72)
// SPEC "### S10" \uc808\uc744 \ub808\uc774\uc5b4\u00b7\ud0a4\ud504\ub808\uc784 \ub2e8\uc704\ub85c \uad6c\ud604. \ud5ec\ud37c\ub294 00-core.jsx \uac00 SSoT.
scene("S10", T.hook1, T.seoulTo, function (ctx) {
  var t0 = T.hook1, t1 = T.seoulTo;
  var LOGO_Y = 1010, LOGO_SIZE = 220, LOGO_GAP = -6, ENTER_DUR = 0.22;   // r02 \uac80\uc218: \ub2e4\ub978 \uc7a5\uba74 \ub85c\uace0(tracking -40)\uc640 \uc790\uac04\uc744 \ub9de\ucd94\uae30 \uc704\ud574 \uac04\uaca9\uc744 \uc74c\uc218\ub85c
  var chars = ["P", "O", "T", "A", "T", "A"];
  var resp1 = [T.resp1a, T.resp1b, T.resp1c], resp2 = [T.resp2a, T.resp2b, T.resp2c];
  var letters = [], widths = [], posX = [], total = 0, cursor, tE, pairT, i, k, L, bL, bR;

  // \ud14d\uc2a4\ud2b8 \ud3ed \uc5b4\ub9bc (SPEC \u00a70.10):
  //  - "\ubc24\ud2f0" / "\ub9d0\uace0": 2 \u00d7 0.95 \u00d7 150 = 285px  \u2192 OK
  //  - \ub85c\uace0 "P O T A T A": Outfit-ExtraBold \uc2e4\uce21 \uc789\ud06c \ud3ed P .555 / O .758 / T .613 / A .720 em (O\u00b7A \uac00 \u00a70.10 \uc5b4\ub9bc 0.62 \ubcf4\ub2e4 \ub113\ub2e4).
  //    SPEC "### S10" \uba85\uc2dc\uac12 260 \uc774\uba74 1074.5px(x 2.7~1077.3) \ub85c \u00a70.9 \uc548\uc804\uc601\uc5ed(x 80~1000)\u00b7\u00a70.10(920 \uc774\ud558)\uc744 \ubaa8\ub450 \ubc97\uc5b4\ub098\ubbc0\ub85c
  //    \ub9ac\ubdf0 \uacb0\uc815\uc5d0 \ub530\ub77c 220 \uc73c\ub85c \ub0ae\ucda4 \u2192 915.4px, x 82.3~997.7 (221 \uc774 \ud55c\uacc4, 222 \ubd80\ud130 \ucd08\uacfc). \ubc30\uce58\ub294 \ub7f0\ud0c0\uc784 bbox \ub85c \ub2e4\uc2dc \uc7b0\ub2e4.
  //    NOTE: SPEC "### S10" \uc758 'size 260' \uc740 owner \uac00 220 \uc73c\ub85c \ub3d9\uae30\ud654\ud574\uc57c \ud55c\ub2e4(SPEC \uc218\uc815\uc740 \uc774 \ud30c\uc77c \ubc94\uc704 \ubc16).
  //  - "K-FASHION, RECODED.": 19 \u00d7 0.62 \u00d7 34 \u2248 400 + tracking 500 \u2192 18 \u00d7 0.5 \u00d7 34 = 306 \u2192 \u2248 706px \u2192 OK

  // \ubcf5\uc81c \uae00\uc790(lime/purple): \uc6d0\ubcf8\uacfc \uac19\uc740 \uc704\uce58\u00b7\ud06c\uae30, \uae30\ubcf8 opacity 0 \u2192 hold \ud0a4\ub85c\ub9cc \ucf20\ub2e4
  function makeClones(color, label) {
    var arr = [], C, q;
    for (q = 0; q < chars.length; q++) {
      C = text(chars[q], { font: "en", size: LOGO_SIZE, tracking: 0, color: color, pos: [posX[q], LOGO_Y], t0: T.hook1Potata, t1: t1, name: "S10 logo " + label + " " + (q + 1) + " " + chars[q] });
      C.opacity.setValue(0);
      // r02 \uac80\uc218: \ubcf5\uc81c\ubcf8\uc5d0 glow \ub97c \uc5b9\uc73c\uba74 lime/purple \uc774 \ud770\uc0c9\uc73c\ub85c \ud45c\ubc31\ub3fc \uc0c9 \uc804\ud658\uc774 \uc548 \uc77d\ud78c\ub2e4 \u2192 \ubcf5\uc81c\ubcf8\uc740 glow \uc5c6\uc774(\uc544\ub798 \uc6d0\ubcf8\uc758 \ud770 \ud560\ub85c\uac00 \ub0a8\uc544 \ubc1c\uad11\uac10\uc740 \uc720\uc9c0)
      arr.push(C);
    }
    return arr;
  }

  // ---------- \ub4a4: purple \uae00\ub85c\uc6b0 \uc6d0 (19.20 \ubd80\ud130, \ube44\ud2b8 \ub530\ub77c 8~40%) ----------
  var bg = ellipse({ w: 1500, h: 1500, color: COL.purple, pos: [540, 1000], t0: T.hook1Potata, t1: t1, name: "S10 bg glow" });
  bg.opacity.setValue(0);
  beatOpacity(bg, 5, 24);  // r02 \uac80\uc218: 8~40 \uc740 \ubcf4\ub77c \uc6d0\uc774 \ub85c\uace0\ubcf4\ub2e4 \ud280\uc5b4 \ub0ae\ucda4

  // ---------- r06: \uc751\ub2f5 \ucc48\ud2b8 "PO-TA-TA" \ube44\ud2b8\ub9c8\ub2e4 \uc804\uba74 \ubaa8\ub378 \uc0ac\uc9c4 \ud558\ub4dc\ucef7 (\ub85c\uace0\u00b7\ubc24\ud2f0 \ub9d0\uace0 \ub4a4, \ub2e4\uc74c \ube44\ud2b8 \ub610\ub294 0.26s \uae4c\uc9c0) ----------
  var flashSets = [[resp1, ["feed-1", "style-4", "feed-4"], T.hook2], [resp2, ["style-2", "tryon", "share"], t1]];
  var fs, fq, fEnd;
  for (fs = 0; fs < flashSets.length; fs++) {
    for (fq = 0; fq < 3; fq++) {
      fEnd = (fq < 2) ? flashSets[fs][0][fq + 1] : Math.min(flashSets[fs][0][fq] + 0.26, flashSets[fs][2]);
      photoFlash(ctx.photos[flashSets[fs][1][fq]], flashSets[fs][0][fq], fEnd - flashSets[fs][0][fq], { name: "S10 flash photo " + flashSets[fs][1][fq] });
    }
  }

  // ---------- 18.46 "\ubc24\ud2f0" impactIn + rgbSplit, 18.60 purple \ucde8\uc18c\uc120 ----------
  var bamti = text("\ubc24\ud2f0", { size: 150, color: COL.white, pos: [380, 760], t0: T.hook1, t1: t1, name: "S10 \ubc24\ud2f0" });
  impactIn(bamti, T.hook1);
  rgbSplit(bamti, T.hook1, { frames: 2 });
  var st = strike(bamti, T.hook1 + 0.14, { color: COL.purple, thick: 18 });
  st.name = "S10 strike \ubc24\ud2f0";

  // ---------- 18.82 "\ub9d0\uace0" impactIn ----------
  var malgo = text("\ub9d0\uace0", { size: 150, color: COL.white, pos: [700, 760], t0: T.hook1b, t1: t1, name: "S10 \ub9d0\uace0" });
  impactIn(malgo, T.hook1b);

  // ---------- \uc774\uc911 \ud45c\uae30: \ubc24\ud2f0 \uccab \ub4f1\uc7a5\uc774\ub77c \ub73b \ud480\uc774\uae4c\uc9c0("BAM-TI = MID"), \ub9d0\uace0 = "NAH" ----------
  // \ud3ed \uc5b4\ub9bc: "BAM-TI = MID" 12\uc790 \u00d7 0.62 \u00d7 34 \u2248 253 + tracking 250(8.5px \u00d7 11) \u2248 346px \u2192 x 207~553 / "NAH" \u2248 80px \u2192 x 660~740. \ub85c\uace0 \uc717\ub2e8(\u2248 930) \uc704.
  gloss("BAM-TI = MID", { pos: [380, 868], size: 34, t0: T.hook1, t1: t1, name: "S10 gloss \ubc24\ud2f0" });
  gloss("NAH", { pos: [700, 868], size: 34, t0: T.hook1b, t1: t1, name: "S10 gloss \ub9d0\uace0" });

  // ---------- 19.20 \ub85c\uace0 \uacb0\ud569: 6\uae00\uc790\ub97c (540,1010) \uc5d0 \ub9cc\ub4e4\uace0 bbox \ud3ed\uc73c\ub85c \uac00\uc6b4\ub370 \uc815\ub82c ----------
  for (i = 0; i < chars.length; i++) {
    L = text(chars[i], { font: "en", size: LOGO_SIZE, tracking: 0, color: COL.white, pos: [540, LOGO_Y], t0: T.hook1Potata, t1: t1, name: "S10 logo " + (i + 1) + " " + chars[i] });
    letters.push(L);
    widths.push(bbox(L, T.hook1Potata).width);
    total += widths[i];
  }
  total += LOGO_GAP * (chars.length - 1);
  cursor = 540 - total / 2;
  for (i = 0; i < letters.length; i++) {
    posX.push(cursor + widths[i] / 2);
    setv(letters[i].position, [posX[i], LOGO_Y]);
    cursor += widths[i] + LOGO_GAP;
  }
  // AE 1\ucc28 \uc2e4\ud589 \uac80\uc99d\uc6a9(\ub4f1\uc7a5 \ud0a4\ub97c \ub123\uae30 \uc804\uc5d0 \uc7ac\uc57c \ucd5c\uc885 \uc704\uce58\ub2e4): \uae30\ub300 P left \u2248 82, A right \u2248 998 \u2014 \u00a70.9 x 80~1000 \uc548\uc774\uc5b4\uc57c \ud55c\ub2e4
  bL = bbox(letters[0], T.hook1Potata); bR = bbox(letters[5], T.hook1Potata);
  log("S10 logo bbox: P left=" + Math.round(bL.left) + " A right=" + Math.round(bR.left + bR.width) + " total=" + Math.round(total) + "px (expect ~82 / ~998 / ~915)");
  // \ub4f1\uc7a5: P left / O impactIn(190) / T down / A up / T down / A up \u2014 19.20 \ubd80\ud130 2\ud504\ub808\uc784\uc529 \uc9c0\uc5f0, dur 0.22. \uac01 \uae00\uc790 glow.
  for (i = 0; i < letters.length; i++) {
    tE = T.hook1Potata + f(2 * i);
    if (i === 0) { slideIn(letters[i], tE, "left", { dist: 500, dur: ENTER_DUR }); }
    else if (i === 1) { impactIn(letters[i], tE, { from: 190, dur: ENTER_DUR }); }
    else if (i === 2 || i === 4) { slideIn(letters[i], tE, "down", { dist: 400, dur: ENTER_DUR }); }
    else { slideIn(letters[i], tE, "up", { dist: 400, dur: ENTER_DUR }); }
    glow(letters[i], { radius: 70, intensity: 0.9 });
  }

  // ---------- 19.60 \ud0dc\uadf8\ub77c\uc778 typeOn ----------
  // r02 \uac80\uc218: 19.50 shake(1.4) \uac10\uc1e0\uc640 \uacb9\uce58\uba74 \uc791\uc740 \uae00\uc790\uac00 \ubb49\uac1c\uc838 19.75 \ub85c \ub2a6\ucda4
  var tag = text("K-FASHION, RECODED.", { font: "en", size: 34, tracking: 500, color: COL.lime, pos: [540, 1200], t0: T.hook1Potata + 0.55, t1: t1, name: "S10 tagline" });
  typeOn(tag, T.hook1Potata + 0.55, 0.4);

  // ---------- \ubcf5\uc81c \uae00\uc790 (\uc6d0\ubcf8 \uc704\uc5d0 \uc313\uc774\ub3c4\ub85d \uc6d0\ubcf8 \ub2e4\uc74c\uc5d0 \uc0dd\uc131) ----------
  var limeC = makeClones(COL.lime, "lime");
  var purpleC = makeClones(COL.purple, "purple");

  // ---------- \uc751\ub2f5 1 (20.60/20.81/21.02): PO / TA / TA \uc30d pulse(1.12) + lime \ubcf5\uc81c 2\ud504\ub808\uc784 ----------
  // lime \ubcf5\uc81c\ub294 22.58\u219223.00 (hook2Potata) \uc5d0\ub3c4 100 \uc73c\ub85c \ucf1c\uc9c4\ub2e4(\ub85c\uace0 \uc804\uccb4 lime). \ubcf5\uc81c\ub3c4 \uac19\uc774 pulse \ud574 \ud06c\uae30\ub97c \ub9de\ucd98\ub2e4.
  for (k = 0; k < chars.length; k++) {
    pairT = resp1[Math.floor(k / 2)];
    pulse(letters[k], pairT, { amount: 1.12 });
    pulse(limeC[k], pairT, { amount: 1.12 });
    setKeys(limeC[k].opacity, [[T.hook1Potata, 0], [pairT, 100], [pairT + f(4), 0], [T.hook2Potata, 100], [T.hook2Potata + 0.42, 0]], "hold");
  }

  // ---------- 21.38 hook2: \ubc24\ud2f0\u00b7\ub9d0\uace0 pulse(1.08) + \ubc24\ud2f0 rgbSplit / 22.26 \ub9d0\uace0 pulse(1.08) ----------
  pulse(bamti, T.hook2, { amount: 1.08 });
  pulse(malgo, T.hook2, { amount: 1.08 });
  rgbSplit(bamti, T.hook2, { frames: 2 });
  pulse(malgo, T.hook2b, { amount: 1.08 });

  // ---------- \uc751\ub2f5 2 (23.80/24.05/24.45): \uac19\uc740 \uc30d pulse(1.12) + purple \ubcf5\uc81c 2\ud504\ub808\uc784 ----------
  for (k = 0; k < chars.length; k++) {
    pairT = resp2[Math.floor(k / 2)];
    pulse(letters[k], pairT, { amount: 1.12 });
    pulse(purpleC[k], pairT, { amount: 1.12 });
    setKeys(purpleC[k].opacity, [[T.hook1Potata, 0], [pairT, 100], [pairT + f(4), 0]], "hold");
  }

  // ---------- 19.50 purple flash(peak 55, 0.12) + shake(1.4) \u2014 \ub9e8 \uc704\uc5d0 \uc313\uc774\ub3c4\ub85d \ub9c8\uc9c0\ub9c9 \uc0dd\uc131 ----------
  var fl = flash(COL.purple, T.hook1Potata + 0.30, { peak: 55, dur: 0.12 });
  fl.name = "S10 flash";
  shake(T.hook1Potata + 0.30, { amount: 1.4 });

  // 24.72 \ud558\ub4dc\ucef7: \ubaa8\ub4e0 \ub808\uc774\uc5b4 t1 = T.seoulTo
});

// ===== 20-s11-seoul-dubai.jsx =====
// S11 seoul-dubai \u2014 "Seoul to Dubai, \uc624\ub298\uc740 Potata" (24.72\u201328.00)
// \ub4a4\u2192\uc55e: \ubc30\uacbd(\ubc30\ub108 \ub4c0\uc624\ud1a4) \u2192 SEOUL \u2192 \ud654\uc0b4\ud45c \u2192 DUBAI \u2192 \uc624\ub298\uc740 \u2192 POTATA. 28.00 \ud558\ub4dc\ucef7.
scene("S11", T.seoulTo, T.hook3, function (ctx) {
  var t0 = T.seoulTo, t1 = T.hook3;
  var i;

  // ---- \ubc30\uacbd: \ubc30\ub108 \ud478\ud2f0\uc9c0\ub97c \uac80\uc815\u2192\ubcf4\ub77c \ub4c0\uc624\ud1a4 55% \ub85c \uae54\uace0 \ub290\ub9ac\uac8c \ud328\ub2dd(x 640\u2192440) + \uc90c(250\u2192262) ----
  var bg;
  if (ctx.banner) {
    bg = image(ctx.banner, { scale: 250, pos: [640, 1080], t0: t0, t1: t1, name: "S11 bg banner" });   // r02 \uac80\uc218: 960 \uc774\uba74 \ubaa8\ub378 \uc5bc\uad74\uc774 \uc0c1\ub2e8\uc5d0\uc11c \uc798\ub824 120 \ub0b4\ub9bc
    tint(bg, COL.black, COL.purple, 100);
    bg.opacity.setValue(55);
    setKeys(bg.position, [[t0, [640, 1080]], [t1, [440, 1080]]], "linear");
    setKeys(bg.scale, [[t0, [250, 250]], [t1, [262, 262]]], "linear");
  } else {
    // \ubc30\ub108\uac00 \uc5c6\uc73c\uba74 \ubcf4\ub77c \uc804\uba74 \uc0ac\uac01\ud615 25% \ub85c \ub300\uccb4
    bg = rect({ w: W, h: H, color: COL.purple, pos: [CX, CY], t0: t0, t1: t1, name: "S11 bg fallback" });
    bg.opacity.setValue(25);
  }

  // ---- 24.72 "SEOUL" white en 150 at (300, 700) \u2014 \ud3ed \u2248 5 \u00d7 0.62 \u00d7 150 = 465px ----
  var seoul = text("SEOUL", { font: "en", size: 150, color: COL.white, pos: [320, 560], t0: t0, t1: t1, name: "S11 SEOUL" });
  impactIn(seoul, t0);

  // ---- 24.90\u219225.40 \ud654\uc0b4\ud45c (150\u2192930, y 860). \ub110\uc774 \uc7a5\uba74 \uc548\uc5d0 \uba38\ubb3c\ub3c4\ub85d o.t1 \uc744 \ubc18\ub4dc\uc2dc \ub118\uae34\ub2e4 ----
  var arrowT0 = T.seoulTo + 0.18, arrowT1 = T.dubai - 0.04;
  var arr = arrow(arrowT0, arrowT1, { x0: 150, x1: 930, y: 720, color: COL.lime, thick: 12, head: 80, t1: t1 });
  arr.name = "S11 arrow ctrl";

  // ---- 25.44 "DUBAI" lime en 150 at (780, 1020) \u2014 \ud3ed \u2248 465px ----
  var dubai = text("DUBAI", { font: "en", size: 150, color: COL.lime, pos: [760, 880], t0: T.dubai, t1: t1, name: "S11 DUBAI" });
  impactIn(dubai, T.dubai);
  rgbSplit(dubai, T.dubai, { frames: 2 });
  shake(T.dubai, { amount: 0.8 });

  // ---- 25.88 "\uc624\ub298\uc740" white ko 150 at (540, 1300) \u2014 \ud3ed \u2248 3 \u00d7 0.95 \u00d7 150 = 428px ----
  var today = text("\uc624\ub298\uc740", { font: "ko", size: 150, color: COL.white, pos: [540, 1160], t0: T.today, t1: t1, name: "S11 \uc624\ub298\uc740" });
  impactIn(today, T.today);
  // \uc774\uc911 \ud45c\uae30: "\uc624\ub298\uc740"(\uc544\ub798 \ub05d \u2248 1360)\uacfc POTATA(\uc717\ub2e8 \u2248 1423) \uc0ac\uc774
  gloss("TODAY IT'S", { pos: [540, 1253], size: 30, color: COL.white, t0: T.today, t1: t1, name: "S11 gloss \uc624\ub298\uc740" });

  // ---- 26.58 "POTATA" lime en 220 tracking -40 at (540, 1500) \u2014 \ud3ed \u2248 6 \u00d7 0.62 \u00d7 220 = 818px, tracking -40 \uc801\uc6a9 \uc2dc \u2248 774px ----
  var potata = text("POTATA", { font: "en", size: 220, color: COL.lime, tracking: -40, pos: [540, 1360], t0: T.todayPotata, t1: t1, name: "S11 POTATA" });
  glow(potata, { radius: 80, intensity: 0.5, threshold: 70 });   // r02 \uac80\uc218: lime \uc774 \ud770\uc0c9\uc73c\ub85c \ud45c\ubc31\ub418\uc9c0 \uc54a\uac8c
  impactIn(potata, T.todayPotata, { from: 125 });
  shake(T.todayPotata, { amount: 1.0 });

  // ---- 27.028 / 27.469 / 27.887 \ube44\ud2b8\uc5d0 pulse(1.05). \ucc29\uc9c0 \uc9c1\ud6c4(26.61) \ube44\ud2b8\ub294 \uc81c\uc678\ud558\ub824\uace0 \ud558\ud55c\uc744 +0.4 \ub85c \ub454\ub2e4 ----
  var pulseFrom = T.todayPotata + 0.4;
  for (i = 0; i < BEATS.length; i++) {
    if (BEATS[i] >= pulseFrom && BEATS[i] < t1) { pulse(potata, BEATS[i], { amount: 1.05 }); }
  }
});

// ===== 21-s12-hook3.jsx =====
// S12 hook3 \u2014 \ubc24\ud2f0 \ub9d0\uace0 Potata! \ucd5c\uace0 \uc5d0\ub108\uc9c0 \uad6c\uac04, \uad6c\uac04\ubcc4 \uc0c9 \ubc18\uc804 (28.00\u201331.46)
scene("S12", T.hook3, T.yeah, function (ctx) {
  // \uad6c\uac04 \uacbd\uacc4: A(lime) \u2192 B(\uac80\uc815) \u2192 C(purple) \u2192 D(\uac80\uc815). \uc7a5\uba74 \uac04\u00b7\uad6c\uac04 \uac04 \ubaa8\ub450 \ud558\ub4dc\ucef7.
  var tA = T.hook3;                // 28.00 "\ubc24\ud2f0"
  var tB = T.hook3b;               // 29.12 "\ub9d0\uace0"
  var tC = T.hook3Potata;          // 29.46 "POTATA" (purple \ubc30\uacbd)
  var tD = T.hook3Potata + 0.84;   // 30.30 "POTATA" lime \u2014 SPEC D \uc2dc\uc791. T \ud0a4\uac00 \uc5c6\uc5b4 tC \uae30\uc900 \uc624\ud504\uc14b(\u2248 2 beats)
  var t1 = T.yeah;                 // 31.46 \ud558\ub4dc\ucef7
  var bA1 = BEATS[66], bA2 = BEATS[67]; // 28.328 / 28.746
  var bC1 = BEATS[70];                  // 30.023

  // ---------- A 28.00\u201329.12 : lime \ubc30\uacbd + "\ubc24\ud2f0" black ----------
  // \ud3ed \uc5b4\ub9bc: 2\uc790 \u00d7 0.95 \u00d7 220 = 418px < 920
  solid(COL.lime, tA, tB, "S12 bg lime");
  var bamti = text("\ubc24\ud2f0", { font: "ko", size: 220, color: COL.black, pos: [540, 760], t0: tA, t1: tB, name: "S12 bamti" });
  impactIn(bamti, tA);
  rgbSplit(bamti, tA, { frames: 2 });
  pulse(bamti, bA1, { amount: 1.06 });
  pulse(bamti, bA2, { amount: 1.06 });
  gloss("MID", { pos: [540, 905], size: 48, color: COL.black, t0: tA, t1: tB, name: "S12 gloss \ubc24\ud2f0" });   // lime \ubc30\uacbd \u2192 black
  var st = strike(bamti, tA + 0.70, { color: COL.purple, thick: 24 }); // 28.70 \u2014 t1 \uc740 bamti \uc758 outPoint(29.12)
  st.name = "S12 bamti strike";

  // ---------- B 29.12\u201329.46 : (\uac80\uc815) "\ub9d0\uace0" white ----------
  // \ud3ed \uc5b4\ub9bc: 2\uc790 \u00d7 0.95 \u00d7 220 = 418px < 920. \uc704\uce58\ub294 "\ubc24\ud2f0" \uc790\ub9ac\ub97c \uadf8\ub300\ub85c \uc774\uc5b4\ubc1b\ub294\ub2e4(\ub2e8\uc5b4 \uad50\uccb4).
  // r02 \uac80\uc218: \ud6c4\ubc18 13\ucd08\uac00 \uc804\ubd80 \uc911\uc559 \ubc30\uce58\ub77c \ubc24\ud2f0(760)/\ub9d0\uace0(1160)/POTATA(960) \ub85c \uc704/\uc544\ub798/\uc911\uc559 \ub9ac\ub4ec\uc744 \uc900\ub2e4
  var malgo = text("\ub9d0\uace0", { font: "ko", size: 220, color: COL.white, pos: [540, 1160], t0: tB, t1: tC, name: "S12 malgo" });
  impactIn(malgo, tB);
  rgbSplit(malgo, tB, { frames: 2 });
  gloss("NAH", { pos: [540, 1305], size: 48, t0: tB, t1: tC, delay: f(1), name: "S12 gloss \ub9d0\uace0" });   // \uad6c\uac04\uc774 0.34s \ub77c 1\ud504\ub808\uc784\ub9cc \ub2a6\ucd98\ub2e4

  // ---------- C 29.46\u201330.30 : purple \ubc30\uacbd + "POTATA" white ----------
  // \ud3ed \uc5b4\ub9bc: 6\uc790 \u00d7 0.62 \u00d7 230 = 856px, tracking -40(\u2248 -9px \u00d7 5) \u2192 \uc57d 810px < 920
  // \uc704\uce58\ub294 \ud654\uba74 \uc911\uc559(540, 960): D \uc758 \ubcf4\uc870 \ud14d\uc2a4\ud2b8 y 760 / 1160 \uc774 \u00b1200 \uc73c\ub85c \ub300\uce6d\uc774 \ub418\ub294 \uae30\uc900
  solid(COL.purple, tC, tD, "S12 bg purple");
  var potC = text("POTATA", { font: "en", size: 230, color: COL.white, tracking: -40, pos: [540, 960], t0: tC, t1: tD, name: "S12 potata purple" });
  impactIn(potC, tC, { from: 130 });
  rgbSplit(potC, tC, { frames: 3, offset: 22 });
  shake(tC, { amount: 1.4 });
  pulse(potC, bC1, { amount: 1.06 });

  // ---------- D 30.30\u201331.46 : (\uac80\uc815) \ubcf4\uc870 \ud14d\uc2a4\ud2b8 \u2192 "POTATA" lime ----------
  // \ud3ed \uc5b4\ub9bc: "\ubc24\ud2f0 \ub9d0\uace0" 5\uc790 \u00d7 0.95 \u00d7 64 = 304px / "SEOUL TO DUBAI" 14\uc790 \u00d7 0.62 \u00d7 30 = 260 + tracking 600(18px \u00d7 13) = 494px
  var sub = text("\ubc24\ud2f0 \ub9d0\uace0", { font: "ko", size: 64, color: COL.white, pos: [540, 760], t0: tD, t1: t1, name: "S12 sub bamti malgo" });
  typeOn(sub, tD, 0.2);
  gloss("MID? NAH.", { pos: [540, 826], size: 30, t0: tD, t1: t1, name: "S12 gloss sub" });   // sub(\uc544\ub798 \ub05d \u2248 786)\uc640 POTATA(\uc717\ub2e8 \u2248 880) \uc0ac\uc774
  var tag = text("SEOUL TO DUBAI", { font: "enMid", size: 30, color: COL.lime, tracking: 600, pos: [540, 1160], t0: tD, t1: t1, name: "S12 tag seoul to dubai" });
  fadeIn(tag, tD);
  var potD = text("POTATA", { font: "en", size: 230, color: COL.lime, tracking: -40, pos: [540, 960], t0: tD, t1: t1, name: "S12 potata lime" });
  impactIn(potD, tD);
  beatScale(potD, 8);
});

// ===== 22-s13-yeah.jsx =====
// S13 yeah \u2014 "YEAH!" (31.46\u201332.34) : \uc8fc\uc778\uacf5 \ud558\ub098, \uae00\ub9ac\uce58 + \ud50c\ub798\uc2dc + \uce74\uba54\ub77c \ud754\ub4e4\ub9bc \ub4a4 \ud558\ub4dc\ucef7
scene("S13", T.yeah, T.follow, function (ctx) {
  var t0 = T.yeah, t1 = T.follow;   // T.follow === T.yeahEnd (32.34)
  var tBeat = BEATS[75];            // 32.183 \u2014 \uc7a5\uba74 \uc548 \ub9c8\uc9c0\ub9c9 \ube44\ud2b8 (pulse \uc2dc\uac01)

  // \ub4a4 \u2192 \uc55e \uc21c\uc11c\ub85c \uc0dd\uc131. \ubc30\uacbd\uc740 \uc804\uc5ed BG(\uac80\uc815)\uac00 \uc788\uc73c\ubbc0\ub85c \ub9cc\ub4e4\uc9c0 \uc54a\ub294\ub2e4.
  // \ud3ed \uc5b4\ub9bc(\u00a70.10): \ub300\ubb38\uc790 4\uc790 \u00d7 0.62 \u00d7 300 = 744 + "!"(\uc881\uc740 \uae00\uc790, \u22480.3 \u00d7 300 = 90) \u2248 834px < 920 OK
  //   (5\uc790 \uc804\ubd80 0.62 \ub85c \uc7a1\uc73c\uba74 930 \u2014 10px \ucd08\uacfc\uc9c0\ub9cc "!" \ud3ed\uc774 \uc881\uc544 \uc2e4\uc81c \uc548\uc804 \uc601\uc5ed x 80~1000 \uc548\uc5d0 \ub4e0\ub2e4)
  var yeah = text("YEAH!", { font: "en", size: 300, color: COL.purple, vscale: 120, pos: [540, 960], t0: t0, t1: t1, name: "S13 YEAH!" });
  yeah.rotation.setValue(-6);                       // SPEC rotation -6 \u2014 \ubcf5\uc81c\ubcf8\uc774 \ubb3c\ub824\ubc1b\ub3c4\ub85d rgbSplit \ubcf4\ub2e4 \uba3c\uc800
  impactIn(yeah, t0, { from: 140 });                // 140% \u2192 100% \ucc29\uc9c0 + 2\ud504\ub808\uc784 \ud398\uc774\ub4dc
  rgbSplit(yeah, t0, { frames: 3, offset: 24 });    // impactIn \ub4a4\uc5d0 \ubcf5\uc81c\ud574\uc57c _R/_C \ubcf5\uc81c\ubcf8\ub3c4 \uac19\uc740 \uc2a4\ucf00\uc77c\u00b7\ud398\uc774\ub4dc\ub97c \ub530\ub978\ub2e4
  shake(t0, { amount: 1.5 });                       // CTRL Shake \uc2ac\ub77c\uc774\ub354 (\uce74\uba54\ub77c \ub110)
  pulse(yeah, tBeat, { amount: 1.05 });             // 32.183 \ube44\ud2b8 \u2014 \uc751\ub2f5 \ub290\ub08c\uc758 \uc791\uc740 \ud290

  // \ub9e8 \uc55e: \ud770 \ud50c\ub798\uc2dc (\uc804\uccb4 \ud654\uba74 \uc194\ub9ac\ub4dc, parent \uc5c6\uc74c \u2192 \ud754\ub4e4\ub9bc \uc601\ud5a5 \uc5c6\uc74c). 31.46\u201331.54
  var fl = flash(COL.white, t0, { peak: 40, dur: 0.08 });
  fl.name = "S13 flash";
});

// ===== 23-s14-follow.jsx =====
// S14 follow \u2014 "Follow the build\u2026" \uc18d\uc0ad\uc784, \uac00\uc7a5 \uc870\uc6a9\ud55c \ud654\uba74 (32.34\u201333.58, \ud398\uc774\ub4dc\uc544\uc6c3 \uaf2c\ub9ac 33.80 \uae4c\uc9c0\ub294 SPEC \uc608\uc678)
//
// \ud14d\uc2a4\ud2b8 \ud3ed \uc5b4\ub9bc(SPEC \u00a70.10) \u2014 enMid \ub300\ubb38\uc790 1\uae00\uc790 \u2248 0.62 \u00d7 64 \u2248 40px, tracking 600 \u2192 \uae00\uc790 \uc0ac\uc774 0.6 \u00d7 64 = 38.4px:
//   FOLLOW \u2248 6\u00d740 + 5\u00d738.4 \u2248 432 \u00b7 THE \u2248 3\u00d740 + 2\u00d738.4 \u2248 197 \u00b7 BUILD \u2248 5\u00d740 + 4\u00d738.4 \u2248 354 \u00b7 \ub2e8\uc5b4 \uac04\uaca9 2\u00d756 = 112
//   \u2192 \uc138 \ub2e8\uc5b4 \ud55c \uc904 \u2248 1095px, \ub4a4\uc758 "\u2026" 3\uc810 \u2248 3\u00d7(16 + 38.4) \u2248 163px \u2192 920px \uc744 \ub118\ub294\ub2e4(\uce94\ubc84\uc2a4 1080 \ub3c4 \ub118\ub294\ub2e4).
//   \uadf8\ub798\uc11c size 64 \ub97c \uc0c1\ud55c\uc73c\ub85c \ub450\uace0 \ub7f0\ud0c0\uc784\uc5d0 bbox \ub85c \uc2e4\uce21\ud574, \uc138 \ub2e8\uc5b4\uc758 \uac00\uc6b4\ub370 \uc815\ub82c(\uc911\uc2ec x 540)\uc740 \uc720\uc9c0\ud55c \ucc44
//   \ub9c8\uc9c0\ub9c9 \uc810\uae4c\uc9c0 \uc548\uc804 \uc601\uc5ed(x 80~1000)\uc5d0 \ub4e4\uc5b4\uac00\ub3c4\ub85d \uc5ec\uc12f \ub808\uc774\uc5b4\ub97c \uac19\uc740 \ube44\uc728\ub85c \ucd95\uc18c\ud55c\ub2e4(\uc608\uc0c1 s \u2248 0.65 \u2192 \uc720\ud6a8 size \u2248 42).
scene("S14", T.follow, T.buildEnd, function (ctx) {
  var tEnd = T.buildEnd + 0.22;                  // \ub808\uc774\uc5b4 \uc218\uba85 \uaf2c\ub9ac \u2014 SPEC S14 \uac00 \ud5c8\uc6a9\ud55c \ub05d +0.22 \uc608\uc678
  var tMeasure = T.buildEnd;                     // \uc5ec\uc12f \ub808\uc774\uc5b4\uac00 \ubaa8\ub450 \uc0b4\uc544 \uc788\ub294 \uc2dc\uac01 \u2014 bbox \uce21\uc815\uc6a9
  var SIZE = 64, TRACK = 400, GAP = 120, LINE_Y = 960;   // r02 \uac80\uc218: tracking 600\u00b7gap 56 \uc740 \ub2e8\uc5b4 \uacbd\uacc4\uac00 \uc548 \uc77d\ud600 \uae00\uc790 \uac04\uaca9\uc740 \uc904\uc774\uace0 \ub2e8\uc5b4 \uac04\uaca9\uc740 \ud0a4\uc6c0
  var SAFE_HALF = 460;                           // \uc548\uc804 \uc601\uc5ed x 80~1000 \uc758 \ubc18\ud3ed(\uc911\uc2ec 540 \uae30\uc900)
  var trackPx = SIZE * TRACK / 1000;             // tracking 600 = 0.6em \u2192 \uae00\uc790 \uc0ac\uc774 \uac04\uaca9(px)
  var i;

  // \ub4a4 \u2192 \uc55e: \ub2e8\uc5b4 \uc138 \uac1c \u2192 \uc810 \uc138 \uac1c. \uc704\uce58\ub294 \uc2e4\uce21 \ub4a4\uc5d0 \ub2e4\uc2dc \uc7a1\uc73c\ubbc0\ub85c \uc77c\ub2e8 (540, 960) \uc5d0 \ub9cc\ub4e0\ub2e4.
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

  // 1) \uc2e4\uce21(\ubc30\uc728 100) \u2192 \ucd95\uc18c \ubc30\uc728 s. \uc138 \ub2e8\uc5b4 \uc911\uc2ec\uc744 540 \uc5d0 \ub450\uba74 \uc624\ub978\ucabd \ub05d = 540 + \ub2e8\uc5b4\ud3ed/2 + \uc810\ud3ed \uc774\ubbc0\ub85c
  //    \uadf8 \ub05d\uc774 \uc548\uc804 \uc601\uc5ed \uc624\ub978\ucabd(540 + 460)\uc744 \ub118\uc9c0 \uc54a\uac8c \ud55c\ub2e4. \ub118\uc9c0 \uc54a\uc73c\uba74 s = 1 (SPEC \uc758 size 64 \uadf8\ub300\ub85c).
  var wWords = 2 * GAP;
  for (i = 0; i < 3; i++) { wWords += bbox(words[i], tMeasure).width; }
  var wDots = 3 * (trackPx + bbox(dots[0], tMeasure).width);   // BUILD \ub4a4 \uac04\uaca9 + \uc810 \uc138 \uac1c(\uc810 \uc0ac\uc774\ub3c4 tracking \uac04\uaca9)
  var s = Math.min(1, SAFE_HALF / (wWords / 2 + wDots));
  log("S14 line: words=" + Math.round(wWords) + "px dots=" + Math.round(wDots) + "px scale=" + Math.round(s * 100) + "%");
  for (i = 0; i < 3; i++) { setv(words[i].scale, [s * 100, s * 100]); setv(dots[i].scale, [s * 100, s * 100]); }
  var gap = GAP * s, track = trackPx * s;

  // 2) \uc138 \ub2e8\uc5b4\ub97c \ub2e8\uc5b4 \uac04 gap \ub744\uc6cc \uc911\uc2ec x 540 \uc5d0 \uac00\uc6b4\ub370 \uc815\ub82c (bbox \ub294 scale \uc744 \ubc18\uc601\ud55c \uc6d4\ub4dc \ud3ed)
  var ws = [];
  for (i = 0; i < 3; i++) { ws.push(bbox(words[i], tMeasure).width); }
  var x = CX - (ws[0] + ws[1] + ws[2] + 2 * gap) / 2;
  for (i = 0; i < 3; i++) { setv(words[i].position, [x, LINE_Y]); x += ws[i] + gap; }

  // 3) "\u2026" \uc138 \uc810: BUILD \uc624\ub978\ucabd\uc5d0 \uae00\uc790 \uac04\uaca9\ub9cc\ud07c \ub744\uc6b0\uace0, \ubca0\uc774\uc2a4\ub77c\uc778(BUILD \uae00\uc790 \ubc15\uc2a4 \ud558\ub2e8)\uc5d0 \ub9de\ucd98\ub2e4
  var bb = bbox(words[2], tMeasure);
  var baseline = bb.top + bb.height;
  var dx = bb.left + bb.width + track;
  for (i = 0; i < 3; i++) {
    var db = bbox(dots[i], tMeasure);
    setv(dots[i].position, [dx, baseline - db.height / 2]);
    dx += db.width + track;
  }

  // 4) \ub4f1\uc7a5: \ub2e8\uc5b4\ub294 typeOn 0.18 (FOLLOW 32.34 / THE 32.74 / BUILD 33.14), \uc810\uc740 1\ud504\ub808\uc784 fadeIn
  typeOn(words[0], T.follow, 0.18);
  typeOn(words[1], T.the, 0.18);
  typeOn(words[2], T.build, 0.18);
  for (i = 0; i < 3; i++) { fadeIn(dots[i], dotT[i], f(1)); }

  // 5) \ud1f4\uc7a5: 33.58 \ubd80\ud130 0.2s \uc804\uccb4 \ud398\uc774\ub4dc\uc544\uc6c3 (fadeOut \uc774 33.78 \uc5d0\uc11c \ucef7)
  for (i = 0; i < 3; i++) { fadeOut(words[i], T.buildEnd, 0.2); fadeOut(dots[i], T.buildEnd, 0.2); }
});

// ===== 24-s15-outro-chant.jsx =====
// S15 outro-chant \u2014 "Po-ta-ta! (\ube60\ubc24!)" S03 \uc758 \ucf5c\ubc31, \ub354 \ud06c\uac8c (33.58\u201339.66)
scene("S15", T.buildEnd, T.finalHit, function (ctx) {
  var tPo = T.oPo;          // 33.88 "PO"
  var tTa1 = T.oTa1;        // 34.53 "TA" white
  var tTa2 = T.oTa2;        // 35.60 "TA" purple
  var tBba = T.bbam1;       // 37.31 "\ube60" \u2014 \uc138 \ub2e8\uc5b4\ub294 \uc5ec\uae30\uc11c \ub04a\ub294\ub2e4
  var tBam = T.bbam2;       // 37.94 "\ubc24!"
  var t1 = T.finalHit;      // 39.66 \ud558\ub4dc\ucef7
  var bChant = [BEATS[84], BEATS[85], BEATS[86]];   // 36.037 / 36.455 / 36.897 \u2014 \uc138 \ub2e8\uc5b4 pulse
  var bBam = [BEATS[90], BEATS[91], BEATS[92]];     // 38.615 / 39.033 / 39.474 \u2014 "\ubc24!" pulse + 1f \uae00\ub9ac\uce58
  var i;

  // r06: \uc138 \ub2e8\uc5b4 pulse \ube44\ud2b8(36.04/36.46/36.90)\ub9c8\ub2e4 \uc804\uba74 \ubaa8\ub378 \uc0ac\uc9c4 \ud558\ub4dc\ucef7 \u2014 \uae00\uc790\ubcf4\ub2e4 \uba3c\uc800 \ub9cc\ub4e4\uc5b4 \ub4a4\uc5d0 \uae50\ub2e4. \ub9c8\uc9c0\ub9c9\uc740 "\ube60"(37.31) \uc9c1\uc804\uae4c\uc9c0.
  var chantPhotos = ["feed-3", "style-3", "style-1"];
  for (i = 0; i < bChant.length; i++) {
    var fEnd = (i < bChant.length - 1) ? bChant[i + 1] : Math.min(bChant[i] + 0.4, tBba);
    photoFlash(ctx.photos[chantPhotos[i]], bChant[i], fEnd - bChant[i], { dim: 55, name: "S15 flash photo " + chantPhotos[i] });
  }

  // 33.58\u201333.88 \uc740 \uac80\uc815(\uc804\uc5ed BG) \u2014 S14 \uc758 \ud398\uc774\ub4dc\uc544\uc6c3(33.80 \uae4c\uc9c0)\uc774 \ub05d\ub098\ub294 \uc228 \uace0\ub974\uae30. \ub808\uc774\uc5b4 \uc5c6\uc74c.
  // \ub4a4 \u2192 \uc55e \uc21c\uc11c\ub85c \uc0dd\uc131. \ubc30\uacbd \uc194\ub9ac\ub4dc\ub294 parent \uc5c6\uc74c(\ud754\ub4e4\ub9bc \uc601\ud5a5 \uc5c6\uc74c), \ud14d\uc2a4\ud2b8\ub294 \uce74\uba54\ub77c \ub110\uc5d0 \ubd99\ub294\ub2e4.

  // ---------- 33.88 / 34.53 / 35.60 : PO \u00b7 TA \u00b7 TA (S03 \ucf5c\ubc31, size 360 \u2192 380) ----------
  // \ud3ed \uc5b4\ub9bc(\u00a70.10): \ub300\ubb38\uc790 2\uc790 \u00d7 0.62 \u00d7 380 = 471px < 920 (\uc138 \ub2e8\uc5b4 \ubaa8\ub450 \uac19\uc740 \ud3ed)
  // impactIn \uc744 rgbSplit \ubcf4\ub2e4 \uba3c\uc800 \u2014 \ubcf5\uc81c\ubcf8 _R/_C \uac00 \uac19\uc740 \uc2a4\ucf00\uc77c \ud0a4\ub97c \ubb3c\ub824\ubc1b\ub294\ub2e4 (S13 \uacfc \uac19\uc740 \uc21c\uc11c)
  var po = text("PO", { font: "en", size: 380, color: COL.lime, pos: [540, 700], t0: tPo, t1: tBba, name: "S15 PO" });
  impactIn(po, tPo, { from: 130 });
  rgbSplit(po, tPo, { frames: 2 });
  shake(tPo, { amount: 1.0 });

  var ta1 = text("TA", { font: "en", size: 380, color: COL.white, pos: [540, 980], t0: tTa1, t1: tBba, name: "S15 TA white" });
  impactIn(ta1, tTa1, { from: 130 });
  shake(tTa1, { amount: 0.8 });

  var ta2 = text("TA", { font: "en", size: 380, color: COL.purple, pos: [540, 1260], t0: tTa2, t1: tBba, name: "S15 TA purple" });
  impactIn(ta2, tTa2, { from: 130 });
  rgbSplit(ta2, tTa2, { frames: 2 });
  shake(tTa2, { amount: 1.0 });

  // 36.037 / 36.455 / 36.897 \ube44\ud2b8 \u2014 \uc138 \ub2e8\uc5b4 \ud568\uaed8 pulse(1.05). \uac01 pulse(0.22s)\ub294 \ub2e4\uc74c \ube44\ud2b8(0.418s \uac04\uaca9) \uc804\uc5d0 \ub05d\ub09c\ub2e4.
  for (i = 0; i < bChant.length; i++) {
    pulse(po, bChant[i], { amount: 1.05 });
    pulse(ta1, bChant[i], { amount: 1.05 });
    pulse(ta2, bChant[i], { amount: 1.05 });
  }

  // ---------- 37.31\u201337.94 : purple \ubc30\uacbd + "\ube60" white ----------
  // \ud3ed \uc5b4\ub9bc: \ud55c\uae00 1\uc790 \u00d7 0.95 \u00d7 360 = 342px < 920
  solid(COL.purple, tBba, tBam, "S15 bg purple");
  var bba = text("\ube60", { font: "ko", size: 360, color: COL.white, pos: [540, 960], t0: tBba, t1: tBam, name: "S15 bba" });
  impactIn(bba, tBba, { from: 130 });
  shake(tBba, { amount: 1.5 });
  gloss("BA-", { pos: [540, 1185], size: 60, color: COL.white, t0: tBba, t1: tBam, name: "S15 gloss \ube60" });

  // ---------- 37.94\u201339.66 : lime \ubc30\uacbd + "\ubc24!" black ----------
  // \ud3ed \uc5b4\ub9bc: 2\uc790 \u00d7 0.95 \u00d7 360 = 684px < 920 ("!" \ub294 \ub354 \uc881\uc544 \uc2e4\uc81c\ub85c\ub294 \uadf8 \uc774\ud558)
  // \uc704\uce58\ub294 SPEC \uc5d0 \uba85\uc2dc\uac00 \uc5c6\uc5b4 "\ube60" \uc790\ub9ac (540, 960) \ub97c \uadf8\ub300\ub85c \uc774\uc5b4\ubc1b\ub294\ub2e4(\ub2e8\uc5b4 \uad50\uccb4 \u2014 S12 \ubc24\ud2f0\u2192\ub9d0\uace0 \uc640 \uac19\uc740 \ubc29\uc2dd)
  solid(COL.lime, tBam, t1, "S15 bg lime");
  var bam = text("\ubc24!", { font: "ko", size: 360, color: COL.black, pos: [540, 960], t0: tBam, t1: t1, name: "S15 bam!" });
  impactIn(bam, tBam, { from: 130 });
  // pulse \ud0a4\ub97c \uba3c\uc800 \ub450\uace0 rgbSplit \uc744 \ub098\uc911\uc5d0 \u2014 \ube44\ud2b8 \uc2dc\uac01\uc758 1f \ubcf5\uc81c\ubcf8\uc774 \uc6d0\ubcf8\uacfc \uac19\uc740 \uc2a4\ucf00\uc77c \ud0a4\ub97c \uac00\uc9c4\ub2e4
  for (i = 0; i < bBam.length; i++) {
    pulse(bam, bBam[i], { amount: 1.06 });   // \ub9c8\uc9c0\ub9c9(39.474+0.22=39.694)\uc740 t1 39.66 \uc5d0\uc11c \ucef7 \u2014 \ud0a4\uac00 outPoint \ub4a4\uc5d0 \ub0a8\uc544\ub3c4 \ubb34\ud574
  }
  rgbSplit(bam, tBam, { frames: 3, offset: 24 });
  // r02 \uac80\uc218: \ube44\ud2b8(38.615/39.033/39.474)\ub9c8\ub2e4 \uae00\ub9ac\uce58\uae4c\uc9c0 \uc5b9\uc73c\uba74 \ud55c \uc7a5\uba74 3\ud68c \uc81c\ud55c(\u00a70.7 \u2463)\uc744 \ub118\uc5b4 pulse \ub9cc \ub0a8\uae34\ub2e4
  shake(tBam, { amount: 1.5 });
  gloss("BAM!", { pos: [540, 1185], size: 60, color: COL.black, t0: tBam, t1: t1, name: "S15 gloss \ubc24!" });
  // 39.66 \ud558\ub4dc\ucef7 \u2014 \ubaa8\ub4e0 \ub808\uc774\uc5b4 t1 = T.finalHit \ub85c \ub04a\ub294\ub2e4(\ud1f4\uc7a5 \ubaa8\uc158 \uc5c6\uc74c)
});

// ===== 25-s16-endcard.jsx =====
// S16 endcard \u2014 \uc5d4\ub4dc\uce74\ub4dc (39.66\u201340.88) : \ud770 \ud50c\ub798\uc2dc + \ub85c\uace0 \ucc29\uc9c0, \ud0dc\uadf8\ub77c\uc778\u00b7\ud578\ub4e4\uc774 \ucc28\ub840\ub85c \ubd99\uc740 \ub4a4 40.88 \uae4c\uc9c0 \uc815\uc9c0
scene("S16", T.finalHit, T.end, function (ctx) {
  var t0 = T.finalHit, t1 = T.end;      // 39.66 / 40.88 (T.end === DUR)
  // T \uc5d0 \uc5c6\ub294 \uc2dc\uac01\uc740 finalHit \uae30\uc900 \uc624\ud504\uc14b\uc73c\ub85c \ub454\ub2e4(SPEC \uc218\uce58 \ubcd1\uae30)
  var tTag = T.finalHit + 0.14;         // 39.80 "K-FASHION, RECODED."
  var tSub = T.finalHit + 0.29;         // 39.95 "SEOUL TO DUBAI"
  var tPill = T.finalHit + 0.44;        // 40.10 "@potata" \uc54c\uc57d
  var tFollow = T.finalHit + 0.54;      // 40.20 "FOLLOW THE BUILD"

  // \ud14d\uc2a4\ud2b8 \ud3ed \uc5b4\ub9bc(\u00a70.10, Outfit \ub300\ubb38\uc790 1\uc790 \u2248 0.62\u00d7size, tracking \uc740 1/1000em \u00d7 size \u00d7 \uae00\uc790 \uac04\uaca9 \uc218):
  //   "POTATA"              6\uc790 \u00d7 0.62 \u00d7 240 = 893px, tracking -40 \u2192 -9.6px \u00d7 5 \u2248 -48 \u2192 \uc57d 845px (< 920 OK)
  //   "K-FASHION, RECODED." 19\uc790 \u00d7 0.62 \u00d7 34 = 400px + tracking 500 \u2192 17px \u00d7 18 = 306 \u2192 \uc57d 706px (< 920 OK)
  //   "SEOUL TO DUBAI"      14\uc790 \u00d7 0.62 \u00d7 30 = 260px + tracking 600 \u2192 18px \u00d7 13 = 234 \u2192 \uc57d 494px (< 920 OK)
  //   "@potata"              7\uc790 \u00d7 0.62 \u00d7 28 = 122px + \uc54c\uc57d padX 28\u00d72 \u2192 \uc54c\uc57d \ud3ed \uc57d 178px
  //   "FOLLOW THE BUILD"    16\uc790 \u00d7 0.62 \u00d7 28 = 278px + tracking 500 \u2192 14px \u00d7 15 = 210 \u2192 \uc57d 488px (< 920 OK)

  // \ub4a4 \u2192 \uc55e \uc21c\uc11c\ub85c \uc0dd\uc131(\u00a70.11): \ubcf4\uc870 \ud14d\uc2a4\ud2b8 \u2192 \uc8fc\uc778\uacf5(POTATA) \u2192 \uc2a4\ud2f0\ucee4(\uc54c\uc57d) \u2192 \ud50c\ub798\uc2dc. \ubc30\uacbd\uc740 \uc804\uc5ed BG(\uac80\uc815).

  // 39.80 \ud0dc\uadf8\ub77c\uc778 \u2014 lime en 34 tracking 500 at (540, 1040), \ud0c0\uc790\uae30 0.25s
  var tag = text("K-FASHION, RECODED.", { font: "en", size: 34, color: COL.lime, tracking: 500, pos: [540, 1080], t0: tTag, t1: t1, name: "S16 tagline" });   // r02 \uac80\uc218: \ub85c\uace0 \uae00\ub85c\uc6b0 \uc548\uc5d0 \ubb3b\ud600 40 \ub0b4\ub9bc
  typeOn(tag, tTag, 0.25);

  // 39.95 \ubcf4\uc870 \ub77c\uc778 \u2014 white enMid 30 tracking 600 at (540, 1110), 4\ud504\ub808\uc784 \ud398\uc774\ub4dc\uc778
  var sub = text("SEOUL TO DUBAI", { font: "enMid", size: 34, color: COL.white, tracking: 600, pos: [540, 1150], t0: tSub, t1: t1, name: "S16 seoul to dubai" });
  fadeIn(sub, tSub);

  // 40.20 "FOLLOW THE BUILD" \u2014 lime enMid 28 tracking 500 at (540, 1590), 4\ud504\ub808\uc784 \ud398\uc774\ub4dc\uc778
  var follow = text("FOLLOW THE BUILD", { font: "enMid", size: 34, color: COL.lime, tracking: 500, pos: [540, 1380], t0: tFollow, t1: t1, name: "S16 follow the build" });   // r02 \uac80\uc218: \uc544\ub798\uac00 \ube44\uc5b4 \ubcf4\uc5ec CTA \ubb36\uc74c\uc744 \uc704\ub85c
  fadeIn(follow, tFollow);

  // 39.66 \uc8fc\uc778\uacf5 "POTATA" \u2014 white en 240 tracking -40 at (540, 900). glow \ub97c \uba3c\uc800 \uc5b9\uace0 impactIn(118\u2192100) \ucc29\uc9c0
  var logo = text("POTATA", { font: "en", size: 240, color: COL.white, tracking: -40, pos: [540, 900], t0: t0, t1: t1, name: "S16 POTATA" });
  pulse(logo, BEATS[BEATS.length - 1], { amount: 1.03 });   // r02 \uac80\uc218: \ub9c8\uc9c0\ub9c9 \ube44\ud2b8(40.31)\uc5d0 \ub85c\uace0\uac00 \uc0b4\uc9dd \ubc18\uc751\ud574 \uc815\uc9c0 \ud654\uba74\uc774 \uc8fd\uc9c0 \uc54a\uac8c
  glow(logo, { radius: 80, intensity: 0.5, threshold: 70 });
  impactIn(logo, t0, { from: 118 });

  // 40.10 "@potata" \uc54c\uc57d \u2014 \ud770 \ud14c\ub450\ub9ac 2 \u00b7 \ucc44\uc6c0 \uc5c6\uc74c(color \uc5c6\uc774 stroke \ub9cc \uc8fc\uba74 pill \uc774 noFill \ub85c \ub9cc\ub4e0\ub2e4) \u00b7 size 28 at (540, 1500), \ud0c4\uc131 \ud31d
  var handle = pill("@potata", { stroke: { color: COL.white, width: 2 }, noFill: true, size: 34, h: 64, pos: [540, 1290], t0: tPill, t1: t1, name: "S16 handle" });
  popIn(handle, tPill);

  // 39.66 \uce74\uba54\ub77c \ud754\ub4e4\ub9bc 1.0 (CTRL Shake \uc2ac\ub77c\uc774\ub354)
  shake(t0, { amount: 1.0 });

  // \ub9e8 \uc55e: \ud770 \ud50c\ub798\uc2dc peak 70 \u00b7 0.10s (\uc804\uccb4 \ud654\uba74 \uc194\ub9ac\ub4dc, parent \uc5c6\uc74c \u2192 \ud754\ub4e4\ub9bc \uc601\ud5a5 \uc5c6\uc74c). 39.66\u201339.76
  var fl = flash(COL.white, t0, { peak: 70, dur: 0.10 });
  fl.name = "S16 flash";

  // 40.88 \uae4c\uc9c0 \uc815\uc9c0 \u2014 \ubaa8\ub4e0 \ub808\uc774\uc5b4 t1 = T.end, \ud1f4\uc7a5 \ubaa8\uc158 \uc5c6\uc74c(\ud558\ub4dc\ucef7\u00b7\uc601\uc0c1 \ub05d)
});

// ===== 99-run.jsx =====
// ===== \uc2e4\ud589 \uc9c4\uc785\uc810 (\ud56d\uc0c1 \ub9c8\uc9c0\ub9c9 \ud30c\uc77c) =====
try { runAll(); }
catch (eTop) { log("FATAL: " + eTop.toString() + " (line " + eTop.line + ")"); writeLog(); }
