import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import noHexLiterals from './scripts/checks/eslint/no-hex-literals.mjs';

// ADR-014: native controls belong in @simplify-dev/ui, not app/module source.
// packages/ui/src is deliberately outside these file patterns.
const restrictedIntrinsicSelectors = [
  'select',
  'option',
  'input',
  'textarea',
  'button',
  'a',
  'dialog',
  'details',
  'summary',
].map((tag) => ({
  selector: `JSXOpeningElement[name.name='${tag}']`,
  message: `Use the @simplify-dev/ui component instead of the native <${tag}> element (ADR-014).`,
}));

export default tseslint.config(
  {
    ignores: [
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Only package-qualified specifiers cross a package boundary; a
              // relative `../internal/...` import stays inside its own package
              // and is that package's private implementation detail. ESLint
              // matches `group` with gitignore semantics (`allowRelativePaths`),
              // which cannot reliably distinguish `./` and `../` from package
              // names, so anchor on the raw specifier with a regex instead.
              regex: '^(?!\\.{1,2}/)(?:@[^/]+/[^/]+/|[^./][^/]*/)internal/',
              message: 'Do not import another package internal path. Use its public entry point.',
            },
          ],
        },
      ],
    },
  },
  {
    // Report-only: ADR-014 design-system-only controls.
    files: ['apps/web/**/*.{js,jsx,ts,tsx}', 'modules/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['warn', ...restrictedIntrinsicSelectors],
    },
  },
  {
    // Report-only: ADR-003 raw hex colours; token sources are not matched.
    files: ['apps/web/**/*.{ts,tsx}', 'modules/**/*.{ts,tsx}', 'packages/ui/src/**/*.{ts,tsx}'],
    plugins: {
      'simplify-gates': {
        rules: { 'no-hex-literals': noHexLiterals },
      },
    },
    rules: {
      'simplify-gates/no-hex-literals': 'warn',
    },
  },
  prettier,
);
