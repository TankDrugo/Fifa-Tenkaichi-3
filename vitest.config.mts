import { defineConfig } from "vitest/config";

// One run for every workspace package.
export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts", "apps/*/src/**/*.test.ts", "apps/web/game/**/*.test.ts"],
  },
});
