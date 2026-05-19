import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal.svelte";

describe("KeyboardShortcutsModal", () => {
	it("lists the Files panel shortcut as mod + backslash, not B", () => {
		const { getByText, container } = render(KeyboardShortcutsModal, {
			props: { open: true, onClose: () => {} },
		});

		const row = getByText("Toggle Files panel").closest(".shortcut-row");
		expect(row).not.toBeNull();
		const keys = Array.from(row!.querySelectorAll("kbd")).map((k) => k.textContent);
		// cmd+F stays the browser's find-in-page; Files moved off cmd+B to cmd+\.
		expect(keys).toContain("\\");
		expect(keys).not.toContain("B");

		// Sanity: Search is still listed (unchanged binding).
		expect(container.textContent).toContain("Toggle Search panel");
	});

	it("lists the Chat shortcut as a navigation (mod + J), not a panel toggle", () => {
		const { getByText, queryByText } = render(KeyboardShortcutsModal, {
			props: { open: true, onClose: () => {} },
		});

		// Chat became a standalone /chat page — the shortcut now navigates
		// rather than toggling a panel.
		expect(queryByText("Toggle Chat panel")).toBeNull();
		const row = getByText("Go to Chat").closest(".shortcut-row");
		expect(row).not.toBeNull();
		const keys = Array.from(row!.querySelectorAll("kbd")).map((k) => k.textContent);
		expect(keys).toContain("J");
	});
});
