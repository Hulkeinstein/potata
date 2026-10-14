// S16 endcard — 엔드카드 (39.66–40.88) : 흰 플래시 + 로고 착지, 태그라인·핸들이 차례로 붙은 뒤 40.88 까지 정지
scene("S16", T.finalHit, T.end, function (ctx) {
  var t0 = T.finalHit, t1 = T.end;      // 39.66 / 40.88 (T.end === DUR)
  // T 에 없는 시각은 finalHit 기준 오프셋으로 둔다(SPEC 수치 병기)
  var tTag = T.finalHit + 0.14;         // 39.80 "K-FASHION, RECODED."
  var tSub = T.finalHit + 0.29;         // 39.95 "SEOUL TO DUBAI"
  var tPill = T.finalHit + 0.44;        // 40.10 "@potata" 알약
  var tFollow = T.finalHit + 0.54;      // 40.20 "FOLLOW THE BUILD"

  // 텍스트 폭 어림(§0.10, Outfit 대문자 1자 ≈ 0.62×size, tracking 은 1/1000em × size × 글자 간격 수):
  //   "POTATA"              6자 × 0.62 × 240 = 893px, tracking -40 → -9.6px × 5 ≈ -48 → 약 845px (< 920 OK)
  //   "K-FASHION, RECODED." 19자 × 0.62 × 34 = 400px + tracking 500 → 17px × 18 = 306 → 약 706px (< 920 OK)
  //   "SEOUL TO DUBAI"      14자 × 0.62 × 30 = 260px + tracking 600 → 18px × 13 = 234 → 약 494px (< 920 OK)
  //   "@potata"              7자 × 0.62 × 28 = 122px + 알약 padX 28×2 → 알약 폭 약 178px
  //   "FOLLOW THE BUILD"    16자 × 0.62 × 28 = 278px + tracking 500 → 14px × 15 = 210 → 약 488px (< 920 OK)

  // 뒤 → 앞 순서로 생성(§0.11): 보조 텍스트 → 주인공(POTATA) → 스티커(알약) → 플래시. 배경은 전역 BG(검정).

  // 39.80 태그라인 — lime en 34 tracking 500 at (540, 1040), 타자기 0.25s
  var tag = text("K-FASHION, RECODED.", { font: "en", size: 34, color: COL.lime, tracking: 500, pos: [540, 1080], t0: tTag, t1: t1, name: "S16 tagline" });   // r02 검수: 로고 글로우 안에 묻혀 40 내림
  typeOn(tag, tTag, 0.25);

  // 39.95 보조 라인 — white enMid 30 tracking 600 at (540, 1110), 4프레임 페이드인
  var sub = text("SEOUL TO DUBAI", { font: "enMid", size: 34, color: COL.white, tracking: 600, pos: [540, 1150], t0: tSub, t1: t1, name: "S16 seoul to dubai" });
  fadeIn(sub, tSub);

  // 40.20 "FOLLOW THE BUILD" — lime enMid 28 tracking 500 at (540, 1590), 4프레임 페이드인
  var follow = text("FOLLOW THE BUILD", { font: "enMid", size: 34, color: COL.lime, tracking: 500, pos: [540, 1380], t0: tFollow, t1: t1, name: "S16 follow the build" });   // r02 검수: 아래가 비어 보여 CTA 묶음을 위로
  fadeIn(follow, tFollow);

  // 39.66 주인공 "POTATA" — white en 240 tracking -40 at (540, 900). glow 를 먼저 얹고 impactIn(118→100) 착지
  var logo = text("POTATA", { font: "en", size: 240, color: COL.white, tracking: -40, pos: [540, 900], t0: t0, t1: t1, name: "S16 POTATA" });
  pulse(logo, BEATS[BEATS.length - 1], { amount: 1.03 });   // r02 검수: 마지막 비트(40.31)에 로고가 살짝 반응해 정지 화면이 죽지 않게
  glow(logo, { radius: 80, intensity: 0.5, threshold: 70 });
  impactIn(logo, t0, { from: 118 });

  // 40.10 "@potata" 알약 — 흰 테두리 2 · 채움 없음(color 없이 stroke 만 주면 pill 이 noFill 로 만든다) · size 28 at (540, 1500), 탄성 팝
  var handle = pill("@potata", { stroke: { color: COL.white, width: 2 }, noFill: true, size: 34, h: 64, pos: [540, 1290], t0: tPill, t1: t1, name: "S16 handle" });
  popIn(handle, tPill);

  // 39.66 카메라 흔들림 1.0 (CTRL Shake 슬라이더)
  shake(t0, { amount: 1.0 });

  // 맨 앞: 흰 플래시 peak 70 · 0.10s (전체 화면 솔리드, parent 없음 → 흔들림 영향 없음). 39.66–39.76
  var fl = flash(COL.white, t0, { peak: 70, dur: 0.10 });
  fl.name = "S16 flash";

  // 40.88 까지 정지 — 모든 레이어 t1 = T.end, 퇴장 모션 없음(하드컷·영상 끝)
});
