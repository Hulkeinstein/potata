// S15 outro-chant — "Po-ta-ta! (빠밤!)" S03 의 콜백, 더 크게 (33.58–39.66)
scene("S15", T.buildEnd, T.finalHit, function (ctx) {
  var tPo = T.oPo;          // 33.88 "PO"
  var tTa1 = T.oTa1;        // 34.53 "TA" white
  var tTa2 = T.oTa2;        // 35.60 "TA" purple
  var tBba = T.bbam1;       // 37.31 "빠" — 세 단어는 여기서 끊는다
  var tBam = T.bbam2;       // 37.94 "밤!"
  var t1 = T.finalHit;      // 39.66 하드컷
  var bChant = [BEATS[84], BEATS[85], BEATS[86]];   // 36.037 / 36.455 / 36.897 — 세 단어 pulse
  var bBam = [BEATS[90], BEATS[91], BEATS[92]];     // 38.615 / 39.033 / 39.474 — "밤!" pulse + 1f 글리치
  var i;

  // r06: 세 단어 pulse 비트(36.04/36.46/36.90)마다 전면 모델 사진 하드컷 — 글자보다 먼저 만들어 뒤에 깐다. 마지막은 "빠"(37.31) 직전까지.
  var chantPhotos = ["feed-3", "style-3", "style-1"];
  for (i = 0; i < bChant.length; i++) {
    var fEnd = (i < bChant.length - 1) ? bChant[i + 1] : Math.min(bChant[i] + 0.4, tBba);
    photoFlash(ctx.photos[chantPhotos[i]], bChant[i], fEnd - bChant[i], { dim: 55, name: "S15 flash photo " + chantPhotos[i] });
  }

  // 33.58–33.88 은 검정(전역 BG) — S14 의 페이드아웃(33.80 까지)이 끝나는 숨 고르기. 레이어 없음.
  // 뒤 → 앞 순서로 생성. 배경 솔리드는 parent 없음(흔들림 영향 없음), 텍스트는 카메라 널에 붙는다.

  // ---------- 33.88 / 34.53 / 35.60 : PO · TA · TA (S03 콜백, size 360 → 380) ----------
  // 폭 어림(§0.10): 대문자 2자 × 0.62 × 380 = 471px < 920 (세 단어 모두 같은 폭)
  // impactIn 을 rgbSplit 보다 먼저 — 복제본 _R/_C 가 같은 스케일 키를 물려받는다 (S13 과 같은 순서)
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

  // 36.037 / 36.455 / 36.897 비트 — 세 단어 함께 pulse(1.05). 각 pulse(0.22s)는 다음 비트(0.418s 간격) 전에 끝난다.
  for (i = 0; i < bChant.length; i++) {
    pulse(po, bChant[i], { amount: 1.05 });
    pulse(ta1, bChant[i], { amount: 1.05 });
    pulse(ta2, bChant[i], { amount: 1.05 });
  }

  // ---------- 37.31–37.94 : purple 배경 + "빠" white ----------
  // 폭 어림: 한글 1자 × 0.95 × 360 = 342px < 920
  solid(COL.purple, tBba, tBam, "S15 bg purple");
  var bba = text("빠", { font: "ko", size: 360, color: COL.white, pos: [540, 960], t0: tBba, t1: tBam, name: "S15 bba" });
  impactIn(bba, tBba, { from: 130 });
  shake(tBba, { amount: 1.5 });
  gloss("BA-", { pos: [540, 1185], size: 60, color: COL.white, t0: tBba, t1: tBam, name: "S15 gloss 빠" });

  // ---------- 37.94–39.66 : lime 배경 + "밤!" black ----------
  // 폭 어림: 2자 × 0.95 × 360 = 684px < 920 ("!" 는 더 좁아 실제로는 그 이하)
  // 위치는 SPEC 에 명시가 없어 "빠" 자리 (540, 960) 를 그대로 이어받는다(단어 교체 — S12 밤티→말고 와 같은 방식)
  solid(COL.lime, tBam, t1, "S15 bg lime");
  var bam = text("밤!", { font: "ko", size: 360, color: COL.black, pos: [540, 960], t0: tBam, t1: t1, name: "S15 bam!" });
  impactIn(bam, tBam, { from: 130 });
  // pulse 키를 먼저 두고 rgbSplit 을 나중에 — 비트 시각의 1f 복제본이 원본과 같은 스케일 키를 가진다
  for (i = 0; i < bBam.length; i++) {
    pulse(bam, bBam[i], { amount: 1.06 });   // 마지막(39.474+0.22=39.694)은 t1 39.66 에서 컷 — 키가 outPoint 뒤에 남아도 무해
  }
  rgbSplit(bam, tBam, { frames: 3, offset: 24 });
  // r02 검수: 비트(38.615/39.033/39.474)마다 글리치까지 얹으면 한 장면 3회 제한(§0.7 ④)을 넘어 pulse 만 남긴다
  shake(tBam, { amount: 1.5 });
  gloss("BAM!", { pos: [540, 1185], size: 60, color: COL.black, t0: tBam, t1: t1, name: "S15 gloss 밤!" });
  // 39.66 하드컷 — 모든 레이어 t1 = T.finalHit 로 끊는다(퇴장 모션 없음)
});
