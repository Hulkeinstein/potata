// ===== 실행 진입점 (항상 마지막 파일) =====
try { runAll(); }
catch (eTop) { log("FATAL: " + eTop.toString() + " (line " + eTop.line + ")"); writeLog(); }
