import { defineConfig } from "vitest/config";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.e2e" });

export default defineConfig({
  test: {
    include: ["test/e2e/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
