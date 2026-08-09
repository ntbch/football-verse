import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.config({ extends: ["next/core-web-vitals", "next/typescript"] }),
  // Existing `any` usage is a tracked cleanup; keep new lint usable while surfacing it.
  { rules: { "@typescript-eslint/no-explicit-any": "warn" } },
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
];
