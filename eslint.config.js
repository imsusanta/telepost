import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "assets/**", "coverage/**", "supabase/**", "scripts/**", "public/**", "dev-dist/**", "*.html", "*.js", "*.cjs", "*.mjs"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "prefer-const": "error",
      "no-useless-escape": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: [
      "src/pages/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/components/TelegramShareQuestionBank.tsx",
      "src/components/AIGeneratedQuestionsList.tsx",
      "src/components/AutoScheduleCard.tsx",
      "src/components/QuestionFilters.tsx",
      "src/components/SuperAdminRoute.tsx",
      "src/components/TaxonomyManagement.tsx",
      "src/components/TelegramShare.tsx",
    ],
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
);
