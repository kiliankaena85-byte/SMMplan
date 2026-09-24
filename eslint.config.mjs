import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@next/next": {
        rules: {
          "no-img-element": { create: () => ({}) }
        }
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-control-regex": "off",
      "no-useless-assignment": "off",
      "no-useless-escape": "off",
      "no-case-declarations": "off",
      "no-empty": "warn",
      "no-misleading-character-class": "off",
      "preserve-caught-error": "off"
    }
  },
  {
    files: [
      "test/**/*.ts",
      "test/**/*.tsx",
      "e2e/**/*.ts",
      "scripts/**/*.ts",
      "scripts/**/*.js",
      "scripts/**/*.mjs",
      "prisma/**/*.ts",
      "*.ts",
      "*.mjs",
      "src/**/__tests__/**/*.ts",
      "src/**/__tests__/**/*.tsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.spec.ts",
      "src/**/*.spec.tsx"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off"
    }
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "out/**",
      "build/**",
      "scratch/**",
      ".agents/**",
      ".agent/**",
      "dist_patch/**",
      "scripts/**",
      "test/**",
      "tests/**",
      "test-results/**",
      "playwright-report/**",
      "teamwork_projects/**",
      "test*.js",
      "test-async-throw.ts",
      "test-floating-promise.ts"
    ]
  }
);
