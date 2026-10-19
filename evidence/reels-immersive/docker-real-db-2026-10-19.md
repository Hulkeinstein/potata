# 로컬 Docker DB 복구 — 2026-10-19

## 조사 및 변경 장부
- H1 Docker 엔진이 꺼짐: 초기 `docker info`는 named pipe 없음, Docker Desktop/backend 프로세스 없음.
- H2 기존 DB 컨테이너만 중지: 엔진 연결 전에는 판정 불가.
- H3 Windows 임시 소켓 재발: 현재 최신 시작 로그를 확인한 뒤에만 처리.
- 기존 `docker_data.vhdx` 크기 13,391,364,096 bytes 확인. 삭제/초기화/seed/migration/운영 접속 금지.
- 예정: 공식 Docker Desktop 숨김 실행 → 기존 컨테이너/volume/pg_isready 확인. 재발 시 정확한 임시 경로만 보존 이름 변경.
- 임시 스크립트/fixture 생성 없음. Desktop/기존 DB는 QA를 위해 켜둠.

## 결과
- 최초 Desktop 실행 후 최신 로그 `2026-10-19T17:43:36Z`에서 `sailor-ingest.sock` 제거 실패(`The file cannot be accessed by the system`) 재현. H3 확인.
- Docker 공식 stop을 bounded 실행한 뒤 Docker 전용 PID만 제한 종료. 비동기 종료 직후 남은 프로세스 guard로 한 번 중단했고, 다음 조회에서 Docker 프로세스 0 확인 후 진행했다.
- 검증된 임시 경로 `Docker/run`, `docker-secrets-engine`만 각각 suffix `preserved-20261019-restore`로 보존 rename. 삭제하지 않았고 DB VHD/volume 미변경.
- 재시작 후 Docker Engine `29.7.2` API 응답 정상.
- 기존 `potata-dev-postgres` running, port `5432/tcp -> 127.0.0.1:5432`.
- 기존 volume `potata-dev-postgres-data` → `/var/lib/postgresql/data` 유지.
- `pg_isready -h 127.0.0.1 -p 5432`: `accepting connections`, exit 0.
- Prisma 조회 전 DATABASE_URL이 localhost/127.0.0.1, DB 이름 `potata_dev`인지 guard. 접속 성공, 상품 9개 읽기 완료. 개인 정보/연결 비밀값 출력 없음.

| Product ID | AED price | images length | variant count | stock total |
|---|---:|---:|---:|---:|
| 1 | 719 | 1 | 5 | 25 |
| 2 | 685 | 1 | 10 | 50 |
| 3 | 179 | 1 | 1 | 5 |
| 4 | 369 | 1 | 4 | 20 |
| 5 | 95 | 1 | 1 | 5 |
| 6 | 99 | 1 | 4 | 20 |
| 7 | 69 | 1 | 1 | 5 |
| 8 | 279 | 1 | 6 | 30 |
| 9 | 80 | 1 | 8 | 40 |

- 총 40개 옵션/재고 200개. 다른 rehearsal 컨테이너는 종료 상태 유지, 새 DB/seed/reset/migration/운영 접속/환경 변경/commit/push 미실행.
- Docker와 기존 DB는 사용자 QA용으로 유지. 실제 cold-cache For You 브라우저 검증은 부모 작업에서 별도 수행.
