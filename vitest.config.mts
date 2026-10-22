import { defineConfig } from "vitest/config";

// One run for every workspace package; the old game's checks stay in tools/ and run with node.
export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts", "apps/*/src/**/*.test.ts", "apps/web/game/**/*.test.ts"],
  },
});
