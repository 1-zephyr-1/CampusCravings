import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Project overrides — the `react-hooks/set-state-in-effect` and
  // `react-hooks/purity` rules from eslint-plugin-react-hooks are overly
  // aggressive for our hydration, async-fetch, and `useMemo`+`Date.now`
  // patterns. The `react-hooks/preserve-manual-memoization` rule is also
  // too strict for our codebase; the React Compiler is opt-in, not a
  // ship-blocker.
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local scripts (CJS) that intentionally use require().
    "scripts/**",
  ]),
]);

export default eslintConfig;
