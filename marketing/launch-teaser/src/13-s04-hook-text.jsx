// S04 hook-text — "K-fashion? Too far? Not anymore" (7.00–10.30)
scene("S04", T.kfashion, T.scroll, function (ctx) {
  var t0 = T.kfashion, t1 = T.scroll;
  var P = [540, 940];                 // SPEC: 세 문구 모두 같은 중심
  var outDur = 0.15;                  // "K-FASHION?" slideOut 길이
  var tGlitch2 = T.scroll - 0.20;     // 10.10 — SPEC 명시 시각(T 키 없음 → 장면 끝 기준 역산)

  // 폭 어림(§0.10 · Outfit ExtraBold 1글자 ≈ 0.62×size) — 한 줄 ≤ 920px 이 되도록 size 조정.
  // SPEC 수치 그대로면 실측(Outfit-ExtraBold.ttf advance)으로도 캔버스 1080 을 넘는다.
  //  "K-FASHION?" 10자 tracking -30 : SPEC 190 → 어림 1178px / 실측 1131px (초과) → 148 → 어림 918px / 실측 881px (어림은 tracking 미반영)
  //  "TOO FAR."    8자              : SPEC 230 → 어림 1141px / 실측 1097px (초과) → 185 → 어림 918px / 실측 882px
  //  "ANYMORE."    8자(긴 줄)       : SPEC 210 → 어림 1042px / 실측 1146px (초과) → 165 → 어림 818px / 실측 900px
  //  leading 은 SPEC 비율(200/210) 유지 → 157

  // ---- 1) "K-FASHION?" 7.00 등장 → 8.28 위로 슬라이드 아웃 (주인공) ----
  var kf = text("K-FASHION?", { font: "en", size: 148, vscale: 115, tracking: -30, color: COL.white, pos: P, t0: t0, t1: T.tooFar + outDur, name: "S04 K-FASHION?" });
  impactIn(kf, t0);
  slideOut(kf, T.tooFar, "up", { dist: 500, dur: outDur });
  rgbSplit(kf, t0, { frames: 3, offset: 20 });
  shake(t0, { amount: 1.0 });

  // ---- 2) "TOO FAR." 8.28 등장 → 8.66 취소선 → 9.00 하드컷 ----
  var tf = text("TOO FAR.", { font: "en", size: 185, color: COL.white, pos: P, t0: T.tooFar, t1: T.notAnymore, name: "S04 TOO FAR." });
  impactIn(tf, T.tooFar);
  var st = strike(tf, T.strike, { color: COL.purple, thick: 22, dur: 0.14 });   // t1 = tf.outPoint(9.00)
  st.name = "S04 strike";
  // shake 는 공유 CTRL Shake 슬라이더에 (t-1f, 0)·(t, amt)·(t+dur, 0) 세 키를 찍는다(기본 dur 0.35).
  // 기본값이면 꼬리 키(9.01:0)가 9.00 shake(1.2) 바로 뒤에 남아 그 흔들림이 1프레임 만에 꺼지므로,
  // 꼬리가 다음 shake 의 선행 키(9.00-1f=8.967)보다 1프레임 앞(8.933)에서 끝나도록 dur 를 T 기준으로 준다.
  shake(T.strike, { amount: 0.5, dur: T.notAnymore - T.strike - f(2) });   // = 0.273

  // ---- 3) "NOT ANYMORE." 9.00–10.30 : lime 솔리드(parent 없음) 위 검정 두 줄 ----
  solid(COL.lime, T.notAnymore, t1, "S04 lime bg");
  var na = text("NOT\rANYMORE.", { font: "en", size: 165, leading: 157, color: COL.black, pos: P, t0: T.notAnymore, t1: t1, name: "S04 NOT ANYMORE." });
  impactIn(na, T.notAnymore, { from: 120 });
  pulse(na, BEATS[22], { amount: 1.05 });   // 9.451
  pulse(na, BEATS[23], { amount: 1.05 });   // 9.892
  // rgbSplit 은 복제본이 scale 키를 그대로 물려받도록 pulse 뒤에 건다
  rgbSplit(na, T.notAnymore, { frames: 2 });
  rgbSplit(na, tGlitch2, { frames: 2, offset: 16 });
  shake(T.notAnymore, { amount: 1.2 });
  // 10.30 하드컷 (t1)
});
