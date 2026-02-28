import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Build artifacts
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",

    // Next / TS generated files
    "next-env.d.ts",

    // Dependency folders
    "node_modules/**",

    // AI worktrees / local tooling
    ".claude/**",
    ".claire/**",

    // Nested occurrences (monorepo / worktrees)
    "**/.next/**",
    "**/node_modules/**",
    "**/.claude/**",
    "**/.claire/**",
  ]),
]);

export default eslintConfig;
