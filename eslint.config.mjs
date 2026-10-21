// Lint for the new game. web/ and tools/ are the old game and its checks, which stay as they are.
// eslint-config-next is not used: three of its plugins (react, import, jsx-a11y) accept ESLint up
// to 9, which is out of support; its Next.js and React hooks rules are taken directly.
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["web/**", "tools/**", "dist-web/**", "**/dist/**", "**/.next/**", "**/next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs}"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    ...nextPlugin.configs["core-web-vitals"],
    settings: { next: { rootDir: "apps/web" } },
    languageOptions: { globals: { ...globals.browser } },
  },
  { files: ["apps/web/**/*.{ts,tsx}"], ...reactHooks.configs.flat.recommended },
);
