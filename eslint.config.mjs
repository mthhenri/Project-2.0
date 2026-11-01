import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import stylistic from '@stylistic/eslint-plugin';
import regras from './scripts/eslint/regras.mjs';

export default tseslint.config(
    {
        ignores: ['**/node_modules/**', '**/dist/**', '**/release/**', '**/out-tsc/**', '**/.angular/**', '**/coverage/**', '.artifacts/**', 'docs/**', '.agents/**', '.claude/**', '.superpowers/**'],
    },
    {
        files: ['**/*.ts', '**/*.js', '**/*.mjs', '**/*.cjs'],
        extends: [eslint.configs.recommended],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
        plugins: { '@stylistic': stylistic, project: regras },
        rules: {
            '@stylistic/indent': ['error', 4, { SwitchCase: 1 }],
            '@stylistic/no-tabs': 'error',
            '@stylistic/semi': ['error', 'always'],
            'project/descriptive-identifiers': 'error',
        },
    },
    {
        files: ['**/*.ts'],
        extends: [...tseslint.configs.recommended],
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
            '@typescript-eslint/naming-convention': [
                'error',
                { selector: 'variableLike', format: ['camelCase', 'PascalCase', 'UPPER_CASE'], leadingUnderscore: 'allow' },
                { selector: 'typeLike', format: ['PascalCase'] },
            ],
        },
    },
    {
        // Dublês de teste e suporte de teste moldam conexões do Knex, clientes de busca e corpos de resposta que não têm tipo exportado.
        files: ['**/*.test.ts', '**/*.spec.ts', 'backend/src/testes/**/*.ts'],
        rules: { '@typescript-eslint/no-explicit-any': 'off' },
    },
    {
        files: ['frontend/src/**/*.ts'],
        extends: [...angular.configs.tsRecommended],
        rules: {
            '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
            '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
            'project/separate-component-files': 'error',
        },
    },
    {
        files: ['frontend/src/**/*.html'],
        extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
        rules: {
            '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }],
            // `[style]="{ width: '40rem' }"` num p-dialog é o input do componente PrimeNG, não o atributo HTML: a regra não os distingue.
            '@angular-eslint/template/no-inline-styles': 'off',
            // Acessibilidade de teclado e rótulo em controles PrimeNG muda comportamento e foco: fica para uma task própria (PROBLEMS.md P-066).
            '@angular-eslint/template/label-has-associated-control': 'off',
            '@angular-eslint/template/click-events-have-key-events': 'off',
            '@angular-eslint/template/interactive-supports-focus': 'off',
        },
    },
);
