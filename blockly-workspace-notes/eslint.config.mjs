/**
 * @fileoverview ESLint configuration.
 *
 * Blockly publishes `@blockly/eslint-config`, but it still peers on ESLint 7
 * and pulls in the deprecated `babel-eslint`, so this reproduces the house
 * style it encodes — Google-ish source with mandatory documentation — on a
 * current toolchain instead.
 *
 * The source is TypeScript and the tests are JavaScript, which is not a
 * stylistic choice: `@blockly/dev-scripts` finds test entry points with a
 * literal `.mocha.js` filename filter, so a `.mocha.ts` suite is silently
 * skipped and `npm test` passes having run nothing. The two `files` blocks
 * below reflect that split.
 *
 * Formatting rules are left entirely to Prettier: `eslint-config-prettier`
 * goes last and switches off everything the two would otherwise argue about.
 */

import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'build/**', 'node_modules/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsdoc.configs['flat/recommended'],

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {jsdoc},
    settings: {
      jsdoc: {
        // Blockly writes @fileoverview in every core file; the plugin's
        // default is to rewrite it to @file. Invert that preference.
        tagNamePreference: {file: 'fileoverview'},
        mode: 'typescript',
      },
    },
    rules: {
      // Correctness.
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', {null: 'ignore'}],
      'no-throw-literal': 'error',
      'no-implicit-coercion': ['error', {boolean: false}],

      // The base rule double-reports on type-only imports and on enum-like
      // declarations, so the TypeScript-aware version replaces it.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],

      // Blockly documents every exported symbol, and so does this package —
      // but the types now live in the signatures, so the doc comment carries
      // the prose and nothing else.
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
          },
        },
      ],
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-description': 'error',

      // Types belong to the compiler now. `no-types` is what keeps the old
      // Closure annotations from creeping back in beside the real ones.
      'jsdoc/no-types': 'error',
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',

      'jsdoc/require-description-complete-sentence': 'off',
      'jsdoc/tag-lines': 'off',
    },
  },

  {
    // The playground and the mocha suites are development-only entry points,
    // and are JavaScript for the toolchain reason described above.
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.mocha,
      },
    },
    rules: {
      // Test callbacks are self-describing; requiring JSDoc on every suite
      // and case would be noise rather than documentation.
      'jsdoc/require-jsdoc': 'off',
      // The suites are plain JavaScript, so their doc comments still carry
      // types where they help.
      'jsdoc/no-types': 'off',
    },
  },

  prettier,
];
