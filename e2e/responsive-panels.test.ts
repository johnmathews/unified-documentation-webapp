import { test, expect, type Page } from '@playwright/test';

// --- Viewport presets -----------------------------------------------------------
const IPHONE_PORTRAIT = { width: 390, height: 844 };
const IPHONE_LANDSCAPE = { width: 844, height: 390 };
const TABLET_PORTRAIT = { width: 768, height: 1024 };
const DESKTOP = { width: 1280, height: 800 };

// --- Helpers --------------------------------------------------------------------

const sidebar = (page: Page) => page.locator('aside.sidebar');
const toggleBtn = (page: Page) => page.getByTitle('Toggle sidebar');
const backdrop = (page: Page) => page.locator('button.backdrop');
const content = (page: Page) => page.locator('main.content');

/**
 * Whether the sidebar is visually on-screen.
 * Checks boundingBox — if off-screen via translateX(-100%), its right edge is at x=0 or less.
 */
async function isSidebarVisible(page: Page): Promise<boolean> {
	const box = await sidebar(page).boundingBox();
	if (!box) return false;
	return box.x + box.width > 0;
}

// NOTE: sidebarOpen defaults to true — the sidebar starts open on ALL viewports.
// On mobile/tablet it overlays as a fixed panel; on desktop it's in the layout flow.

// =================================================================================
// REGRESSION: Sidebar must open AND close on mobile portrait
// =================================================================================
// Bug: CSS at max-width:600px set `transform: translateX(0)` on `.sidebar`,
// overriding the `translateX(-100%)` hide state from the 1024px query.
// Result: sidebar was always visible; toggle only affected the backdrop dimming.

test.describe('Mobile portrait sidebar', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('sidebar is visible by default (sidebarOpen=true)', async ({ page }) => {
		expect(await isSidebarVisible(page)).toBe(true);
	});

	test('toggle button closes the sidebar', async ({ page }) => {
		// Sidebar starts open; first click should close it
		await toggleBtn(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);
		expect(await isSidebarVisible(page)).toBe(false);
	});

	test('toggle button reopens the sidebar after closing', async ({ page }) => {
		// Close
		await toggleBtn(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);
		expect(await isSidebarVisible(page)).toBe(false);

		// Reopen
		await toggleBtn(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);
		expect(await isSidebarVisible(page)).toBe(true);
	});

	test('backdrop present when sidebar open, gone when closed', async ({ page }) => {
		// Starts open — backdrop should be present on mobile
		expect(await backdrop(page).count()).toBe(1);

		// Close sidebar — backdrop should disappear
		await toggleBtn(page).click();
		await expect(backdrop(page)).toHaveCount(0);
	});

	test('backdrop is behind full-width sidebar on mobile (not clickable)', async ({ page }) => {
		// With 100% width sidebar, the backdrop is completely covered.
		// Users close via the toggle button or by selecting a document.
		expect(await isSidebarVisible(page)).toBe(true);
		expect(await backdrop(page).count()).toBe(1);

		// The backdrop is not actionable when sidebar is full-width — verify
		// the toggle button is the way to close instead.
		await toggleBtn(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);
		expect(await isSidebarVisible(page)).toBe(false);
		expect(await backdrop(page).count()).toBe(0);
	});

	test('sidebar takes full viewport width on mobile', async ({ page }) => {
		const box = await sidebar(page).boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeGreaterThanOrEqual(IPHONE_PORTRAIT.width - 2);
	});

	test('content is accessible after sidebar closes', async ({ page }) => {
		await toggleBtn(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		const box = await content(page).boundingBox();
		expect(box).toBeTruthy();
		expect(box!.width).toBeGreaterThan(0);
	});
});

// =================================================================================
// Mobile landscape
// =================================================================================

test.describe('Mobile landscape sidebar', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(IPHONE_LANDSCAPE);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('sidebar opens and closes correctly in landscape', async ({ page }) => {
		// Starts open
		expect(await isSidebarVisible(page)).toBe(true);

		// Close
		await toggleBtn(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);
		expect(await isSidebarVisible(page)).toBe(false);

		// Reopen
		await toggleBtn(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);
		expect(await isSidebarVisible(page)).toBe(true);
	});
});

// =================================================================================
// Tablet — sidebar uses slide animation (1024px breakpoint)
// =================================================================================

test.describe('Tablet sidebar', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(TABLET_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('sidebar opens and closes with slide animation', async ({ page }) => {
		expect(await isSidebarVisible(page)).toBe(true);

		// Close
		await toggleBtn(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);
		expect(await isSidebarVisible(page)).toBe(false);

		// Reopen
		await toggleBtn(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);
		expect(await isSidebarVisible(page)).toBe(true);
	});
});

// =================================================================================
// Desktop — sidebar is part of the flow, not an overlay
// =================================================================================

test.describe('Desktop sidebar', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize(DESKTOP);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('sidebar is visible by default', async ({ page }) => {
		expect(await isSidebarVisible(page)).toBe(true);
	});

	test('no backdrop on desktop', async ({ page }) => {
		expect(await backdrop(page).count()).toBe(0);
	});

	test('toggle hides sidebar on desktop', async ({ page }) => {
		await toggleBtn(page).click();
		// Desktop uses display:none, not transform
		await page.waitForTimeout(100);
		expect(await isSidebarVisible(page)).toBe(false);
	});
});

// =================================================================================
// CSS property regression guards
// =================================================================================
// These tests directly check computed CSS values to catch the exact class of bug
// we hit: one media query overriding another's transform/display/visibility rules.

test.describe('CSS property regression', () => {
	test('mobile: closed sidebar has negative translateX', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Close the sidebar (it starts open)
		await toggleBtn(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		const transform = await sidebar(page).evaluate(
			(el) => getComputedStyle(el).transform
		);
		// translateX(-100%) computes to matrix(1, 0, 0, 1, -<width>, 0)
		expect(transform).not.toBe('none');
		const match = transform.match(/matrix\(([^)]+)\)/);
		expect(match).toBeTruthy();
		const tx = parseFloat(match![1].split(',')[4].trim());
		expect(tx).toBeLessThan(0);
	});

	test('mobile: open sidebar has translateX(0)', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Sidebar starts open — check its transform
		const transform = await sidebar(page).evaluate(
			(el) => getComputedStyle(el).transform
		);
		// translateX(0) computes to matrix(1,0,0,1,0,0) or 'none'
		if (transform && transform !== 'none') {
			const match = transform.match(/matrix\(([^)]+)\)/);
			if (match) {
				const tx = parseFloat(match[1].split(',')[4].trim());
				expect(tx).toBe(0);
			}
		}
	});

	test('mobile: sidebar width is 100% of viewport', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const width = await sidebar(page).evaluate(
			(el) => getComputedStyle(el).width
		);
		const widthPx = parseFloat(width);
		expect(widthPx).toBeGreaterThanOrEqual(IPHONE_PORTRAIT.width - 2);
	});

	test('tablet: sidebar is narrower than viewport', async ({ page }) => {
		await page.setViewportSize(TABLET_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const width = await sidebar(page).evaluate(
			(el) => getComputedStyle(el).width
		);
		const widthPx = parseFloat(width);
		expect(widthPx).toBeLessThan(TABLET_PORTRAIT.width);
	});

	test('mobile: sidebar stays in DOM when closed (display is not none)', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Close
		await toggleBtn(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);

		// Must remain display:flex for the CSS transition to animate
		const display = await sidebar(page).evaluate(
			(el) => getComputedStyle(el).display
		);
		expect(display).toBe('flex');
	});
});

// =================================================================================
// Viewport resize — transitioning between breakpoints shouldn't break state
// =================================================================================

test.describe('Viewport resize transitions', () => {
	test('open sidebar survives portrait-to-landscape rotation', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		// Sidebar starts open
		expect(await isSidebarVisible(page)).toBe(true);

		// Rotate to landscape — should still be visible
		await page.setViewportSize(IPHONE_LANDSCAPE);
		await page.waitForTimeout(350);
		expect(await isSidebarVisible(page)).toBe(true);
	});

	test('closed sidebar stays closed through rotation', async ({ page }) => {
		await page.setViewportSize(IPHONE_PORTRAIT);
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Close sidebar
		await toggleBtn(page).click();
		await sidebar(page).evaluate(
			(el) => new Promise((r) => el.addEventListener('transitionend', r, { once: true }))
		);
		expect(await isSidebarVisible(page)).toBe(false);

		// Rotate to landscape — should stay closed
		await page.setViewportSize(IPHONE_LANDSCAPE);
		await page.waitForTimeout(350);
		expect(await isSidebarVisible(page)).toBe(false);
	});
});
