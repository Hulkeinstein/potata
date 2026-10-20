# potata 런칭 티저 리일 — After Effects 자동 빌드

> 상태: 완료(2026-10-14) — r04 렌더 `Downloads\potata-teaser\potata-teaser-final.mp4`(= r04) · 승인(41초 풀버전) · 작성 2026-10-14
> 검증 기록: 장면 작성·리뷰 workflow(57 에이전트, blocker 0) → AE 실행 r01~r04 → 시각 검수 5렌즈(확정 결함 11건 전부 반영) → r04 프레임 52장 육안 확인. AE 실행 함정은 `marketing/launch-teaser/README.md` 참조. · 참고 기획안: ChatGPT "Potata 인스타그램 운영 전략" 중 첫 Reel 기획("SEOUL, NOW LOADING IN UAE")

## Objective

"밤티 말고 Potata" 음원(40.88초)에 맞춰, 참고 기획안의 15초 티저 구성을 음악 전 길이로 확장한 9:16 모션그래픽 광고를 After Effects 2026에서 스크립트 한 번으로 생성·렌더한다.

## Evidence (수집 완료)

- 음원: 40.88s · 48kHz stereo · **143.5 BPM**(기획안 권장 130~145 BPM 구간) · 구간 = 인트로 0–6.9 / 벌스 6.9–18.5 / 후렴 19.7–31.8 / 브레이크 31.8–33.4 / 아웃트로 33.4–40.9
- 가사(faster-whisper medium, 단어 타임스탬프 확보): 기획안 카피와 일치 — Seoul, now loading / U·A·E / Let's go / K-FASHION? Too far / Not anymore / Scroll 한 번이면 서울이 문 앞에 / Discover it · Try it on · Style it · Share it (pop pop) / 밤티 말고 Potata ×3 / Seoul to Dubai / 오늘은 Potata / Yeah / Follow the build. **33.6초 이후 가사 없음(연주)**
- 인식 오류는 제목·기획안 카피로 교정해 사용: 펌티→밤티, K-PASSION→K-FASHION, Talk style→Style it, So do Dubai→Seoul to Dubai
- 브랜드: 로고 = 텍스트 `POTATA`(font-black, uppercase, 별도 이미지 없음) · 폰트 Outfit + Noto Sans KR(둘 다 설치 확인) · 색 `#050505` / `#F5F5F7` / primary `#8B5CF6` / neon `#CCF381` · 홈 카피 "SEOUL TO DUBAI", "THE NEW K-VIBE" · 메뉴 CATEGORY·SHOP·OOTD·FOR YOU·RANKING·BRANDS · 사이트 자체 배너 `public/home-banner.jpg`(1344×768) 사용 가능. 상품 이미지 1장은 타사 브랜드 상세컷이라 제외
- 환경: AE 26.5 설치(미실행) · aerender · ffmpeg · Python(librosa, faster-whisper)

## Spec

- 1080×1920 · 30fps · 40.88s · 음원 원본 삽입
- 색 4종 고정(Black / Off-white / Lime / Purple) · 폰트 Outfit-ExtraBold(영문), Noto Sans KR Black(국문) · 런타임 폰트 체크 후 Impact / Malgun Gothic 폴백
- 모션 언어 5종만 사용: Impact scale(115→100) · Directional slide · Text stagger(글자 0.03~0.05s) · Glitch cut(RGB split, hook·전환만) · Elastic pop(아이콘·배지만)
- 비트 반응: 검출 비트 95개를 컨트롤 슬라이더 키프레임으로 베이크 → 배경 펄스·로고 스케일이 박자마다 반응
- 한 순간에 주인공 하나만 크게 움직인다(기획안 원칙)

## Timeline (가사 타임스탬프 기준)

| 시간 | 화면 | 모션 |
|------|------|------|
| 0.0–2.2 | `SEOUL` / `NOW LOADING` + 로딩바 | 심장박동 점멸, 로딩바 lime 채움 |
| 2.2–3.6 | `U` `A` `E` 글자 하나씩 | 글자별 impact slam + 1~2프레임 글리치 |
| 3.6–6.9 | `NOW LOADING` 100% → `LET'S GO` | 카운트업 % + 전면 lime 플래시 |
| 7.0–10.3 | `K-FASHION?` / `TOO FAR.`(purple 취소선) / `NOT ANYMORE.`(lime 배경·검정 글씨) | kick마다 hard cut + RGB split |
| 10.3–13.4 | `Scroll 한 번이면 서울이 문 앞에` + 세로 스크롤 UI 카드 | 2.5D 카드 분리, 단어 stagger |
| 13.4–14.4 | `DISCOVER` + 메뉴 pill(CATEGORY…BRANDS) | 수평 슬라이드, 초대형 outline 텍스트 |
| 14.4–15.4 | `TRY IT ON` + AI Studio 카드 | lime 스캔라인 위→아래, `UPLOAD / MATCH / TRY` |
| 15.4–16.3 | `STYLE IT` + OOTD masonry 카드 | 좌우 연속 등장, depth 통과 |
| 16.3–18.5 | `SHARE IT` + ♥ · 말풍선 · + 아이콘 | elastic pop ×2 ("pop pop") |
| 18.5–23.0 | `밤티 말고 POTATA`(후렴) + 로고 결합 | 글자별 다른 방향 결합, purple glow, camera shake |
| 24.7–30.0 | `SEOUL → DUBAI` 화살표 / `오늘은 POTATA` / `밤티 말고 POTATA` | 배너 duotone 배경, 비트 펌핑 |
| 31.5–33.6 | `YEAH` / `FOLLOW THE BUILD` | 암전 후 글자 stagger CTA |
| 33.6–40.9 | 로고 고정 + `K-FASHION, RECODED.` + `SEOUL TO DUBAI` + `@potata` | bar 단위 색 반전 → 엔드카드 정지 |

## Deliverables

- `marketing/launch-teaser/build-teaser.jsx` — AE ExtendScript(프로젝트·comp·레이어·키프레임·렌더큐)
- `marketing/launch-teaser/README.md` — 실행법·수정 포인트
- `C:\Users\jangk\Downloads\potata-teaser\potata-teaser.aep` + `potata-teaser.mp4`(H.264, 오디오 포함)

## Success Criteria

1. AE에서 스크립트가 오류 없이 comp를 만들고 .aep를 저장한다 — 확인: 직접 실행
2. 렌더된 mp4가 40.88s · 1080×1920 · 오디오 포함이다 — 확인: ffprobe
3. 자막·장면 전환 시각이 가사 타임스탬프 ±0.1s 안이다 — 확인: 스크립트 상수 = 가사 JSON
4. 장면별 샘플 프레임을 추출해 색·폰트·레이아웃이 Spec과 맞다 — 확인: 프레임 추출 후 육안

## Tasks

- T1 스크립트 작성(helpers → 장면 12개 → 렌더큐) · 약 500줄 · complexity high
- T2 AE 실행(`AfterFX.exe -r`) → 저장 → 렌더 · 실패 시 aerender → PNG 시퀀스 + ffmpeg 폴백
- T3 프레임 추출 검증 → 보완 루프(색·타이밍·겹침)

## Risks

- 변수 폰트의 PostScript 이름 불일치 → 런타임 체크 + 폴백
- H.264 출력 템플릿 이름 불일치 → PNG 시퀀스 + ffmpeg 폴백
- 스크립트 파일 쓰기 권한(AE 환경설정) 꺼짐 → 로그 대신 .aep·mp4 존재와 ffprobe로 검증

## 결정 필요

- 길이: 음악 전 길이 41초(권장) vs 기획안 그대로 15초 컷
- 산출물 위치: Downloads\potata-teaser(권장) vs 다른 폴더
