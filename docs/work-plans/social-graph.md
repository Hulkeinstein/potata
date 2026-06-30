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
- [ ] 브랜치 `feat/social-graph` 체크아웃(생성됨, 최신 main #47 기반).
- [ ] `git diff prisma/schema.prisma package.json` 시작 시점 빈 출력 확인(의존성 무변경 기준선).
- [ ] dev DB 접근(`npx prisma db push` 가능 — CLAUDE.md Allowed).

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

## PR2 (Skeleton — PR1 머지 후 상세화)

> Rolling-wave: 아래는 skeleton(Goal + DoD 방향 + 영향범위)만. PR1 머지 후 grep stale 재확인하며 완벽본으로 채운다. **이번 /start-work 대상 아님.**

### Wave 4 (PR2 — UI, PR1 머지 후)
- [ ] 8. 공개 프로필 페이지 `app/profile/[handle]/page.tsx` (server component, 공개) `category:visual-engineering`
  **Goal(방향)**: handle로 User 조회 → 없으면 `notFound()`(404). 아바타(dicebear seed=handle 통일) + name + 팔로워/팔로잉 count + 팔로우 버튼(client) + 유저 OOTD 그리드.
  **DoD 방향**: select 화이트리스트(email/order/passwordHash 노출 금지 — Tier2), handle null 도달 불가 확인, 비로그인 열람 가능.
  **영향범위**: 신규 page + 프로필용 데이터 헬퍼(`lib/profile.ts`?) + 팔로우 버튼 컴포넌트.

- [ ] 9. `/what-to-wear` "전체/팔로잉" 탭 + loadFeed `?tab=` 연결 `category:visual-engineering`
  **Goal(방향)**: `WhatToWearClient.tsx:33-45` loadFeed에 tab state + `?tab=all|following` 추가. sticky 헤더(line 107)에 탭 UI(기본=전체). 팔로잉 탭은 비로그인 시 로그인 유도.
  **DoD 방향**: 전체=공개 로드, 팔로잉=인증 필요, 다크+brand-neon 디자인.
  **영향범위**: `WhatToWearClient.tsx`(loadFeed·헤더), OOTDCard dicebear seed → handle 통일(author.handle 도착).

- [ ] 10. handle 온보딩 게이트 `app/onboarding/handle/page.tsx` + 가드 `category:ultrabrain`
  **Goal(방향)**: handle null 로그인 유저(OAuth·기존) → 온보딩 유도. handle 입력 + 중복체크(T4 API 재사용) + 저장 API. JWT에 handle 없으므로 server-component/client 가드.
  **DoD 방향**: 이메일/OAuth/기존 유저 단일 경로 통일, 저장 후 리다이렉트.
  **영향범위**: 신규 page + handle 저장 API(PATCH) + 가드 진입점(layout 또는 server check).

- [ ] 11. OOTDCard·작성자 → 프로필 링크 연쇄(author.handle) `category:visual-engineering`
  **Goal(방향)**: 피드 카드 작성자명/아바타 → `/profile/[handle]` 링크. author.handle null이면 링크 비활성.
  **영향범위**: `WhatToWearClient.tsx` OOTDCard(218-223), 피드 GET include(이미 T6에서 handle 추가), types(이미 T3).

### PR2 Final Verification (skeleton)
- [ ] F-PR2. tsc/lint/test + 공개 프로필 비로그인 열람 + 탭 전환 + 온보딩 흐름 + Tier2(공개 필드 누설 재검증).
