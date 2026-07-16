// Minimal repository-wide lint config. Intentionally basic per Phase 6 scope
// (Repository-Bootstrap-Plan.md) — no Prettier integration, no React-specific
// plugin rules yet. Extended when a real domain's frontend work needs more.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.tsbuildinfo",
      "**/coverage/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
);
