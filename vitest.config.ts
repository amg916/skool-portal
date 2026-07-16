import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // Every suite shares one test database; parallel truncates would race.
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? "",
      DATABASE_URL_TEST: process.env.DATABASE_URL_TEST ?? "",
    },
  },
});
