// Lint for the game.
// eslint-config-next is not used: three of its plugins (react, import, jsx-a11y) accept ESLint up
// to 9, which is out of support; its Next.js and React hooks rules are taken directly.
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.next/**", "**/next-env.d.ts"] },
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
  // The simulation gives the same match in every engine only with the functions of
  // packages/sim/src/fmath.ts and the match's own generator (docs/DETTAGLI.md, "Gioco nuovo · fase 1").
  {
    files: ["packages/sim/src/**/*.ts"],
    ignores: ["packages/sim/src/**/*.test.ts"],
    rules: {
      "no-restricted-properties": ["error",
        ...["sin", "cos", "tan", "asin", "acos", "atan", "atan2", "sinh", "cosh", "tanh", "exp", "expm1", "log", "log1p", "log2", "log10", "pow", "cbrt", "hypot"]
          .map((property) => ({ object: "Math", property, message: "differs between engines: use src/fmath.ts" })),
        { object: "Math", property: "random", message: "the match draws from its own generator (m.rng)" },
      ],
      "no-restricted-syntax": ["error", { selector: "BinaryExpression[operator='**']", message: "differs between engines: multiply" }],
    },
  },
);
