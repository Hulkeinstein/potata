# 조사: potata → 패션 인스타그램(소셜 커머스 하이브리드)

> 작성: 2026-06-29 (OMO 리서치 — explore[코드 실태] + researcher[외부 베스트프랙티스]).
> 목적: potata를 "패션 스토어 + 패션 SNS" 하이브리드로 확장하는 단계 로드맵의 근거. 인덱스/비전 문서 — 상세 plan은 각 P-트랙에서 별도 작성.

---

## 1. 현재 보유 (Baseline) — 이미 SNS 1차 요소 절반

OOTD 피드(`/what-to-wear`)가 소셜의 핵심 토대를 갖춤.

| 보유 | 구현 |
|------|------|
| 게시물 피드 | `OOTDPost`(imageUrls[] 1~5·caption) + cursor pagination(최신순, `@@index([createdAt])`) — `app/api/ootd/route.ts` |
| 좋아요 | `OOTDLike`(`@@unique([userId,postId])` 멱등 토글, 낙관적 업데이트) — `app/api/ootd/[id]/like/route.ts` |
| 상품 태깅 | `OOTDPostProduct`(N:M, 최대 5개) — *shoppable 기반 이미 존재* |
| 이미지 인프라 | Supabase Storage `ootd-images` public + 서버 전용 업로드(ADR-007) |
| 인증 | NextAuth v5 JWT + Google OAuth(`session.user.id`) |
| 본인 프로필 | `/mypage`(본인 전용 — 공개 프로필 아님) |

## 2. 갭 — 인스타그램형에 부재

❌ 팔로우/팔로워(소셜 그래프 자체 없음) · ❌ 공개 프로필(`/profile/[id]` 없음) · ❌ 댓글(OOTD용 — Review/Q&A는 상품 전용) · ❌ 알림 · ❌ 저장/북마크(상품 찜 WishlistItem만) · ❌ Explore/해시태그 · ❌ 공유 · ❌ DM · ❌ 스토리

## 3. 단계 로드맵 (가치/난이도 효율순)

| Phase | 내용 | 가치/난이도 | 핵심 |
|-------|------|------------|------|
| **P1** | 팔로우 + 공개 프로필 + 팔로잉 피드 | ★★★★★ / ★★★ | "글로벌 피드 → 진짜 SNS" 전환점 |
| **P2** | 댓글 + 알림 | ★★★★ / ★★★ | 참여 신호(좋아요 3~5배) + 재방문 트리거 |
| **P3** | Explore + 해시태그 | ★★★★ / ★★★★ | 콜드스타트 해결, 인기순 랭킹 |
| **P4** | Shoppable 강화(핀포인트) + 저장 | ★★★★ / ★★ | 기존 OOTDPostProduct 스키마 활용 — 저비용 |
| **P5** | 크리에이터 커미션 · DM · 스토리 · AI 자동 태깅 | ★★★★★ / ★★★★★ | 장기, 별도 기획 |

## 4. 기술 패턴 (벤치마크 근거)

- **팔로우 그래프**: Prisma explicit join `Follow`(복합 PK `[followerId, followingId]`, 양방향 `@@index`) — 추후 알림설정/팔로우일시 컬럼 확장 용이. [Prisma self-relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/self-relations)
- **피드**: MVP = **fan-out on read**(`OOTDPost WHERE userId IN (팔로잉)` + cursor) — Redis 불필요, 수천 유저까지 충분. [ByteByteGo news feed](https://bytebytego.com/courses/system-design-interview/design-a-news-feed-system)
- **알림(P2)**: Supabase Realtime + RLS(`type`: like/comment/follow). [Makerkit](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs)
- **피드 랭킹(P3)**: `likes*3 + comments*5 + saves*2 − 시간감쇠` 가중합 → 데이터 축적 후 ML.
- **Shoppable(P4)**: `OOTDPostProduct`에 `pinX/pinY Float?` 좌표 추가 → 이미지 핀포인트.

### 벤치마크
- **LTK**: 공개 프로필(맞춤 URL) + 스레드 댓글 + AI 비주얼 검색. 동영상 전환율 > 이미지(중기 동영상 우선).
- **Depop**: ML 개인화 피드(최근 300 상호작용), "Outfits"(상품→룩 역방향).
- **무신사 스냅**: 일반인 OOTD + AI 착용 상품 자동 매칭.
- **21 Buttons**: 수익화 민주화(누구나 태깅→커미션) — UGC 동기. 단 지속가능성 교훈(2021 종료).
- **Poshmark**: Posh Parties(이벤트 기반 DAU 스파이크).

## 5. 제약 (확장 시 준수)

- **ADR-007**: Supabase Storage public 버킷 + 서버 전용. 신규 버킷 동일 패턴 재사용.
- **ADR-008**: 상품 SSoT=DB. 소셜 데이터도 DB SSoT.
- **NextAuth JWT**: 모든 쓰기(팔로우/댓글/게시) = `auth()` 인증 필수, 읽기(피드/프로필 이미지)는 공개.
- **schema 변경 Ask First**(CLAUDE.md): Follow/Comment/Notification 등 신규 모델은 사용자 승인.
- **신규 의존성 없이** P1~P4 확장 가능(기존 Prisma/Supabase/NextAuth로 충분).

## 6. 부재 모델 확장 여지 (요약)

| 모델 | 신규 필드(예상) |
|------|----------------|
| `Follow` (P1) | followerId, followingId, createdAt · `@@id([followerId,followingId])` |
| User 확장 (P1) | bio?, (선택)handle/username · following/followedBy 관계 |
| `OOTDComment` (P2) | postId, userId, content, parentId?, createdAt |
| `Notification` (P2) | userId(수신), actorId, type, targetId, postId?, read, createdAt |
| `SavedPost` (P4) | userId, postId, createdAt · `@@unique` |

---

## 관련
- 코드 실태: `app/api/ootd/**`, `components/ootd/WhatToWearClient.tsx`, `app/mypage/page.tsx`, `prisma/schema.prisma`(OOTDPost/OOTDLike/OOTDPostProduct/User)
- ADR: adr-005(Product 모델)·adr-007(Storage)·adr-008(SSoT)
- 진행: P1부터 트랙별 `/plan` → `/start-work`
