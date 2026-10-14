/**
 * 5xx 응답에 쓰는 공통 문구. 내부 오류 메시지(Prisma·DB·설정 힌트)는 익명 클라이언트에게 보내지 않고
 * 각 route 의 최상위 catch 가 console.error 로 서버 로그에만 남긴다.
 * 4xx(검증·권한·충돌·한도)처럼 의도한 사용자 안내 문구는 각 route 가 그대로 쓴다.
 */
export const INTERNAL_ERROR_MESSAGE = "서버 오류가 발생했습니다.";
