import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

/** Configuración plana requerida por ESLint 9. */
export default [
  {
    ignores: ['dist/**', 'dist-demo/**', 'dist-electron/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // TypeScript ya resuelve los tipos; la regla base da falsos positivos con JSX.
      'no-unused-vars': 'off',
      // El prefijo _ declara "deliberadamente sin usar", en argumentos y variables.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-undef': 'off',
    },
  },
  {
    // Configuración del proyecto: ESM (package.json declara "type": "module").
    files: ['*.config.js', '*.config.ts', 'eslint.config.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    // Proceso principal de Electron: CommonJS sobre Node.
    files: ['electron/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
];
