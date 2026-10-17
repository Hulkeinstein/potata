// S10 logo-reveal — 밤티 말고 POTATA! 후렴 1·2 + 응답 챈트 (18.46–24.72)
// SPEC "### S10" 절을 레이어·키프레임 단위로 구현. 헬퍼는 00-core.jsx 가 SSoT.
scene("S10", T.hook1, T.seoulTo, function (ctx) {
  var t0 = T.hook1, t1 = T.seoulTo;
  var LOGO_Y = 1010, LOGO_SIZE = 220, LOGO_GAP = -6, ENTER_DUR = 0.22;   // r02 검수: 다른 장면 로고(tracking -40)와 자간을 맞추기 위해 간격을 음수로
  var chars = ["P", "O", "T", "A", "T", "A"];
  var resp1 = [T.resp1a, T.resp1b, T.resp1c], resp2 = [T.resp2a, T.resp2b, T.resp2c];
  var letters = [], widths = [], posX = [], total = 0, cursor, tE, pairT, i, k, L, bL, bR;

  // 텍스트 폭 어림 (SPEC §0.10):
  //  - "밤티" / "말고": 2 × 0.95 × 150 = 285px  → OK
  //  - 로고 "P O T A T A": Outfit-ExtraBold 실측 잉크 폭 P .555 / O .758 / T .613 / A .720 em (O·A 가 §0.10 어림 0.62 보다 넓다).
  //    SPEC "### S10" 명시값 260 이면 1074.5px(x 2.7~1077.3) 로 §0.9 안전영역(x 80~1000)·§0.10(920 이하)을 모두 벗어나므로
  //    리뷰 결정에 따라 220 으로 낮춤 → 915.4px, x 82.3~997.7 (221 이 한계, 222 부터 초과). 배치는 런타임 bbox 로 다시 잰다.
  //    NOTE: SPEC "### S10" 의 'size 260' 은 owner 가 220 으로 동기화해야 한다(SPEC 수정은 이 파일 범위 밖).
  //  - "K-FASHION, RECODED.": 19 × 0.62 × 34 ≈ 400 + tracking 500 → 18 × 0.5 × 34 = 306 → ≈ 706px → OK

  // 복제 글자(lime/purple): 원본과 같은 위치·크기, 기본 opacity 0 → hold 키로만 켠다
  function makeClones(color, label) {
    var arr = [], C, q;
    for (q = 0; q < chars.length; q++) {
      C = text(chars[q], { font: "en", size: LOGO_SIZE, tracking: 0, color: color, pos: [posX[q], LOGO_Y], t0: T.hook1Potata, t1: t1, name: "S10 logo " + label + " " + (q + 1) + " " + chars[q] });
      C.opacity.setValue(0);
      // r02 검수: 복제본에 glow 를 얹으면 lime/purple 이 흰색으로 표백돼 색 전환이 안 읽힌다 → 복제본은 glow 없이(아래 원본의 흰 할로가 남아 발광감은 유지)
      arr.push(C);
    }
    return arr;
  }

  // ---------- 뒤: purple 글로우 원 (19.20 부터, 비트 따라 8~40%) ----------
  var bg = ellipse({ w: 1500, h: 1500, color: COL.purple, pos: [540, 1000], t0: T.hook1Potata, t1: t1, name: "S10 bg glow" });
  bg.opacity.setValue(0);
  beatOpacity(bg, 5, 24);  // r02 검수: 8~40 은 보라 원이 로고보다 튀어 낮춤

  // ---------- r06: 응답 챈트 "PO-TA-TA" 비트마다 전면 모델 사진 하드컷 (로고·밤티 말고 뒤, 다음 비트 또는 0.26s 까지) ----------
  var flashSets = [[resp1, ["feed-1", "style-4", "feed-4"], T.hook2], [resp2, ["style-2", "tryon", "share"], t1]];
  var fs, fq, fEnd;
  for (fs = 0; fs < flashSets.length; fs++) {
    for (fq = 0; fq < 3; fq++) {
      fEnd = (fq < 2) ? flashSets[fs][0][fq + 1] : Math.min(flashSets[fs][0][fq] + 0.26, flashSets[fs][2]);
      photoFlash(ctx.photos[flashSets[fs][1][fq]], flashSets[fs][0][fq], fEnd - flashSets[fs][0][fq], { name: "S10 flash photo " + flashSets[fs][1][fq] });
    }
  }

  // ---------- 18.46 "밤티" impactIn + rgbSplit, 18.60 purple 취소선 ----------
  var bamti = text("밤티", { size: 150, color: COL.white, pos: [380, 760], t0: T.hook1, t1: t1, name: "S10 밤티" });
  impactIn(bamti, T.hook1);
  rgbSplit(bamti, T.hook1, { frames: 2 });
  var st = strike(bamti, T.hook1 + 0.14, { color: COL.purple, thick: 18 });
  st.name = "S10 strike 밤티";

  // ---------- 18.82 "말고" impactIn ----------
  var malgo = text("말고", { size: 150, color: COL.white, pos: [700, 760], t0: T.hook1b, t1: t1, name: "S10 말고" });
  impactIn(malgo, T.hook1b);

  // ---------- 이중 표기: 밤티 첫 등장이라 뜻 풀이까지("BAM-TI = MID"), 말고 = "NAH" ----------
  // 폭 어림: "BAM-TI = MID" 12자 × 0.62 × 34 ≈ 253 + tracking 250(8.5px × 11) ≈ 346px → x 207~553 / "NAH" ≈ 80px → x 660~740. 로고 윗단(≈ 930) 위.
  gloss("BAM-TI = MID", { pos: [380, 868], size: 34, t0: T.hook1, t1: t1, name: "S10 gloss 밤티" });
  gloss("NAH", { pos: [700, 868], size: 34, t0: T.hook1b, t1: t1, name: "S10 gloss 말고" });

  // ---------- 19.20 로고 결합: 6글자를 (540,1010) 에 만들고 bbox 폭으로 가운데 정렬 ----------
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
  // AE 1차 실행 검증용(등장 키를 넣기 전에 재야 최종 위치다): 기대 P left ≈ 82, A right ≈ 998 — §0.9 x 80~1000 안이어야 한다
  bL = bbox(letters[0], T.hook1Potata); bR = bbox(letters[5], T.hook1Potata);
  log("S10 logo bbox: P left=" + Math.round(bL.left) + " A right=" + Math.round(bR.left + bR.width) + " total=" + Math.round(total) + "px (expect ~82 / ~998 / ~915)");
  // 등장: P left / O impactIn(190) / T down / A up / T down / A up — 19.20 부터 2프레임씩 지연, dur 0.22. 각 글자 glow.
  for (i = 0; i < letters.length; i++) {
    tE = T.hook1Potata + f(2 * i);
    if (i === 0) { slideIn(letters[i], tE, "left", { dist: 500, dur: ENTER_DUR }); }
    else if (i === 1) { impactIn(letters[i], tE, { from: 190, dur: ENTER_DUR }); }
    else if (i === 2 || i === 4) { slideIn(letters[i], tE, "down", { dist: 400, dur: ENTER_DUR }); }
    else { slideIn(letters[i], tE, "up", { dist: 400, dur: ENTER_DUR }); }
    glow(letters[i], { radius: 70, intensity: 0.9 });
  }

  // ---------- 19.60 태그라인 typeOn ----------
  // r02 검수: 19.50 shake(1.4) 감쇠와 겹치면 작은 글자가 뭉개져 19.75 로 늦춤
  var tag = text("K-FASHION, RECODED.", { font: "en", size: 34, tracking: 500, color: COL.lime, pos: [540, 1200], t0: T.hook1Potata + 0.55, t1: t1, name: "S10 tagline" });
  typeOn(tag, T.hook1Potata + 0.55, 0.4);

  // ---------- 복제 글자 (원본 위에 쌓이도록 원본 다음에 생성) ----------
  var limeC = makeClones(COL.lime, "lime");
  var purpleC = makeClones(COL.purple, "purple");

  // ---------- 응답 1 (20.60/20.81/21.02): PO / TA / TA 쌍 pulse(1.12) + lime 복제 2프레임 ----------
  // lime 복제는 22.58→23.00 (hook2Potata) 에도 100 으로 켜진다(로고 전체 lime). 복제도 같이 pulse 해 크기를 맞춘다.
  for (k = 0; k < chars.length; k++) {
    pairT = resp1[Math.floor(k / 2)];
    pulse(letters[k], pairT, { amount: 1.12 });
    pulse(limeC[k], pairT, { amount: 1.12 });
    setKeys(limeC[k].opacity, [[T.hook1Potata, 0], [pairT, 100], [pairT + f(4), 0], [T.hook2Potata, 100], [T.hook2Potata + 0.42, 0]], "hold");
  }

  // ---------- 21.38 hook2: 밤티·말고 pulse(1.08) + 밤티 rgbSplit / 22.26 말고 pulse(1.08) ----------
  pulse(bamti, T.hook2, { amount: 1.08 });
  pulse(malgo, T.hook2, { amount: 1.08 });
  rgbSplit(bamti, T.hook2, { frames: 2 });
  pulse(malgo, T.hook2b, { amount: 1.08 });

  // ---------- 응답 2 (23.80/24.05/24.45): 같은 쌍 pulse(1.12) + purple 복제 2프레임 ----------
  for (k = 0; k < chars.length; k++) {
    pairT = resp2[Math.floor(k / 2)];
    pulse(letters[k], pairT, { amount: 1.12 });
    pulse(purpleC[k], pairT, { amount: 1.12 });
    setKeys(purpleC[k].opacity, [[T.hook1Potata, 0], [pairT, 100], [pairT + f(4), 0]], "hold");
  }

  // ---------- 19.50 purple flash(peak 55, 0.12) + shake(1.4) — 맨 위에 쌓이도록 마지막 생성 ----------
  var fl = flash(COL.purple, T.hook1Potata + 0.30, { peak: 55, dur: 0.12 });
  fl.name = "S10 flash";
  shake(T.hook1Potata + 0.30, { amount: 1.4 });

  // 24.72 하드컷: 모든 레이어 t1 = T.seoulTo
});
