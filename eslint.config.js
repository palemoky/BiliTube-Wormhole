import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.wxt/**',
      '**/.output/**',
      '**/coverage/**',
      '**/.tsbuildinfo',
      '**/bun.lock',
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules (not type-checked for now)
  ...tseslint.configs.recommended,

  // Project-specific configuration
  {
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Allow 'any' in API code where external data types are unknown
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Allow non-null assertions where we have runtime guarantees
      '@typescript-eslint/no-non-null-assertion': 'off',

      // General rules
      'no-console': 'off', // Allow console in Node.js scripts
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Browser extension specific overrides
  {
    files: ['entrypoints/**/*.ts', 'entrypoints/**/*.tsx'],
    rules: {
      // Content scripts and background scripts need console for debugging
      'no-console': 'off',
    },
  },

  // Test files overrides
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Worker files
  {
    files: ['worker/**/*.ts'],
    languageOptions: {
      globals: {
        // Cloudflare Workers globals
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        fetch: 'readonly',
      },
    },
  }
);
