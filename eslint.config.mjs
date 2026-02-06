// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';

export default tseslint.config(
	// Base recommended configs
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...eslintPluginAstro.configs['flat/recommended'],

	// Ignore patterns
	{
		ignores: ['dist/', '.astro/', 'node_modules/', 'public/'],
	},

	// Global settings for all files
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},

	// TypeScript files - strict type checking
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},

	// Astro files
	{
		files: ['**/*.astro'],
		languageOptions: {
			parserOptions: {
				parser: '@typescript-eslint/parser',
			},
		},
	},

	// JavaScript/MJS files - basic linting only
	{
		files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
		rules: {
			'no-console': ['warn', { allow: ['warn', 'error'] }],
		},
	}
);
