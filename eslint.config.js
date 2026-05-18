import svelteConfig from './svelte.config.js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';

export default defineConfig(
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		rules: {
			// We use plain href strings, not SvelteKit resolve()
			'svelte/no-navigation-without-resolve': 'off',
			// {@html} is expected for markdown rendering
			'svelte/no-at-html-tags': 'warn',
			// Each keys are good practice but not blocking
			'svelte/require-each-key': 'warn'
		}
	},
	{
		ignores: [
			'.svelte-kit/',
			'build/',
			'dist/',
			'node_modules/',
			'package/',
			'.engineering-team/',
			'coverage/'
		]
	}
);
