// S13 yeah — "YEAH!" (31.46–32.34) : 주인공 하나, 글리치 + 플래시 + 카메라 흔들림 뒤 하드컷
scene("S13", T.yeah, T.follow, function (ctx) {
  var t0 = T.yeah, t1 = T.follow;   // T.follow === T.yeahEnd (32.34)
  var tBeat = BEATS[75];            // 32.183 — 장면 안 마지막 비트 (pulse 시각)

  // 뒤 → 앞 순서로 생성. 배경은 전역 BG(검정)가 있으므로 만들지 않는다.
  // 폭 어림(§0.10): 대문자 4자 × 0.62 × 300 = 744 + "!"(좁은 글자, ≈0.3 × 300 = 90) ≈ 834px < 920 OK
  //   (5자 전부 0.62 로 잡으면 930 — 10px 초과지만 "!" 폭이 좁아 실제 안전 영역 x 80~1000 안에 든다)
  var yeah = text("YEAH!", { font: "en", size: 300, color: COL.purple, vscale: 120, pos: [540, 960], t0: t0, t1: t1, name: "S13 YEAH!" });
  yeah.rotation.setValue(-6);                       // SPEC rotation -6 — 복제본이 물려받도록 rgbSplit 보다 먼저
  impactIn(yeah, t0, { from: 140 });                // 140% → 100% 착지 + 2프레임 페이드
  rgbSplit(yeah, t0, { frames: 3, offset: 24 });    // impactIn 뒤에 복제해야 _R/_C 복제본도 같은 스케일·페이드를 따른다
  shake(t0, { amount: 1.5 });                       // CTRL Shake 슬라이더 (카메라 널)
  pulse(yeah, tBeat, { amount: 1.05 });             // 32.183 비트 — 응답 느낌의 작은 튐

  // 맨 앞: 흰 플래시 (전체 화면 솔리드, parent 없음 → 흔들림 영향 없음). 31.46–31.54
  var fl = flash(COL.white, t0, { peak: 40, dur: 0.08 });
  fl.name = "S13 flash";
});
