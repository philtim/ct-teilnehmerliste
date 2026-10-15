import pluginVue from 'eslint-plugin-vue';
import vueTsConfig from '@vue/eslint-config-typescript';
import prettierConfig from '@vue/eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        name: 'app/files-to-lint',
        files: ['**/*.{ts,mts,tsx,vue}'],
    },
    {
        name: 'app/files-to-ignore',
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/releases/**',
            'src/shared/ct-types.d.ts',
            'src/shared/ct-types.generated.d.ts',
        ],
    },
    ...pluginVue.configs['flat/recommended'],
    ...vueTsConfig(),
    prettierConfig,
    {
        name: 'app/rules',
        rules: {
            // Page-level components (App, Example, ...) are unlikely to clash
            // with native HTML elements; the warning adds noise without value.
            'vue/multi-word-component-names': 'off',
            // Single-seam rule: only src/shared/api/ may import the raw client.
            // Everything else uses `@/shared/api` (which adds timeout + error
            // normalization) or goes through a feature's *.api.ts file.
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: '@churchtools/churchtools-client',
                            message:
                                'Import via "@/shared/api" — only src/shared/api/ may import the raw client.',
                        },
                    ],
                },
            ],
        },
    },
    {
        // Allow the shared API layer to import the raw client.
        name: 'app/api-layer-exception',
        files: ['src/shared/api/**/*.ts'],
        rules: {
            'no-restricted-imports': 'off',
        },
    },
];
