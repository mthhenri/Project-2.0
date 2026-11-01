export default {
    customSyntax: 'postcss-scss',
    ignoreFiles: ['**/node_modules/**', '**/dist/**', '**/.angular/**', '.artifacts/**'],
    rules: {
        'block-no-empty': true,
        'color-no-invalid-hex': true,
        'declaration-block-no-duplicate-properties': [true, { ignore: ['consecutive-duplicates-with-different-values'] }],
        'property-no-unknown': true,
        'unit-no-unknown': true,
        'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'host', 'host-context', 'ng-deep'] }],
        'selector-pseudo-element-no-unknown': [true, { ignorePseudoElements: ['ng-deep'] }],
        'at-rule-no-unknown': [true, { ignoreAtRules: ['tailwind', 'apply', 'layer', 'use', 'forward', 'mixin', 'include', 'function', 'return', 'if', 'else', 'each', 'for', 'while', 'extend', 'at-root', 'debug', 'warn', 'error'] }],
    },
};
