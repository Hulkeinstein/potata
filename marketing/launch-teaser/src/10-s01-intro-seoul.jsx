// S01 intro-seoul — "Seoul! (Now loading)" (0.00–2.20)
// 예외: 로딩 UI(라벨·트랙·채움·퍼센트)만 4.42 까지 산다(SPEC §3 S01 예외 4.40 + slideOut 완결, §0.4 끝 +0.30 안). 나머지는 2.20 에서 끊는다.
scene("S01", T.seoul, T.uaeU, function (ctx) {
  var t0 = T.seoul, t1 = T.uaeU;
  // SPEC 의 4.30(퇴장 시작)은 T 에 키가 없어 T.loadingDone(4.28) 기준 오프셋으로 쓴다
  var tUiOut = T.loadingDone + 0.02;   // 4.30
  // SPEC 의 "4.40 까지" 와 "4.30 부터 slideOut dur 0.12"(=4.42) 는 서로 모순 — §0.12(명시된 퇴장 모션은 수행) 에 따라 모션이 끝까지 보이는 4.42 를 택한다
  var tUiEnd = tUiOut + 0.12;          // 4.42 (SPEC 4.40 보다 0.02 늦음, §0.4 끝 +0.30 안)
  var seoulOutDur = 0.18;              // 2.20 slideOut 길이 → SEOUL 레이어는 2.38 까지(허용 오차 +0.30 안)

  // 2프레임 마이크로 모션(번쩍·심장박동)은 키를 프레임 격자에 맞춰야 렌더 프레임이 40% 에 정확히 닿는다
  // (4.28 = 128.4f, BEATS[4] 1.741 = 52.23f 처럼 비정렬 시각에 찍으면 딥이 두 프레임에 걸쳐 얕아진다)
  function snap(t) { return Math.round(t * FPS) / FPS; }

  // 심장박동: opacity 100→40→100, 각 2프레임, linear(hold 아님)
  function heartbeat(L, t) {
    t = snap(t);
    setKeys(L.opacity, [[t, 100], [t + f(1), 40], [t + f(2), 100]], "linear");
  }

  // ---------- 뒤: 로딩 UI (보조) ----------
  // 트랙 640×8 gray2, 좌측 앵커 (220, 1200)
  var track = rect({ w: 640, h: 8, color: COL.gray2, anchor: "left", pos: [220, 1200], t0: T.loading1, t1: tUiEnd, name: "S01 loading track" });

  // 채움 640×8 lime, 트랙과 같은 위치. 좌측 앵커라 scale X 가 왼→오로 찬다
  var fill = rect({ w: 640, h: 8, color: COL.lime, anchor: "left", pos: [220, 1200], t0: T.loading1, t1: tUiEnd, name: "S01 loading fill" });
  // r02 검수: 퍼센트 숫자(linear expression)와 진행률이 어긋나지 않도록 채움도 linear
  setKeys(fill.scale, [[T.loading1, [0, 100]], [T.uaeU, [50, 100]]], "linear");          // 0.62→2.20: 0→50
  setKeys(fill.scale, [[T.loading2, [50, 100]], [T.loadingDone, [100, 100]]], "linear");  // 3.62→4.28: 50→100 (2.20~3.62 는 50 유지)
  // 4.28 번쩍 — SPEC 지정 방식 그대로 opacity 100→40→100 (2프레임). 128f(4.2667) 로 스냅해 딥이 f129(4.30) 에서 정확히 40%
  var tFl = snap(T.loadingDone);
  setKeys(fill.opacity, [[tFl, 100], [tFl + f(1), 40], [tFl + f(2), 100]], "linear");

  // "NOW LOADING" lime en 40 tracking 500 — 폭 어림: 11×0.62×40 ≈ 273 + 자간 (500/1000×40)×10 = 200 → ≈ 473px ≤ 920
  var label = text("NOW LOADING", { font: "en", size: 40, tracking: 500, color: COL.lime, pos: [540, 1120], t0: T.loading1, t1: tUiEnd, name: "S01 loading label" });
  typeOn(label, T.loading1, 0.3);

  // 퍼센트 — "100%" 폭 어림: 4×0.62×32 ≈ 79px. SPEC 은 pos 만 줬으므로 좌측 앵커로 900→979 로 오른쪽으로만 자라게 해
  // 채움바 우측 끝(860)과 간격 40px 을 고정한다(중앙 앵커면 "100%" 때 좌측 끝 ≈860 으로 바에 맞닿고 자릿수마다 떨린다).
  // counter 기본 expression 을 두 구간(0→50 / 50→100)으로 덮어쓴다
  var pct = counter(0, 100, T.loading1, T.loadingDone, { font: "en", size: 32, color: COL.lime, pos: [900, 1200], anchor: "left", justify: "left", t1: tUiEnd, name: "S01 loading pct" });
  pct.property("ADBE Text Properties").property("ADBE Text Document").expression =
    "Math.round(time <= " + T.uaeU + " ? linear(time, " + T.loading1 + ", " + T.uaeU + ", 0, 50) : linear(time, " + T.loading2 + ", " + T.loadingDone + ", 50, 100)) + \"%\"";

  // 4.30 부터 로딩 UI 전체가 아래로 퇴장 (dur 0.12 → 4.42 에서 컷 = tUiEnd)
  slideOut(track, tUiOut, "down", { dist: 300, dur: 0.12 });
  slideOut(fill, tUiOut, "down", { dist: 300, dur: 0.12 });
  slideOut(label, tUiOut, "down", { dist: 300, dur: 0.12 });
  slideOut(pct, tUiOut, "down", { dist: 300, dur: 0.12 });

  // ---------- 앞: 주인공 "SEOUL" ----------
  // 폭 어림: 5×0.62×300 = 930 − 자간 (40/1000×300)×4 = 48 → ≈ 882px ≤ 920
  var seoul = text("SEOUL", { font: "en", size: 300, vscale: 110, tracking: -40, color: COL.white, pos: [540, 900], t0: t0, t1: t1 + seoulOutDur, name: "S01 SEOUL" });
  impactIn(seoul, t0);
  rgbSplit(seoul, t0, { frames: 2, offset: 18 });   // 복제본이 impactIn 키를 물려받도록 impactIn 뒤에 호출
  // core shake() 는 t−1f 에 0 키를 찍는다. t0 = 0 이면 음수 시각(−0.033) 키가 되는데 AE 가 받아주는지 미검증(스모크는 shake(0.1)만)이라
  // 1프레임 늦춰 키를 0/0.033/0.383 에 둔다. f0 은 impactIn 때문에 SEOUL opacity 0 이라 체감 차이 없음
  shake(t0 + f(1), { amount: 0.6 });
  heartbeat(seoul, BEATS[3]);   // 1.300 비트 (= 39f, 스냅해도 동일)
  heartbeat(seoul, BEATS[4]);   // 1.741 비트 → 52f(1.733) 스냅: 딥이 f53 에서 정확히 40%
  slideOut(seoul, t1, "up", { dist: 600, dur: seoulOutDur });   // 2.20 → 2.38 컷
});
