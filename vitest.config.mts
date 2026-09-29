import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // server-only는 Next 빌드가 해석한다 — 테스트에서는 빈 모듈로 대체(stub 파일의 주석 참고).
    alias: { "server-only": new URL("./test/stubs/server-only.ts", import.meta.url).pathname },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
  },
});
