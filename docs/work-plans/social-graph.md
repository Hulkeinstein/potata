# Work Plan: P1 소셜 그래프 (팔로우 + 공개 프로필 + 팔로잉 피드)

## Overview
- **Objective**: 기존 OOTD 피드 위에 소셜 그래프를 얹어 potata를 패션 SNS로 전환한다. 팔로우/언팔로우, `@handle` 공개 프로필 페이지, `/what-to-wear` "전체/팔로잉" 탭(전체=비로그인 공개)을 MVP로 제공.
- **Scope**:
  - **IN**: PR1(백엔드: Follow 스키마 + User.handle + handle 생성/검증 lib + handle 주입 + 중복체크 API + 팔로우 API + 피드 GET 공개·팔로잉 필터 + types + 테스트), PR2(UI: 공개 프로필 페이지 + 피드 탭 + handle 온보딩 + 프로필 링크).
  - **OUT**: bio·아바타 편집·DM·댓글·알림·explore(추천 탐색)·handle 변경 설정. 풀텍스트·Redis fan-out·이미지 신규 업로드 경로.
- **Approach**: Follow = Prisma explicit join(복합 unique + 양방향 인덱스), fan-out on read(역관계 join + cursor — Redis 불필요, MVP 규모 적합). handle = `String? @unique` nullable(비가역 backfill 마이그레이션 회피 + 단일 온보딩 게이트로 이메일/OAuth/기존 유저 통일). 라우트 = `/profile/[handle]`(Next.js `@slot`/루트 캐치올 충돌 회피, UI 표기만 `@handle`). 기존 like 라우트의 멱등 토글 패턴을 팔로우 API에 복제.

## Context

### Project Context (from docs/)
- **Product Goal**: potata = 패션 커머스 → 소셜 커머스 하이브리드. P1 소셜 그래프 = 패션 SNS 전환점(북극성). 비전·로드맵 = `docs/work-plans/fashion-social-research.md`(P1~P5 단계).
- **ADR Constraints Applied**: ADR-007(Supabase Storage — 본 PR1은 신규 업로드 없음), ADR-008(상품 SSoT=DB — 영향 없음), NextAuth v5 JWT `session.user.id`(팔로우 follower 식별), Result 패턴(API 핸들러 최상위 try-catch만), data/dummy.ts 의존 금지.
- **Aligned with Existing Plans**: OOTD(#41~47)·검색·리뷰·Q&A 정착 위에 독립 신규. 기존 OOTD 피드 GET/like/types를 확장(파괴적 변경 없음 — author에 handle 추가는 nullable·하위호환).

### Interview Summary
**확정 결정 (사용자 승인 — 재인터뷰 금지)**:
- 프로필 라우트: `app/profile/[handle]/page.tsx`, UI 표기 `@handle`. 이유: `/@handle` 루트 캐치올은 Next.js `@slot`(parallel routes)과 충돌 위험.
- 팔로잉 피드: `/what-to-wear` "전체/팔로잉" 탭, 기본=전체.
- 전체 탭 = 비로그인 공개. 쓰기(게시/좋아요/팔로우)·팔로잉 탭은 인증 필수.
- handle = 가입 시 직접 입력(이메일 폼) + 중복체크.
- 공개 프로필 = MVP(아바타 dicebear + name + 팔로워/팔로잉 수 + 팔로우 버튼 + 유저 OOTD 그리드).
- 2 PR 분할(PR1 백엔드 / PR2 UI). Follow 모델 + User.handle 스키마 변경 승인됨.

**OPEN DESIGN 설계 결과 — handle 충당 통일안 (스펙게이트 확인 대상)**:
- User.handle = `String? @unique` (nullable). backfill 마이그레이션(비가역·위험) 회피.
- **실측 단순화**: `app/api/auth/signup/route.ts:59-86`가 이미 User를 upsert(emailVerified=false)한다. verify route(`auth/verify/route.ts:82-96`)는 emailVerified=true로 **update**만 하고 handle은 미접촉(보존). → handle 주입은 **signup route upsert 1곳**이면 충분(VerificationCode.handle 컬럼 불필요). metis의 "verify 경로 주입"은 update 보존이라 자동 충족.
- 이메일 가입: signup 폼 handle 필드 추가 → 중복체크 API(폼 실시간) + signup route 서버 재검증(Zero Trust) → User.upsert에 handle 주입.
- OAuth(`lib/auth-providers.ts:52-67` syncOAuthUser): 폼 없음 → handle 미접촉(null 유지).
- 기존 유저: handle null. **공통 게이트(PR2)**: handle null 로그인 유저 → `/onboarding/handle` 유도(클라/server-component 가드, 미들웨어 아님 — JWT에 handle 없음).
- **PR1 핵심 = handle null 안전성**: 공개 프로필은 handle 없으면 도달 불가(404 폴백), 팔로우는 userId 기반(handle 무관). null이 시스템을 깨지 않음.

### Research Findings (실측)
- `prisma/schema.prisma:11-31` User. 관계 추가 = line 28-29(answers 이후). Follow 모델 = line 33(`enum OrderStatus`) 전. User.handle = `String? @unique`. dicebear seed → **handle 통일 권장**(handle 불변·고유; name은 변경 가능·중복 → seed 부적합).
- `app/api/ootd/route.ts:100-119` GET. **401 게이트 102-105** = 결정 ③ 위해 tab=all 한정 완화. 팔로잉 필터·tab param 미존재(신규). include user select `{id,name,avatar}`(116) → handle 추가.
- `app/api/ootd/[id]/like/route.ts:1-42` = 멱등 토글 템플릿(auth → 존재검증 → findUnique(복합 unique) → delete or `createMany skipDuplicates` → count).
- `middleware.ts:23,38` 보호 = mypage/liked/admin만. `/what-to-wear`·`/profile`은 미들웨어 밖(비로그인 페이지 접근 OK). `/profile` = server component 공개. 게이트 완화는 **API GET 1곳**만으로 충분.
- `app/api/auth/signup/route.ts:59-86` User upsert + VerificationCode 생성. handle 주입 위치.
- `components/ootd/WhatToWearClient.tsx:33-45` loadFeed=`/api/ootd`(tab 없음 → PR2에서 `?tab=` 추가). OOTDCard dicebear seed=`item.author.id`(171).
- `app/signup/page.tsx:13-18,175-234` 폼 name/email/password/confirm(handle 필드 신규 — PR1에 폼+중복체크 포함, 결정 ④).
- `types/index.ts:161-170` OOTDFeedItem.author(166)에 handle 추가. Follow/PublicProfile 신규.

### Metis Review
**Identified Gaps (addressed)**:
- 피드 GET 전면 401 → tab=all 한정 완화(T5)로 해소. 쓰기/팔로잉 인증 유지(Gap Probe 검증).
- dicebear seed 불일치(mypage=name vs OOTDCard=id) → 공개 프로필은 handle seed 통일(T·PR2). PR1은 author.handle만 노출.
- handle null 유저 깨짐 → nullable + null 안전성(T1/T6 DoD). 공개 프로필 404 폴백, 팔로우 userId 기반.
- IDOR(타인 명의 팔로우) → follower=session만(T4 DoD + 테스트).
- backfill 비가역 → nullable로 회피(마이그레이션 무가드 backfill 없음).

## Prerequisites
- [x] (PR1) 브랜치 `feat/social-graph` — PR1(T1~7) 머지 완료(#48).
- [ ] (PR2) 브랜치 `feat/social-graph-pr2` 체크아웃(생성됨, main #48 기반).
- [ ] (PR2) `git diff prisma/schema.prisma package.json auth.ts` 시작 시점 빈 출력 확인(스키마·의존성·JWT 무변경 기준선 — PR2는 UI + 저장 API만).
- [ ] dev DB 접근(`npx prisma db push` 가능 — CLAUDE.md Allowed). PR2는 스키마 무변경이라 push 불필요.

---

## TODOs

### Wave 1 (병렬 — 공유 의존성 먼저)

- [x] 1. Follow 모델 + User.handle 스키마 + db push `category:ultrabrain`
  **Goal**: `prisma/schema.prisma`에 Follow 모델 추가 + User에 `handle String? @unique` + 양방향 관계. `npx prisma db push` 성공(dev DB), `npx prisma generate` 후 타입에 `Follow`/`User.handle` 노출.
  **References** (WHY):
  - `prisma/schema.prisma:11-31` — User 블록. 관계 추가 위치 = line 28-29(`answers Answer[]` 다음). `handle String? @unique`는 `avatar String?`(17) 근처 또는 관계 위. **nullable 필수**(기존 유저·OAuth backfill 회피).
  - `prisma/schema.prisma:33` — `enum OrderStatus` 직전이 Follow 모델 삽입 위치(User 블록 닫힘 후).
  - `prisma/schema.prisma:39-53` Order 모델 — 관계 선언 스타일(`@relation(fields/references)`)·`@@index` 컨벤션 복제.
  - `prisma/schema.prisma:55-67` VerificationCode — `@@index` 다중 선언 스타일 참조.
  **Must NOT do**: handle을 `String`(non-null)로 만들지 말 것 — 기존 행 db push 실패/비가역 backfill 강제됨. Follow에 cascade 없는 onDelete 기본 외 임의 cascade 추가 금지(MVP). 운영 DB로 push 금지(dev/CI 전용 — CLAUDE.md). 마이그레이션 파일 생성(`prisma migrate`)이 아닌 `db push` 사용(프로젝트 컨벤션).
  **QA Scenarios** (agent-executable):
  - Happy path: `npx prisma db push` → exit 0, 출력에 "Your database is now in sync". 이어 `npx prisma generate` → exit 0.
  - 스키마 정합: `grep -n "model Follow\|handle String? @unique\|@@unique(\[followerId, followingId\])\|@@index(\[followingId\])" prisma/schema.prisma` → 4개 매치 모두 존재.
  - Negative(null 안전): `npx tsc --noEmit` → exit 0 (handle이 `string | null`로 타입화되어 기존 User 사용처가 깨지지 않음).
  - 관계 검증: Follow에 `following User @relation("Following", fields:[followingId])` + `followedBy User @relation("Followers", fields:[followerId])` 양방향, User에 `following Follow[] @relation("Following")` + `followedBy Follow[] @relation("Followers")` 존재(`grep -n "Following\|Followers" prisma/schema.prisma` → 4 매치).

- [x] 2. `lib/handle.ts` handle 생성/검증 순수함수 `category:ultrabrain`
  **Goal**: 순수함수 `validateHandle(raw: string): { ok: true; value: string } | { ok: false; error: string }` + `RESERVED_HANDLES` 상수. DB 무관(unique 체크는 호출측). 허용문자 `[a-z0-9_]`, 길이 3-20, 예약어 차단, 정규화(소문자).
  **References** (WHY):
  - `lib/auth.ts` (normalizeEmail/normalizeName/isValidEmail 위치) — 동일 파일군의 순수 검증 함수 시그니처·Result 스타일 복제. (`grep -n "export function normalize\|export function isValid" lib/auth.ts`로 패턴 확인)
  - `coding-standards.md` Result 패턴 — `{ ok: true, value } | { ok: false, error }`.
  - 예약어 = 실제 라우트(충돌 방지): `category, verify-email, mypage, liked, product, try-on, login, signup, checkout, what-to-wear, admin, brands, for-you, ranking, shop, search, profile, api` + 안전어 `me, settings, about, help, terms, privacy, onboarding`. (`app/` 1뎁스 디렉터리 = 예약 대상.)
  **Must NOT do**: DB 호출 추가 금지(순수함수 유지 — unique는 호출측 책임). 대소문자 구분 유지 금지(소문자 정규화 후 비교 — `Admin`/`ADMIN`도 차단). 정규식에 백트래킹 폭발 패턴(ReDoS) 금지. handle 변경 함수(rename) 추가 금지(OUT).
  **QA Scenarios** (agent-executable):
  - Happy path: `validateHandle("style_kim")` → `{ ok: true, value: "style_kim" }`. `validateHandle("Style_Kim")` → `{ ok: true, value: "style_kim" }`(소문자 정규화).
  - Edge(길이): `validateHandle("ab")` → `{ ok: false }`(3자 미만). `validateHandle("a".repeat(21))` → `{ ok: false }`(20자 초과).
  - Negative(허용문자): `validateHandle("style.kim")` → `{ ok: false }`. `validateHandle("style kim")` → `{ ok: false }`. `validateHandle("스타일")` → `{ ok: false }`.
  - Negative(예약어): `validateHandle("admin")` → `{ ok: false }`. `validateHandle("Profile")` → `{ ok: false }`(정규화 후 매치). `validateHandle("api")` → `{ ok: false }`.

- [x] 3. types: Follow/PublicProfile (+ author.handle은 T6로 이관) `category:quick`
  **Goal**: `types/index.ts`에 팔로우/공개프로필 API 계약 타입 추가 + `OOTDFeedItem.author`에 `handle: string | null` 추가. `npx tsc --noEmit` exit 0.
  **References** (WHY):
  - `types/index.ts:161-170` — `OOTDFeedItem.author`(166: `{ id; name; avatar }`)에 `handle: string | null` 추가. nullable(handle null 유저 호환).
  - `types/index.ts:181` — `OOTDLikeData` 토글 응답 타입 = 팔로우 토글 응답(`FollowToggleData = { targetUserId: string; following: boolean; followerCount: number }`) 스타일 복제.
  - `types/index.ts:171-174` OOTDFeedData — cursor 페이지 타입 스타일(피드 GET 재사용).
  **Must NOT do**: 기존 `OOTDFeedItem` 필드 제거/rename 금지(하위호환). author.handle을 non-null로 만들지 말 것(null 유저 존재). PublicProfile에 email/passwordHash/order 필드 포함 금지(Tier2 — 화이트리스트).
  **QA Scenarios** (agent-executable):
  - Happy path: `grep -n "handle: string | null" types/index.ts` → author 라인에 매치. `grep -n "FollowToggleData\|PublicProfile" types/index.ts` → 신규 타입 존재.
  - 정합: `npx tsc --noEmit` → exit 0 (author.handle 추가가 `app/api/ootd/route.ts` map(126)을 깨지 않음 — T6에서 handle 채움 전까지는 임시 타입 에러 가능 → T6과 함께 정합. 본 task는 타입 선언만, 컴파일 정합은 T6 완료 후 F1에서 최종 확인).
  - Negative: `grep -n "passwordHash\|email" types/index.ts | grep -i "PublicProfile"` → 매치 없음(누설 타입 없음).

### Wave 2 (Wave 1 완료 후, 병렬)

- [x] 4. handle 주입(signup) + 중복체크 API `category:ultrabrain`
  **Goal**: 이메일 가입 시 handle을 받아 검증·중복체크 후 User에 저장. (a) signup 폼에 handle 입력 필드 + 실시간 중복체크, (b) `GET /api/auth/handle/check?handle=` 중복체크 API, (c) signup route가 서버 재검증(validateHandle + unique) 후 `User.upsert`에 handle 주입.
  **References** (WHY):
  - `app/api/auth/signup/route.ts:59-86` — `prisma.user.upsert`의 create/update 절(67-72)에 `handle` 추가. **이 1곳이 이메일 handle 주입점**(실측: verify는 update만이라 보존). upsert 전 `validateHandle`(T2) + `prisma.user.findUnique({where:{handle}})` unique 체크.
  - `lib/handle.ts`(T2) — `validateHandle` 서버 재검증(Zero Trust — 폼 검증 신뢰 금지).
  - `app/api/auth/verify/route.ts:82-96` — verify upsert는 handle 미접촉 유지(보존 확인용 — 변경하지 말 것).
  - `app/signup/page.tsx:13-18`(INITIAL_FORM) + `175-234`(입력 필드들) + `47-51`(fetch body) — handle 필드 추가 위치. 이름 필드(177-188) 마크업 복제.
  - `types/index.ts` `SignupRequest` — handle 추가(T3 또는 여기서).
  **Must NOT do**: 폼 검증만 믿고 서버 재검증 생략 금지(Zero Trust). handle을 VerificationCode 테이블에 추가하지 말 것(불필요 — signup이 직접 User upsert). 중복체크 API에서 타이밍 공격용 상세 정보 노출 금지(available true/false만). 기존 name/email/password 검증 로직 변경 금지(surgical).
  **QA Scenarios** (agent-executable):
  - Happy path: `POST /api/auth/signup` body에 `handle:"newuser1"` → User.upsert에 handle 저장. `grep -n "handle" app/api/auth/signup/route.ts` → upsert create/update + 검증 호출 매치.
  - Edge(중복): 기존 handle로 `GET /api/auth/handle/check?handle=admin` → `{ available: false }`(예약어). 미사용 handle → `{ available: true }`.
  - Negative(서버 재검증): 폼 우회로 signup에 `handle:"ab"`(3자 미만) POST → 400(서버가 validateHandle로 거부). `handle:"admin"` → 400(예약어).
  - Negative(unique 경쟁): 동일 handle 동시 2 signup → 1개만 성공(DB unique 제약이 최종 방어 — P2009/unique 위반 시 409 응답).

- [x] 5. 팔로우 API(멱등 토글 + IDOR/self-follow 가드) `category:ultrabrain`
  **Goal**: `POST /api/users/[id]/follow` — 멱등 토글(팔로우/언팔로우). follower=session.user.id(클라 입력 금지), self-follow 차단, 대상 존재 검증. 응답 = `{ targetUserId, following, followerCount }`.
  **References** (WHY):
  - `app/api/ootd/[id]/like/route.ts:7-42` — **멱등 토글 템플릿 정확 복제**: auth 게이트(9-12) → `params` await(14) → 대상 존재 `findUnique select id`(17-20) → `findUnique` 복합 unique(22-24) → delete or `createMany skipDuplicates`(27-34) → count(36) → 응답(37). Follow는 `userId_postId` 대신 `followerId_followingId` 복합 unique(T1) 사용.
  - `app/api/ootd/route.ts:21-25` — `session.user.id`로 actor 식별 패턴(follower는 **반드시 session에서** — 클라 body/param 금지 = IDOR 방어).
  - 라우트 경로 = `/api/users/[id]/follow`(id = 팔로우 대상 userId). `app/api/ootd/[id]/` 디렉터리 구조 복제.
  **Must NOT do**: follower를 요청 body/param/header에서 받지 말 것(session만 — IDOR 핵심). self-follow 허용 금지(`session.user.id === targetId` → 400). 존재하지 않는 대상 팔로우 허용 금지(404). 멱등성 깨는 비-skipDuplicates create 금지(연타 경쟁 → unique 위반 500). follow count를 캐시/비정규화 금지(MVP — `count` 쿼리).
  **QA Scenarios** (agent-executable):
  - Happy path: 로그인 유저가 `POST /api/users/{otherId}/follow` → `{ following: true, followerCount: 1 }`. 재호출 → `{ following: false, followerCount: 0 }`(언팔로우 토글).
  - Edge(멱등 경쟁): 동일 대상 연타 2회(병렬) → unique 위반 500 없음(skipDuplicates 흡수), 최종 상태 일관.
  - Negative(IDOR): body/param으로 다른 followerId 주입 시도 → 무시되고 session.user.id 사용(`grep -n "session.user.id" app/api/users/[id]/follow/route.ts` 존재, body에서 follower 읽는 코드 없음).
  - Negative(self-follow): `POST /api/users/{나의id}/follow` → 400. Negative(대상 없음): `POST /api/users/nonexistent/follow` → 404. Negative(비로그인): 토큰 없이 → 401.

- [x] 6. 피드 GET 401 완화(tab=all 공개) + 팔로잉 필터 + author.handle `category:ultrabrain`
  **Goal**: `GET /api/ootd?tab=all|following` — tab=all(기본)은 비로그인 공개(401 게이트 완화), tab=following은 인증 필수 + 팔로잉 유저만 필터. author에 handle 추가. isLiked는 비로그인 시 false.
  **References** (WHY):
  - `app/api/ootd/route.ts:100-119` GET — **401 게이트 102-105를 tab 분기로 교체**: session 없어도 tab=all 허용, tab=following이면 session 필수(401). userId(106)는 session?.user?.id(nullable).
  - `app/api/ootd/route.ts:109-119` findMany — tab=following이면 `where: { user: { followedBy: { some: { followerId: userId } } } }`(Follow 역관계, T1). tab=all은 where 없음(전체).
  - `app/api/ootd/route.ts:116` — `likes: { where: { userId } }`는 userId null이면 isLiked false. 비로그인 시 likes include를 빈 배열로(userId 없으면 isLiked=false 보장).
  - `app/api/ootd/route.ts:114,126` — user select(114)에 `handle: true` 추가 + map(126) author에 `handle: p.user.handle`.
  - `middleware.ts:23,38` — `/api/ootd`는 미들웨어 matcher 밖(라우트 자체 게이트만). 추가 미들웨어 변경 불필요.
  **Must NOT do**: tab=following을 비로그인 공개로 풀지 말 것(401 유지). 쓰기(POST 19-97) 게이트 완화 금지(게시는 인증 유지). 좋아요 라우트 게이트 완화 금지(별도 파일 — 손대지 말 것). tab param 미지정 시 following으로 기본값 두지 말 것(기본=all). 비로그인에서 isLiked를 true/임의값으로 두지 말 것(false 고정).
  **QA Scenarios** (agent-executable):
  - Happy path(공개): 비로그인 `GET /api/ootd?tab=all` → 200 + items(isLiked 전부 false). `GET /api/ootd`(param 없음) → 200(기본=all 공개).
  - Happy path(팔로잉): 로그인 유저 `GET /api/ootd?tab=following` → 200 + 팔로우한 유저 게시물만(SQL where Follow 역관계 적용 — `grep -n "followedBy" app/api/ootd/route.ts` 존재).
  - Negative(인증): 비로그인 `GET /api/ootd?tab=following` → 401. 비로그인 `POST /api/ootd`(게시) → 401(쓰기 유지).
  - 정합(handle): 응답 author에 handle 필드 존재(`grep -n "handle: p.user.handle\|handle: true" app/api/ootd/route.ts` → 2 매치). `npx tsc --noEmit` exit 0(T3 타입과 정합).

### Wave 3 (Wave 2 완료 후)

- [x] 7. 테스트: handle 검증 단위 + 팔로우 멱등/IDOR/self-follow + 피드 필터 `category:ultrabrain`
  **Goal**: Vitest 테스트 추가 — handle 순수함수 단위(T2), 팔로우 API 멱등/IDOR/self-follow(T5), 피드 GET tab 분기 공개/인증(T6). `npm run test` exit 0.
  **References** (WHY):
  - `lib/auth-providers.ts` 테스트 파일(있으면 `*.test.ts` 동위치) — prisma mock 스타일·Vitest 셋업 복제. (`grep -rln "vi.mock\|prisma" *.test.ts lib/**/*.test.ts`로 기존 mock 패턴 확인)
  - `lib/handle.ts`(T2) — 순수함수라 mock 불필요, 입출력 직접 단언(QA Scenarios T2 그대로 케이스화).
  - `app/api/users/[id]/follow/route.ts`(T5) — IDOR/self-follow/멱등 시나리오(QA Scenarios T5 케이스화, prisma mock).
  - `app/api/ootd/route.ts`(T6) — tab=all 비로그인 200 / tab=following 비로그인 401 / 쓰기 401(QA Scenarios T6).
  **Must NOT do**: 실제 DB 연결 테스트 금지(prisma mock — CI 비용·격리). 기존 OOTD/auth 테스트 수정/삭제 금지(회귀 — 신규 파일만). 테스트 통과 위해 검증 로직 완화 금지(Test Inversion 방지 — DoD 약화 금지). flaky한 실시간 의존(Date.now 미고정) 테스트 금지.
  **QA Scenarios** (agent-executable):
  - Happy path: `npm run test` → exit 0, 신규 3개 테스트 파일 통과(handle/follow/feed).
  - 커버리지(보안): IDOR(body follower 무시)·self-follow(400)·멱등(연타 일관)·예약어(admin 거부)·공개 게이트(tab=all 비로그인 통과 / following 401) 케이스가 각각 명시적 테스트로 존재(`grep -rn "IDOR\|self\|멱등\|tab=all\|tab=following" **/*.test.ts` 매치).
  - Negative(회귀): `npm run test` 전체 — 기존 테스트 0 fail(신규가 기존을 깨지 않음).

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 | None | 스키마 = 모든 Prisma 호출 선결(Follow/handle 컬럼) |
| 2 | None | 순수함수 — DB 무관 독립 |
| 3 | None | 타입 정의 독립 |
| 4 | 1, 2 | User.handle 컬럼 + handle 검증 함수 필요 |
| 5 | 1 | Follow 모델(복합 unique) 필요 |
| 6 | 1, 3 | Follow 역관계 필터 + author.handle 타입 필요 |
| 7 | 4, 5, 6 | 테스트 대상 구현 완료 후 |

---

## Parallel Execution Graph

Wave 1 (즉시 시작, 병렬):
├── Task 1: schema(Follow + User.handle) + db push
├── Task 2: lib/handle.ts(순수함수)
└── Task 3: types(Follow/PublicProfile/author.handle)

Wave 2 (Wave 1 완료 후, 병렬):
├── Task 4: handle 주입(signup) + 중복체크 API
├── Task 5: 팔로우 API
└── Task 6: 피드 GET 공개·팔로잉 필터

Wave 3 (Wave 2 완료 후):
└── Task 7: 테스트(handle/팔로우/피드)

Critical Path: Task 1 → Task 5 → Task 7

---

## Category + Skills

| Task | Category | Category Reason |
|------|----------|----------------|
| 1 | ultrabrain | 스키마 변경(비가역 위험)·관계 설계·db push — 신중 분석 필요 |
| 2 | ultrabrain | 보안 검증 로직(예약어·허용문자·인젝션 방지) 순수함수 |
| 3 | quick | 타입 정의만, 로직 없음 |
| 4 | ultrabrain | 인증 경로 변경(P0)·중복 경쟁·Zero Trust 재검증 |
| 5 | ultrabrain | IDOR·self-follow·멱등 경쟁 보안 핵심 |
| 6 | ultrabrain | 공개 게이트 완화(인증 경계)·필터 정확성 |
| 7 | ultrabrain | 보안 시나리오(IDOR/self/공개) 검증 테스트 |

---

## Final Verification Wave

- [x] F1. `npx prisma generate && npx tsc --noEmit` → exit 0 (스키마·타입 정합)
- [x] F2. `npm run lint` → exit 0 (신규 파일 포함)
- [x] F3. `npm run test` → exit 0 (T7 신규 테스트 통과)
- [x] F4. `git diff --stat package.json` → 빈 출력(의존성 무변경 — Must NOT do)
- [x] F5. `grep -rn "app/@\[handle\]\|/@" app/` → 매치 없음(루트 캐치올 금지 확인)
- [x] F6. `grep -n "passwordHash\|email\|order" app/api/users` 류 공개 프로필 응답 — PR1 범위 외(프로필 select는 PR2). PR1: 팔로우 count 응답에 민감필드 없음 확인
- [x] F7. Tier2 적대검증(validator + oracle): IDOR(팔로우 위조)·공개 프로필 필드 누설·비가역 backfill·멱등 경쟁·self-follow — `coding-workflow.md` 위험 #1/#2/#3 다중 적대검증 권장
- [x] F8. 수동: 비로그인으로 `GET /api/ootd?tab=all` → 200(공개), `GET /api/ootd?tab=following` → 401(인증 필수), `POST /api/ootd`(게시) → 401(쓰기 인증 유지)

---

## Test Strategy
- [ ] tests-after (Vitest + prisma mock). 신규: `lib/handle.test.ts`(순수함수 검증) + 팔로우 API 멱등/IDOR/self-follow + 피드 GET tab 분기(공개/인증). 기존 OOTD/auth 테스트 회귀 없음.

## Success Criteria
> **PR1 경계**: 본 PR1은 **백엔드(API/스키마/타입/테스트) 레벨**에서 소셜 그래프를 지원 가능 상태로 만든다. 실제 UI 노출(프로필 페이지·탭·온보딩)은 PR2. PR1 Success Criteria는 API/스키마 기준으로 검증한다.
- [ ] 팔로우/언팔로우 멱등 토글 동작(연타·멀티탭 경쟁 흡수), follower=session만(IDOR 차단), self-follow 차단.
- [ ] handle 생성 시 허용문자/길이/예약어/unique 검증 통과, null 유저가 팔로우/피드 API에서 깨지지 않음(handle null 안전성).
- [ ] `GET /api/ootd?tab=all` 비로그인 200(공개), `tab=following` 인증 필수, 쓰기(게시/좋아요/팔로우) 401 유지.
- [ ] `npx tsc --noEmit` + `npm run lint` + `npm run test` 전부 exit 0, package.json diff 빈 출력.

---

## PR2 (UI — 완벽본, PR1 #48 머지 후 refine 완료)

> **REFINE 기록**: PR1(T1~7) 머지 후 grep stale 재확인 완료(2026-06-30). 핵심 발견 — PR1이 백엔드를 예상보다 더 완성: `app/api/ootd/route.ts`는 이미 `?tab=all|following` + author.handle 노출(L104,118,127,140), `types/index.ts:184-209`는 `PublicProfile`(화이트리스트)·`FollowToggleData` 선반영, `app/api/auth/handle/check`(`?handle=`→`{available}`)·`lib/handle.ts:validateHandle` 재사용 가능. **→ PR2는 순수 UI + 온보딩 저장 API(PATCH) 1개만 신규.** OOTD/follow/handle-check 라우트는 클라이언트 fetch만(라우트 무변경).
>
> **Task 순서(의존)**: 브랜치 `feat/social-graph-pr2`(main #48 기반). T8(프로필 페이지+팔로우 버튼·독립) ∥ T10(온보딩 페이지+저장 API+배너·독립) → Wave 4. T9+T11은 동일 파일(`WhatToWearClient.tsx`)이라 **한 task로 통합**(탭 + 카드 링크를 1회 편집 — 충돌 회피) → Wave 5. 저장 API 단위 + 프로필 데이터 헬퍼 테스트 → Wave 6.

### Wave 4 (PR2 — 독립 신규 페이지, 병렬)

- [x] 8. 공개 프로필 페이지 `app/profile/[handle]/page.tsx` (server, 공개) + 팔로우 버튼(client) + 데이터 헬퍼 `category:visual-engineering`
  **Goal**: 비로그인도 열람 가능한 `/profile/[handle]` 서버 컴포넌트. handle로 User 조회 → 없으면 `notFound()`(404). 헤더(dicebear avatar seed=handle + name + 팔로워/팔로잉/게시물 수) + 팔로우 버튼(client, 낙관적 토글) + 유저 OOTD 그리드. 데이터는 헬퍼 `lib/profile.ts`의 `getPublicProfile(handle, viewerId)`로 조회(테스트 가능 분리).
  **References** (WHY):
  - `types/index.ts:199-209` `PublicProfile` — **화이트리스트 계약(이미 PR1 정의)**: `{id, handle, name, avatar, followerCount, followingCount, postCount, isFollowing}`. 헬퍼 반환 타입 = 이것 그대로. email/passwordHash/order **타입에 없음**(누설 컴파일 차단).
  - `prisma/schema.prisma:11-25` User — `select: { id, name, avatar, handle }`만(화이트리스트). `ootdPosts` 관계(25) = 그리드 소스. `prisma.oOTDPost`(client accessor, 소문자 oO).
  - `prisma/schema.prisma:36-46` Follow — followerCount=`prisma.follow.count({where:{followingId:user.id}})`, followingCount=`count({where:{followerId:user.id}})`, isFollowing=비로그인 false / 로그인 `prisma.follow.findUnique({where:{followerId_followingId:{followerId:viewerId, followingId:user.id}}})` !== null. postCount=`prisma.oOTDPost.count({where:{userId:user.id}})`.
  - `app/mypage/page.tsx:48-74` — 프로필 헤더 마크업 참조(아바타 wrapper 53-62: `bg-linear-to-r from-brand-neon to-purple-500` 링 + dicebear `fill`, name 64-66, 통계 그리드 77-98). **dicebear seed=handle**(공개 프로필 전용 — mypage의 seed=user.name은 변경 금지).
  - `app/api/users/[id]/follow/route.ts:66` — 팔로우 버튼이 소비할 응답 `{targetUserId, following, followerCount}`. 버튼은 `POST /api/users/${profileUserId}/follow`.
  - `components/ootd/WhatToWearClient.tsx:53-61` `requireLogin` + L64-92 `toggleLike` 낙관적 토글 — 팔로우 버튼(client 분리 파일 `components/profile/FollowButton.tsx`)이 동일 패턴 복제(낙관적 setState → fetch → 실패 롤백, 비로그인 시 confirm→`/login`).
  - `app/api/ootd/route.ts:135-149` OOTDFeedItem map — 유저 그리드 카드는 신규 마크업(또는 단순 이미지 그리드). MVP라 OOTDCard 재사용보다 단순 `<Image>` 그리드 권장(좋아요/삭제 불필요).
  **Must NOT do**: profile select에 `email`/`passwordHash`/`orders`/`passwordHash` **절대 포함 금지**(Tier2 누설 — 화이트리스트 `{id,name,avatar,handle}`만). `auth.ts`/JWT 수정 금지(비로그인 열람 = `auth()` optional, session 없어도 200). `prisma.user.findUnique({where:{handle:null}})` 같은 null handle 조회 금지(URL에 handle 세그먼트 필수 = null 도달 불가). 팔로우 버튼에 follower를 client에서 주입 금지(서버 session — PR1이 강제). `/profile`을 middleware matcher에 추가 금지(공개 유지). OOTD/follow 라우트 수정 금지(소비만).
  **QA Scenarios** (agent-executable):
  - Happy path(비로그인 공개): 미인증 상태로 `/profile/{존재handle}` 렌더 → 200, 헤더(name·avatar·count 3종)·OOTD 그리드 표시. `getPublicProfile` 단위: 존재 handle → `PublicProfile` 반환, isFollowing=false(viewerId null).
  - Happy path(로그인 isFollowing): 팔로우한 유저 프로필 → isFollowing=true(버튼 "팔로잉" 상태). 팔로우 버튼 클릭 → 낙관적 토글 + `POST /api/users/{id}/follow` → followerCount 갱신.
  - Edge(404): `/profile/nonexistent_handle` → `notFound()`(Next 404 페이지). `getPublicProfile("nonexistent", null)` → null(또는 notFound 트리거 값).
  - Negative(누설 차단): `grep -n "email\|passwordHash\|orders" app/profile/[handle]/page.tsx lib/profile.ts` → User 민감필드 select 매치 없음. `grep -n "select:" lib/profile.ts` → `{ id: true, name: true, avatar: true, handle: true }` 화이트리스트만.
  - Negative(비로그인 팔로우 버튼): 미인증 클릭 → confirm→`/login` 유도(API 호출 전 차단). 직접 `POST` 시도해도 PR1 401(이중 방어).

- [x] 10. handle 온보딩 페이지 `app/onboarding/handle/page.tsx` (client) + 저장 API `PATCH /api/users/me/handle` + 진입점 배너 `category:ultrabrain`
  **Goal**: handle null 로그인 유저를 위한 **비강제** 핸들 설정. (a) `/onboarding/handle` 클라 폼(handle 입력 + 실시간 중복체크 재사용 + 저장 후 `router.push`로 복귀), (b) 저장 API `PATCH /api/users/me/handle`(auth → validateHandle → unique → `prisma.user.update`, P2002 409), (c) handle null 로그인 유저용 "핸들 설정" 배너 진입점(피드/마이페이지 헤더). **강제 redirect 가드 없음 — handle 없어도 앱 이용 가능.**
  **References** (WHY):
  - `app/api/auth/handle/check/route.ts:13-36` — `GET ?handle=` → `{available:boolean}`. 온보딩 폼 실시간 중복체크 **재사용**(신규 API 금지). signup 폼의 중복체크 UX 패턴과 동일.
  - `lib/handle.ts:59` `validateHandle(raw)` → `{ok,value}|{ok,error}` — 저장 API 서버 재검증(Zero Trust — 폼 신뢰 금지). 정규화된 `value` 저장.
  - `app/api/auth/signup/route.ts:31-51` — handle 서버 재검증 + unique 선행 체크 + 409 패턴 **복제**. 저장 API는 여기에 `auth()` 게이트 + `prisma.user.update({where:{id:session.user.id}, data:{handle}})` + catch P2002→409 추가.
  - `app/api/users/[id]/follow/route.ts:13-16` — `auth()` → `session.user.id` 게이트 패턴(저장 API actor=session.user.id, **client body의 userId 신뢰 금지**).
  - `app/signup/page.tsx`(handle 필드 폼 — PR1 T4) — 온보딩 폼 입력/중복체크 UX 복제(별도 페이지). 다크+brand-neon.
  - `app/mypage/page.tsx:29-41` — `useSession` + status 가드 패턴(온보딩 페이지도 로그인 필요: unauthenticated → `/login`). 배너 진입점: `session.user` 있고 `handle` 정보가 필요 → **JWT에 handle 없으므로**(auth.ts 무변경 결정) 배너는 `GET /api/users/me/handle`(또는 프로필 조회) 또는 클라에서 `/api/auth/handle/check` 불가 → **배너는 서버 컴포넌트에서 `prisma.user.findUnique({where:{id}, select:{handle}})`로 handle null 판정** 후 조건부 렌더(layout/page server check). client 페이지면 `GET /api/users/me/handle` 신규 경량 조회 허용.
  **Must NOT do**: `auth.ts` 수정 금지(JWT에 handle 추가 안 함 — 결정 ④). 강제 redirect 가드(handle 없으면 모든 페이지 차단) 금지(**비강제 유도** — 배너만). 저장 API actor를 client body에서 받지 말 것(`session.user.id`만 — IDOR). `validateHandle` 서버 재검증 생략 금지(Zero Trust). 중복체크 신규 API 생성 금지(`/api/auth/handle/check` 재사용). handle 변경(이미 set된 유저의 rename) 허용 금지(MVP — OUT, 저장 API는 신규 설정만 또는 멱등 허용은 prometheus 판단 — 단 null→set 경로 보장). middleware matcher에 `/onboarding` 추가 금지.
  **QA Scenarios** (agent-executable):
  - Happy path(저장): 로그인 + handle null 유저가 `/onboarding/handle`에서 "newhandle1" 입력 → 중복체크 available → 저장 `PATCH /api/users/me/handle {handle:"newhandle1"}` → 200, `prisma.user.update` 호출. 단위(mock): auth=user → validateHandle ok → findUnique(handle) miss → update → 200.
  - Edge(중복): 이미 사용 중 handle 저장 시도 → 409("이미 사용 중"). 단위: findUnique(handle) hit → 409. 또는 update에서 P2002 catch → 409.
  - Negative(서버 재검증): `PATCH` body `{handle:"ab"}`(3자) → 400(validateHandle 거부). `{handle:"admin"}` → 400(예약어). `{handle:"a.b"}` → 400(허용문자).
  - Negative(인증): 비로그인 `PATCH /api/users/me/handle` → 401. body에 다른 userId 주입 시도 → 무시(session.user.id만 — `grep -n "session.user.id" app/api/users/me/handle/route.ts` 존재, body userId 읽는 코드 없음).
  - Negative(비강제): handle null 유저가 `/what-to-wear`·`/mypage` 접근 → 정상 렌더(차단 없음) + "핸들 설정" 배너만 노출. `grep -rn "redirect.*onboarding" app/ middleware.ts` → 강제 redirect 매치 없음.

### Wave 5 (Wave 4 완료 후 — 피드 클라이언트 단일 편집)

- [x] 9. `WhatToWearClient.tsx` "전체/팔로잉" 탭(`?tab=`) + 작성자 → 프로필 링크 + dicebear seed (T9+T11 통합) `category:visual-engineering`
  **Goal**: `WhatToWearClient.tsx` 1회 편집으로 (a) "전체/팔로잉" 탭 + loadFeed `?tab=` 연결(기본=전체), (b) OOTDCard 작성자명/아바타 → `/profile/[handle]` 링크(handle null이면 비활성), (c) OOTDCard dicebear seed = `author.handle ?? author.id`. 동일 파일이므로 충돌 회피 위해 단일 task.
  **References** (WHY):
  - `components/ootd/WhatToWearClient.tsx:33-45` `loadFeed` — `useCallback`에 tab 의존: `const [tab, setTab] = useState<"all"|"following">("all")`(L29 근처 state) → `fetch("/api/ootd?tab=" + tab)`(L35) → deps `[tab]`(L45). `useEffect` deps에 `loadFeed` 유지(tab 변경 시 재로드).
  - `app/api/ootd/route.ts:104,111,118` — **라우트는 이미 `?tab=` 지원**(PR1): tab=following 비로그인 401, tab=all 공개. 클라는 fetch만. 팔로잉 탭 클릭 시 `requireLogin()`(L53-61) 선차단(비로그인 → /login 유도, 401 fetch 방지).
  - `components/ootd/WhatToWearClient.tsx:107-115` sticky 헤더 — 탭 UI 삽입 위치(`What to Wear?` 제목 옆/아래). 다크+brand-neon(활성 탭 `text-brand-neon` 또는 underline). "전체"/"팔로잉" 2버튼.
  - `components/ootd/WhatToWearClient.tsx:218-223` OOTDCard 작성자 div(아바타 219-221 + name 222) — `item.author.handle` 있으면 `<Link href={'/profile/' + item.author.handle}>`로 래핑, null이면 현 div 유지(비활성). `next/link` 이미 import(L5).
  - `components/ootd/WhatToWearClient.tsx:170-171` avatar dicebear — seed `item.author.id` → `item.author.handle ?? item.author.id`(handle 있으면 고유·불변 seed, null이면 id 폴백). `types/index.ts:167` author.handle은 이미 `string | null`(PR1).
  **Must NOT do**: `/api/ootd` 라우트 수정 금지(클라 fetch만 — PR1 완성). 팔로잉 탭을 비로그인에 공개 호출 금지(`requireLogin` 선차단 — 401 노이즈 방지). author.handle null인데 `/profile/null` 링크 생성 금지(조건부 — null이면 링크 없음). mypage/PostForm dicebear seed 변경 금지(OOTDCard만). 탭 기본값을 following으로 두지 말 것(기본=all — 결정 ②). 좋아요/게시 로직(toggleLike/PostForm) 변경 금지(surgical — 탭·링크만).
  **QA Scenarios** (agent-executable):
  - Happy path(탭): 초기 로드 "전체" 활성 → `fetch("/api/ootd?tab=all")`. "팔로잉" 클릭(로그인) → `fetch("/api/ootd?tab=following")` → 팔로우 유저 게시물만. `grep -n "tab=\|setTab\|useState<\"all\"" components/ootd/WhatToWearClient.tsx` → 탭 state/fetch 매치.
  - Happy path(프로필 링크): author.handle 있는 카드 작성자 클릭 → `/profile/{handle}` 이동. `grep -n "/profile/" components/ootd/WhatToWearClient.tsx` → Link href 매치.
  - Edge(null handle): author.handle null인 카드 → 작성자명 비링크(div 유지, `/profile/null` 미생성). dicebear seed = author.id 폴백.
  - Negative(팔로잉 비로그인): 비로그인 "팔로잉" 클릭 → `requireLogin` confirm→/login(401 fetch 안 함). 탭 기본값 = "전체"(`grep -n 'useState<"all"' ...` 확인).
  - 정합: `npx tsc --noEmit` exit 0(author.handle 타입 기존 일치), `npm run lint` exit 0.

### Wave 6 (Wave 5 완료 후 — 테스트)

- [x] 12. 테스트: 온보딩 저장 API(PATCH) 단위 + 공개 프로필 데이터 헬퍼 단위 `category:ultrabrain`
  **Goal**: Vitest 테스트 추가 — `PATCH /api/users/me/handle`(인증·서버검증·unique·P2002·IDOR) + `lib/profile.ts:getPublicProfile`(화이트리스트 select·count 정확·isFollowing 비로그인 false). `npm run test` exit 0, 기존 회귀 0.
  **References** (WHY):
  - `app/api/users/[id]/follow/route.test.ts:1-47` — **vi.hoisted + vi.mock prisma 패턴 정확 복제**: `vi.hoisted`로 mock fn 초기화, `vi.mock("@/auth")` + `vi.mock("@/lib/prisma")`, `makeReq`/`makeParams` 헬퍼. 저장 API 테스트는 `prisma.user.findUnique`/`update` mock.
  - `app/api/users/me/handle/route.ts`(T10) — 시나리오: auth null→401, validateHandle 거부→400, 중복(findUnique hit 또는 P2002)→409, 정상→200 + update 호출 인자(`data:{handle}`) 단언, body userId 무시(session.user.id 사용) 단언.
  - `lib/profile.ts`(T8) — `getPublicProfile` mock: user findUnique→select 화이트리스트 호출 인자 단언, follow.count 2회(follower/following), oOTDPost.count, follow.findUnique(isFollowing). viewerId null → isFollowing false 단언.
  - `lib/handle.test.ts`(PR1 T7) — handle 검증 테스트 이미 존재. 중복 금지(저장 API의 검증 호출만 mock 경유 확인).
  **Must NOT do**: 실제 DB 연결 금지(prisma mock — 격리·CI 비용). 기존 테스트(follow/handle/ootd/auth) 수정·삭제 금지(회귀 — 신규 파일만). **테스트 통과 위해 검증/화이트리스트 완화 금지**(Test Inversion 방지 — DoD 약화 금지, failing test 삭제 금지). flaky 실시간 의존(Date.now 미고정) 금지.
  **QA Scenarios** (agent-executable):
  - Happy path: `npm run test` → exit 0, 신규 2개 파일(`route.test.ts` for me/handle + `profile.test.ts`) 통과.
  - 커버리지(보안): 저장 API IDOR(body userId 무시·session만)·401(비로그인)·409(중복)·400(예약어/형식) + 프로필 헬퍼 화이트리스트(select 인자에 email/passwordHash/orders 없음)·isFollowing 비로그인 false 케이스 각각 명시적 존재(`grep -rn "401\|409\|IDOR\|화이트\|isFollowing\|session.user.id" app/api/users/me/handle/route.test.ts lib/profile.test.ts` 매치).
  - Negative(회귀): `npm run test` 전체 — 기존 테스트 0 fail.

---

## PR2 Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 8 | PR1(완료) | PublicProfile 타입·Follow·follow API·handle. 신규 페이지 독립 |
| 10 | PR1(완료) | validateHandle·handle/check·User.handle. 신규 페이지+API 독립 |
| 9 | PR1(완료) | OOTD `?tab=`·author.handle 완비. T8 프로필 라우트 존재 후 링크 유효(소프트 의존 — `/profile/[handle]` 경로) |
| 12 | 8, 10 | 저장 API(T10)·프로필 헬퍼(T8) 구현 후 테스트 |

---

## PR2 Parallel Execution Graph

Wave 4 (PR2 시작, 병렬 — 독립 신규):
├── Task 8: 공개 프로필 페이지 + 팔로우 버튼 + lib/profile.ts
└── Task 10: 온보딩 페이지 + 저장 API(PATCH) + 배너

Wave 5 (T8 머지 후 — 링크 대상 라우트 존재):
└── Task 9: WhatToWearClient 탭 + 프로필 링크 + dicebear seed (T9+T11 통합)

Wave 6 (Wave 4 완료 후):
└── Task 12: 저장 API 단위 + 프로필 헬퍼 단위 테스트

Critical Path: Task 8 → Task 9 → Task 12

---

## PR2 Category + Skills

| Task | Category | Category Reason |
|------|----------|----------------|
| 8 | visual-engineering | 공개 프로필 UI(헤더·그리드·팔로우 버튼) — 디자인 우선. 단 select 화이트리스트는 보안 주의 |
| 10 | ultrabrain | 저장 API 인증(P0)·Zero Trust 재검증·IDOR·P2002 경쟁 — 신중 분석 |
| 9 | visual-engineering | 피드 탭·링크 UI(다크+brand-neon) — 디자인 우선 |
| 12 | ultrabrain | 보안 시나리오(IDOR/401/409/화이트리스트) 검증 테스트 |

---

## PR2 Final Verification Wave

- [x] F-PR2-1. `npx prisma generate && npx tsc --noEmit` → exit 0 (PR2 신규 파일 타입 정합)
- [x] F-PR2-2. `npm run lint` → exit 0 (T8/T9/T10/T12 신규 파일 포함)
- [x] F-PR2-3. `npm run test` → exit 0 (T12 신규 테스트 + 기존 회귀 0)
- [x] F-PR2-4. `git diff --stat package.json prisma/schema.prisma auth.ts` → **빈 출력**(의존성·스키마·JWT 무변경 — Must NOT do 전역)
- [x] F-PR2-5. 공개 프로필 비로그인 열람: 미인증으로 `/profile/{존재handle}` → 200(헤더·count·그리드). `/profile/nonexistent` → 404(notFound)
- [x] F-PR2-6. 탭 전환: `/what-to-wear` 기본=전체(`?tab=all` 공개 로드). "팔로잉" 클릭(로그인) → `?tab=following` 팔로우 유저만. 비로그인 "팔로잉" → /login 유도
- [x] F-PR2-7. 온보딩 저장: 로그인+handle null 유저 `/onboarding/handle` 입력→중복체크→`PATCH /api/users/me/handle` 200 저장. 비로그인 PATCH → 401, 중복 → 409, 예약어/형식 → 400
- [x] F-PR2-8. 프로필 링크 연쇄: 피드 카드 작성자(handle 有) 클릭 → `/profile/{handle}`. handle null 작성자 → 비링크(div). dicebear seed = handle ?? id
- [x] F-PR2-9. 비강제 검증: handle null 유저가 `/what-to-wear`·`/mypage` 정상 이용(차단 없음) + "핸들 설정" 배너만. `grep -rn "redirect.*onboarding" app/ middleware.ts` → 강제 redirect 매치 없음
- [x] F-PR2-10. **Tier2 적대검증(validator + oracle)** — `coding-workflow.md` 위험 #1(보안: 공개 프로필 민감필드 누설·온보딩 저장 IDOR/인증)·#3(아키텍처: auth.ts 무변경 비강제 게이트). 다중 적대검증: ① 공개 프로필 select 화이트리스트(email/passwordHash/orders 누설 0 — `grep -n "select" lib/profile.ts` 검증) ② 저장 API follower/actor=session만(body userId 무시) ③ handle null 안전성(링크·온보딩·피드 깨짐 0) ④ 탭 인증 경계(all 공개 / following 401)

---

## PR2 Test Strategy
- [ ] tests-after (Vitest + prisma mock). 신규: `app/api/users/me/handle/route.test.ts`(저장 API 인증·검증·unique·P2002·IDOR) + `lib/profile.test.ts`(getPublicProfile 화이트리스트 select·count·isFollowing). follow route test 패턴 복제. 기존 회귀 0.

## PR2 Success Criteria
> **PR2 경계**: PR1 백엔드 위에 **UI 노출**(공개 프로필·피드 탭·온보딩·프로필 링크) + 온보딩 저장 API(PATCH) 1개. auth.ts/JWT·스키마·의존성 무변경.
- [ ] `/profile/[handle]` 비로그인 공개 열람(존재→200·부재→404), 민감필드(email/passwordHash/order) 누설 0(화이트리스트).
- [ ] `/what-to-wear` "전체/팔로잉" 탭(기본=전체·공개), 팔로잉=인증 필요. 작성자→`/profile/[handle]` 링크(null 비활성).
- [ ] handle null 로그인 유저 **비강제** 온보딩 유도(배너), `PATCH /api/users/me/handle` 저장(인증·서버재검증·unique·409). 강제 redirect 0, auth.ts 무변경. handle 없어도 앱 이용 가능.
- [ ] `npx tsc --noEmit` + `npm run lint` + `npm run test` 전부 exit 0, `git diff --stat package.json prisma/schema.prisma auth.ts` 빈 출력.
