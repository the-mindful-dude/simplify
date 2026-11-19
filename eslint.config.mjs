import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

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
  prettier,
);
