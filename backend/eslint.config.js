// @ts-check
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')
const boundaries = require('eslint-plugin-boundaries')

const TEST_FILES = [
  'src/**/*.test.ts',
  'src/**/*.repository.test.ts',
  'src/**/*.integration.test.ts',
  'src/__tests__/**',
  'src/__mocks__/**',
]

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  // ── TypeScript rules (production code only) ──────────────────────────────
  {
    files: ['src/**/*.ts'],
    ignores: TEST_FILES,
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs['recommended'].rules,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // ── Hexagonal architecture boundary rules (production code only) ─────────
  //
  // Permitted import matrix:
  //   domain         → (nothing)
  //   application    → domain
  //   infrastructure → domain, application
  //   adapters       → domain, application
  //   main           → all layers  (composition root — index.ts)
  {
    files: ['src/**/*.ts'],
    ignores: TEST_FILES,
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
      'boundaries/elements': [
        { type: 'domain',         pattern: '**/domain/**'         },
        { type: 'application',    pattern: '**/application/**'    },
        { type: 'infrastructure', pattern: '**/infrastructure/**' },
        { type: 'adapters',       pattern: '**/adapters/**'       },
      ],
    },
    rules: {
      'boundaries/dependencies': ['error', {
        default: 'disallow',
        rules: [
          { from: { type: 'domain' },         allow: []                                                                                                      },
          { from: { type: 'application' },    allow: [{ to: { type: 'domain' } }, { to: { type: 'application' } }]                                            },
          { from: { type: 'infrastructure' }, allow: [{ to: { type: 'domain' } }, { to: { type: 'application' } }, { to: { type: 'infrastructure' } }]         },
          { from: { type: 'adapters' },       allow: [{ to: { type: 'domain' } }, { to: { type: 'application' } }, { to: { type: 'adapters' } }]               },
        ],
      }],
    },
  },
]
