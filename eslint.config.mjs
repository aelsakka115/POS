// Minimal repository-wide lint config. Intentionally basic per Phase 6 scope
// (Repository-Bootstrap-Plan.md) — no Prettier integration, no React-specific
// plugin rules yet. Extended when a real domain's frontend work needs more.
import js from "@eslint/js";
import { createConfig as createBoundariesConfig } from "eslint-plugin-boundaries/config";
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
    settings: {
      "import/resolver": {
        typescript: {
          project: [
            "apps/backend/tsconfig.json",
            "apps/web/tsconfig.json",
            "packages/domain-contracts/tsconfig.json",
            "packages/ui/tsconfig.json",
          ],
          noWarnOnMultipleProjects: true,
        },
      },
    },
  },
  createBoundariesConfig({
    files: [
      "apps/backend/**/*.ts",
      "apps/web/src/**/*.{ts,tsx}",
      "packages/domain-contracts/src/**/*.ts",
      "packages/ui/src/**/*.ts",
    ],
    settings: {
      "boundaries/elements": [
        {
          type: "web",
          pattern: "apps/web/src",
        },
        {
          type: "domain-contracts",
          pattern: "packages/domain-contracts/src",
        },
        {
          type: "ui",
          pattern: "packages/ui/src",
        },
        {
          type: "backend-domain",
          pattern: "apps/backend/(*)/domain",
          capture: ["module"],
        },
        {
          type: "backend-application",
          pattern: "apps/backend/(*)/application",
          capture: ["module"],
        },
        {
          type: "backend-infrastructure",
          pattern: "apps/backend/(*)/infrastructure",
          capture: ["module"],
        },
        {
          type: "backend-api",
          pattern: "apps/backend/(*)/api",
          capture: ["module"],
        },
      ],
      // npm workspaces expose local packages through node_modules symlinks.
      // Resolve those imports back to their repository elements so the rules
      // below actually inspect @cafe-engine/* dependencies.
      "boundaries/flag-as-external": {
        inNodeModules: false,
      },
      "boundaries/legacy-templates": false,
    },
    rules: {
      "boundaries/no-unknown-files": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          // Known local source files are classified by no-unknown-files.
          // Unknown local resolutions are third-party packages and are not
          // part of RFC-004's repository dependency matrix.
          checkUnknownLocals: false,
          checkInternals: true,
          rules: [
            // RFC-004 §5: shared is inward-most and cannot depend on a
            // business domain (or platform).
            {
              from: { type: "backend-*", captured: { module: "shared" } },
              allow: [
                { to: { type: "backend-*", captured: { module: "shared" } } },
                { to: { type: "domain-contracts" } },
              ],
            },
            // Platform may use only its own code, shared, and the shared
            // domain contracts.
            {
              from: {
                type: "backend-*",
                captured: { module: "platform" },
              },
              allow: [
                {
                  to: {
                    type: "backend-*",
                    captured: { module: ["platform", "shared"] },
                  },
                },
                { to: { type: "domain-contracts" } },
              ],
            },
            // Every business domain may use itself, shared, platform, and
            // domain-contracts. The captured module makes this rule apply to
            // future domains without permitting direct cross-domain imports.
            {
              from: {
                type: "backend-*",
                captured: { module: "!(shared|platform)" },
              },
              allow: [
                {
                  to: {
                    type: "backend-*",
                    captured: {
                      module: [
                        "shared",
                        "platform",
                        "{{ from.captured.module }}",
                      ],
                    },
                  },
                },
                { to: { type: "domain-contracts" } },
              ],
            },
            // RFC-004 §5.1: enforce inward-only dependencies inside each
            // backend module while still allowing imports within a layer.
            {
              from: { type: "backend-domain" },
              disallow: {
                to: {
                  type: [
                    "backend-application",
                    "backend-infrastructure",
                    "backend-api",
                  ],
                  captured: {
                    module: "{{ from.captured.module }}",
                  },
                },
              },
            },
            {
              from: { type: "backend-application" },
              disallow: {
                to: {
                  type: ["backend-infrastructure", "backend-api"],
                  captured: {
                    module: "{{ from.captured.module }}",
                  },
                },
              },
            },
            {
              from: { type: "backend-infrastructure" },
              disallow: {
                to: {
                  type: ["backend-application", "backend-api"],
                  captured: {
                    module: "{{ from.captured.module }}",
                  },
                },
              },
            },
            {
              from: { type: "backend-api" },
              disallow: {
                to: {
                  type: ["backend-domain", "backend-infrastructure"],
                  captured: {
                    module: "{{ from.captured.module }}",
                  },
                },
              },
            },
            {
              from: { type: "domain-contracts" },
              allow: { to: { type: "domain-contracts" } },
            },
            // The browser application consumes packages only. apps/backend
            // is deliberately absent, so any such import fails closed.
            {
              from: { type: "web" },
              allow: [
                { to: { type: "web" } },
                { to: { type: "ui" } },
                { to: { type: "domain-contracts" } },
              ],
            },
            {
              from: { type: "ui" },
              allow: { to: { type: "ui" } },
            },
          ],
        },
      ],
    },
  }),
);
