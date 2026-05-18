import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'jsdom',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			reportsDirectory: 'coverage',
			include: ['src/**/*.{ts,svelte}'],
			exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/app.d.ts']
		}
	}
});
