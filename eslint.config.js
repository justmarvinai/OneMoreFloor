import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * Lint rules that mechanically enforce the project's hard rules (CLAUDE.md).
 * Where the brief says "never", there is a rule here rather than a convention.
 */

// Brief §20.4: native browser tooltips are forbidden anywhere in the project.
// `h()` can only reach a real DOM attribute through its `attrs` bag, so these
// three shapes are the complete set of ways a native title could be set.
const NO_NATIVE_TITLE = [
  {
    selector: "CallExpression[callee.property.name='setAttribute'][arguments.0.value='title']",
    message:
      'Native title tooltips are forbidden (Brief §20.4). Use the FantasyUI Tooltip component.',
  },
  {
    selector: "Property[key.name='attrs'] > ObjectExpression > Property[key.name='title']",
    message:
      'Native title tooltips are forbidden (Brief §20.4). Use the FantasyUI Tooltip component.',
  },
  {
    selector: "AssignmentExpression[left.type='MemberExpression'][left.property.name='title']",
    message:
      'Native title tooltips are forbidden (Brief §20.4). Use the FantasyUI Tooltip component.',
  },
];

// ARCHITECTURE §5: game outcomes must be deterministic and replayable, and every
// wall-clock read must pass through the tamper-damped clock service.
const NO_AMBIENT_NONDETERMINISM = [
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
    message: 'Math.random() is banned in game code — draw from a seeded stream in app/rng.ts.',
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: 'Date.now() is banned in game code — read the clock service in app/time.ts.',
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: 'new Date() is banned in game code — read the clock service in app/time.ts.',
  },
];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      // Vendored FantasyUI is third-party source: it is typechecked and shipped,
      // but never restyled locally — fixes go upstream (CLAUDE.md).
      'src/ui/fui/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    files: ['**/*.ts', '**/*.mjs', '**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-syntax': ['error', ...NO_NATIVE_TITLE, ...NO_AMBIENT_NONDETERMINISM],
    },
  },

  // The two modules that are *allowed* to touch ambient non-determinism, because
  // owning it is their whole job. Everything else goes through them.
  {
    files: ['src/app/rng.ts', 'src/app/time.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...NO_NATIVE_TITLE],
    },
  },

  // Tests may reach for real time and randomness to verify the seams themselves.
  {
    files: ['**/*.test.ts', 'tests/**/*.ts', 'tools/**/*.mjs'],
    rules: {
      'no-restricted-syntax': ['error', ...NO_NATIVE_TITLE],
      'no-console': 'off',
    },
  },

  // ARCHITECTURE §3: the load-bearing import boundary. Game logic and content data
  // never reach into presentation or persistence.
  {
    files: ['src/domain/**/*.ts', 'src/content/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/ui', '@/ui/**', '**/ui/**'],
              message: 'domain/ and content/ must never import ui/ (ARCHITECTURE §3).',
            },
            {
              group: ['@/save', '@/save/**', '**/save/**'],
              message: 'domain/ and content/ must never import save/ (ARCHITECTURE §3).',
            },
          ],
        },
      ],
    },
  },
);
