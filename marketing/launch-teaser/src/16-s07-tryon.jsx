// S07 tryon — Try it on, 톡! (14.44–15.42)
scene("S07", T.tryItOn, T.styleIt, function (ctx) {
  var t0 = T.tryItOn, t1 = T.styleIt;
  // 15.42 slideOut(dur 0.12) 이 보이려면 레이어가 그만큼 더 살아야 한다(§0.4 허용 오차 끝 +0.30 안). slideOut 의 cutAt 은 줄이기만 한다.
  var tOut = t1 + 0.12;
  var tTitle = t0 + 0.02;                      // 14.46 "TRY IT ON"
  var tScan0 = t0 + 0.06, tScan1 = T.tok + 0.02; // 14.50 → 15.20 scanline
  var tUpload = t0 + 0.06, tMatch = t0 + 0.31, tTry = t0 + 0.56; // 14.50 / 14.75 / 15.00
  var IN = { dist: 800, dur: 0.14 };           // 오른쪽에서 들어옴 (S06 이 왼쪽으로 나가는 휩과 맞물림)
  var OUT = { dist: 800, dur: 0.12 };          // 15.42 전부 왼쪽으로 나감
  var i;

  // 1) 카드 묶음 (맨 뒤): 바디 → 실루엣 머리 → 실루엣 몸 → 상단 라벨.
  //    넷이 한 덩어리로 보이도록 같은 slideIn/slideOut 을 각각 건다(널로 묶으면 널 opacity 가 자식에 안 먹어 fade 가 빠진다).
  var cardL = rect({ w: 640, h: 900, r: 40, color: COL.gray, pos: [540, 930],   // r06: 릴스 하단 UI 회피로 480~1380 으로 줄임
    t0: t0, t1: tOut, name: "S07 card" });
  // 이중 표기판: 회색 실루엣 대신 AI 모델 전신 사진(라벨 y 560 아래 ~ 카드 아래 끝 1500 안, 600×880). 사진이 없으면 실루엣.
  var modelL;
  if (ctx.photos.tryon) {
    modelL = [photoBox(ctx.photos.tryon, { w: 600, h: 780, r: 28, pos: [540, 960], focusY: 0.45, t0: t0, t1: tOut, name: "S07 model photo" })];
  } else {
    modelL = [ellipse({ w: 130, h: 130, color: COL.gray2, pos: [540, 700], t0: t0, t1: tOut, name: "S07 silhouette head" }),
      rect({ w: 300, h: 430, r: 70, color: COL.gray2, pos: [540, 1010], t0: t0, t1: tOut, name: "S07 silhouette body" })];
  }
  // 폭 어림: "AI STUDIO" 9자 × 0.62 × 30 ≈ 167px + tracking 400(=12px × 8칸 = 96px) ≈ 263px < 920 OK
  var labelL = text("AI STUDIO", { font: "en", size: 30, color: COL.lime, tracking: 400, pos: [540, 525], t0: t0, t1: tOut, name: "S07 label AI STUDIO" });
  var cardSet = [cardL].concat(modelL, [labelL]);
  for (i = 0; i < cardSet.length; i++) { slideIn(cardSet[i], t0, "right", IN); }

  // 2) 주인공 "TRY IT ON" (14.46): impactIn + rgbSplit 2f
  // 폭 어림: 9자(공백 2 포함) × 0.62 × 150 ≈ 837px < 920 OK
  var title = text("TRY IT ON", { font: "en", size: 150, color: COL.white, pos: [540, 380], t0: tTitle, t1: tOut, name: "S07 TRY IT ON" });
  impactIn(title, tTitle);
  rgbSplit(title, tTitle, { frames: 2 });

  // 3) 스캔라인 14.50 → 15.20 (카드 안 y 520 → 1480). 15.42 이전에 끝나므로 slideOut 대상 아님.
  var scan = scanline(tScan0, tScan1, { x: 540, w: 600, yFrom: 570, yTo: 1350 });
  scan.name = "S07 scanline";

  // 4) 상태어: 오른쪽 세로 배치 (x 930 오른쪽 정렬), enMid 28 tracking 300 lime, 각 typeOn 0.1
  // 폭 어림: "UPLOAD" 6자 × 0.62 × 28 ≈ 104px + tracking 300(=8.4px × 5칸 = 42px) ≈ 146px < 920 OK (MATCH ≈ 121, TRY ≈ 69)
  // r06: 세로 3줄(1560~1660)은 릴스 하단 UI 에 가려 카드 아래 가로 한 줄(y 1415)로 옮긴다.
  //      글자 폭이 달라 고정 x 로는 간격이 고르지 않으므로, 먼저 만들고 실제 폭(bbox)을 잰 뒤 간격 60 으로 가운데 정렬한다(typeOn 은 잰 뒤에).
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

  // 5) "톡!" 스티커 (15.18): 널 아래 lime 배경(180×120 r 24 — S06 "툭!" 과 같은 크기) + black ko "톡!" 84.
  //    자식을 먼저 parent 로 붙인 뒤 널을 10도 돌린다(parent 설정은 world transform 을 보존하므로 순서가 바뀌면 회전이 상쇄됨). popIn 은 널에.
  // 폭 어림: "톡" 1자 × 0.95 × 84 ≈ 80px + "!" ≈ 25px ≈ 105px — 배경 180 안 OK
  var stk = group("S07 tok ctrl", [250, 640], T.tok, tOut);
  // 이중 표기: 스티커를 150 높이로 키우고 "톡!" 아래에 "TAP!" 을 함께 넣는다(스티커째 popIn)
  rect({ w: 180, h: 150, r: 24, color: COL.lime, pos: [250, 640], t0: T.tok, t1: tOut, parentLayer: stk, name: "S07 tok bg" });
  text("톡!", { font: "ko", size: 84, color: COL.black, pos: [250, 622], t0: T.tok, t1: tOut, parentLayer: stk, name: "S07 tok text" });
  gloss("TAP!", { pos: [250, 684], size: 24, color: COL.black, tracking: 150, still: true, t0: T.tok, t1: tOut, parentLayer: stk, name: "S07 tok gloss" });
  stk.rotation.setValue(10);
  popIn(stk, T.tok);

  // 6) 15.42: 전부 slideOut("left", dist 800, dur 0.12). 스티커는 널만 밀어야 수평으로 나간다(자식 position 은 회전된 널 좌표계).
  for (i = 0; i < cardSet.length; i++) { slideOut(cardSet[i], t1, "left", OUT); }
  slideOut(title, t1, "left", OUT);
  for (i = 0; i < statusLayers.length; i++) { slideOut(statusLayers[i], t1, "left", OUT); }
  slideOut(stk, t1, "left", OUT);
});
