import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import type { ConversationSummary, ConversationFull } from "$lib/api";

// The chat page reads no route params, but the embedded ChatPanel imports
// streaming helpers. We only need to mock the conversation-list / fetch
// surface so the page renders deterministically without a backend.
const listConversations = vi.fn<() => Promise<ConversationSummary[]>>();
const getConversation = vi.fn<(id: string) => Promise<ConversationFull>>();
const deleteConversation = vi.fn<(id: string) => Promise<void>>();

vi.mock("$lib/api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("$lib/api")>();
	return {
		...actual,
		listConversations: () => listConversations(),
		getConversation: (id: string) => getConversation(id),
		deleteConversation: (id: string) => deleteConversation(id),
	};
});

import Page from "./+page.svelte";

function summary(id: string, title: string): ConversationSummary {
	return {
		id,
		title,
		created_at: "2026-05-19T10:00:00Z",
		updated_at: "2026-05-19T10:05:00Z",
		message_count: 4,
		preview: `${title} preview`,
	};
}

beforeEach(() => {
	listConversations.mockReset();
	getConversation.mockReset();
	deleteConversation.mockReset();
});

describe("/chat page", () => {
	it("renders the history list region and the conversation area", async () => {
		listConversations.mockResolvedValue([]);

		const { container } = render(Page);

		await waitFor(() => {
			expect(
				container.querySelector('[aria-label="Conversation history"]'),
			).not.toBeNull();
		});

		// The conversation area (the embedded ChatPanel) is present.
		expect(container.querySelector('[aria-label="Conversation"]')).not.toBeNull();
		expect(container.querySelector(".chat-container")).not.toBeNull();

		// Empty history shows the empty-state copy, not a loading spinner.
		expect(container.textContent).toContain("No previous conversations.");
	});

	it("lists conversations returned by the API", async () => {
		listConversations.mockResolvedValue([
			summary("c1", "First chat"),
			summary("c2", "Second chat"),
		]);

		const { findByText, container } = render(Page);

		expect(await findByText("First chat")).toBeInTheDocument();
		expect(await findByText("Second chat")).toBeInTheDocument();

		// Each conversation has a delete affordance.
		const deletes = container.querySelectorAll(".history-delete");
		expect(deletes.length).toBe(2);

		// And a "New conversation" affordance exists (compact "New" label,
		// full description in the title attribute for accessibility).
		const newBtn = container.querySelector("button.new-btn");
		expect(newBtn).not.toBeNull();
		expect(newBtn?.getAttribute("title")).toBe("New conversation");
		expect(newBtn?.textContent).toContain("New");
	});
});
