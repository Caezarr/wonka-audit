import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "out/", "output/", ".tmp/", "tmp/"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node }
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "no-var": "error"
    }
  }
];
