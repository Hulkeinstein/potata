// S09 share — Share it, pop! pop! (16.26–18.46)
scene("S09", T.shareIt, T.verseEnd, function (ctx) {
  var t0 = T.shareIt, t1 = T.verseEnd;
  var tCard = BEATS[38];          // 16.30 — BEATS 값 16.3 과 일치(SPEC "16.30")
  var tFollow = T.pop2 + 0.30;    // 18.10 — T 에 없는 시각이라 pop2 기준 오프셋(SPEC "18.10")

  // 텍스트 폭 어림(§0.10, Outfit 1자 ≈ 0.62×size):
  //   "SHARE IT" 8자 × 0.62 × 170 ≈ 843px (< 920 OK, 공백 포함 어림이라 실제는 더 좁다)
  //   "1.2K"     4자 × 0.62 × 40  ≈ 99px
  //   "248"      3자 × 0.62 × 40  ≈ 74px
  //   "+ FOLLOW" 8자 × 0.62 × 26  ≈ 129px (+ pill padX 28×2 → 알약 폭 ≈ 185px, x 788~972)

  // 뒤 → 앞 순서로 생성: 보조(OOTD 카드) → 주인공(SHARE IT) → 스티커(하트·말풍선·FOLLOW)

  // 16.30 OOTD 포스트 카드 560×720 — 아래(+300)에서 올라와 (540, 1180) 에 정지
  var post = card({ w: 560, h: 720, pos: [540, 860], badge: "OOTD", photo: ctx.photos.share, focusY: 0.3, t0: tCard, t1: t1, name: "S09 ootd card" });
  slideIn(post, tCard, "down", { dist: 300, dur: 0.3 });

  // 16.26 주인공 "SHARE IT" — impactIn 뒤에 rgbSplit(복제본이 착지 키를 물려받도록 순서 유지)
  var title = text("SHARE IT", { font: "en", size: 170, color: COL.white, pos: [540, 400], t0: t0, t1: t1, name: "S09 share it" });
  impactIn(title, t0);
  rgbSplit(title, t0, { frames: 2 });

  // 17.40 (pop1) 하트 popIn + 좋아요 수 fadeIn + 카메라 흔들림 0.5
  var heart = icon("heart", { color: COL.lime, size: 150, pos: [250, 1340], t0: T.pop1, t1: t1, name: "S09 heart" });
  popIn(heart, T.pop1);
  var likes = text("1.2K", { font: "enMid", size: 40, color: COL.white, pos: [390, 1340], t0: T.pop1, t1: t1, name: "S09 like count" });   // r02 검수: 하트에 붙어 보여 +30
  fadeIn(likes, T.pop1);
  shake(T.pop1, { amount: 0.5 });

  // 17.80 (pop2) 말풍선 popIn + 댓글 수(좋아요 수와 같은 스타일로 fadeIn)
  var bubble = icon("bubble", { color: COL.purple, size: 110, pos: [520, 1340], t0: T.pop2, t1: t1, name: "S09 bubble" });
  popIn(bubble, T.pop2);
  var comments = text("248", { font: "enMid", size: 40, color: COL.white, pos: [640, 1340], t0: T.pop2, t1: t1, name: "S09 comment count" });   // r02 검수: 말풍선에 붙어 보여 +25
  fadeIn(comments, T.pop2);

  // 18.10 "+ FOLLOW" 알약(lime 배경 · black 글자) popIn
  var follow = pill("+ FOLLOW", { color: COL.lime, textColor: COL.black, size: 26, pos: [820, 1340], t0: tFollow, t1: t1, name: "S09 follow pill" });
  popIn(follow, tFollow);

  // 18.46 하드컷 — 모든 레이어 t1 = T.verseEnd, 퇴장 모션 없음
});
