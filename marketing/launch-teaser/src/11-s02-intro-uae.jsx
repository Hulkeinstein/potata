// S02 intro-uae — "UAE! (Now loading)" (2.20–4.28)
// U·A·E 가 순서대로 착지(주인공 교대) → lime 밑줄 → 3.62 에 전체가 72% 로 줄며 y 760 으로 상승 → 4.28 위로 슬라이드아웃.
// 텍스트 폭 어림(§0.10): en 대문자 1글자 ≈ 0.62 × 420 = 260px ≤ 920px.
scene("S02", T.uaeU, T.loadingDone, function (ctx) {
  var slideDur = 0.16;                        // 4.28 퇴장 슬라이드 길이(SPEC). 레이어는 이만큼만 장면 끝을 넘어 산다(허용 +0.30 안)
  var tEnd = T.loadingDone + slideDur;        // 4.44 — slideOut 이 끝까지 보이려면 t1 이 여기까지 와야 한다
  var shrink = 0.72;                          // 3.62 축소 비율(scaleTo 100→72)
  var shrinkDur = 0.25;
  var baseY = 900, upY = 760;                 // 글자 중심 y: 등장 900 → 상승 후 760
  var gx = CX;                                // 축소 기준 x(세 글자의 가운데 = 540)

  // 3.62 상승: 글자 중심이 y 760 이 되도록 올린다. group 으로 묶지 말라는 SPEC 에 따라 레이어마다 따로 걸되,
  // 하나로 묶어 줄인 것처럼 보이도록 x 와 밑줄의 세로 간격도 같은 비율(0.72)로 540·900 기준으로 모은다.
  function liftTo(L, x, y) {
    var nx = gx + (x - gx) * shrink;
    var ny = upY + (y - baseY) * shrink;
    scaleTo(L, T.loading2, T.loading2 + shrinkDur, 100, 100 * shrink, "inout");
    moveTo(L, T.loading2, T.loading2 + shrinkDur, [nx, ny], "inout");
  }

  // 글자 1개: impactIn(from 130) + rgbSplit(2f, 20) + shake(0.8).
  // impactIn 을 먼저 걸어야 rgbSplit 의 복제본(duplicate)이 착지 키프레임을 물려받아 글자와 함께 떨어진다.
  function letter(ch, x, t) {
    var L = text(ch, { font: "en", size: 420, color: COL.white, pos: [x, baseY], t0: t, t1: tEnd, name: "S02 " + ch });
    impactIn(L, t, { from: 130 });
    rgbSplit(L, t, { frames: 2, offset: 20 });
    shake(t, { amount: 0.8 });
    return L;
  }

  // 뒤 → 앞: 밑줄(보조) → U → A → E (주인공은 시각 순서대로 교대)
  // r02 검수: y 1110 은 S01 "NOW LOADING" 라벨(y 1120)을 관통해 취소선처럼 보여 글자 바로 아래(1072)로 올림
  var ulY = 1072;
  var ul = rect({ w: 560, h: 14, color: COL.lime, pos: [260, ulY], anchor: "left", t0: T.uaeE, t1: tEnd, name: "S02 underline" });
  setKeys(ul.scale, [[T.uaeE, [0, 100]], [T.uaeE + 0.26, [100, 100]]], "out");   // 3.14→3.40 왼→오로 긋기(anchor left 기준)

  var U = letter("U", 300, T.uaeU);
  var A = letter("A", 540, T.uaeA);
  var E = letter("E", 780, T.uaeE);

  // 3.62 (Now loading 2): 세 글자·밑줄 각각 72% 로 줄며 위로(0.25s inout). 로딩바 100% 채움은 S01 담당.
  liftTo(U, 300, baseY);
  liftTo(A, 540, baseY);
  liftTo(E, 780, baseY);
  liftTo(ul, 260, ulY);

  // 4.28: 세 글자·밑줄 전부 위로 슬라이드아웃(dist 700, dur 0.16) → cutAt 4.44
  var outs = [U, A, E, ul], i;
  for (i = 0; i < outs.length; i++) { slideOut(outs[i], T.loadingDone, "up", { dist: 700, dur: slideDur }); }
});
