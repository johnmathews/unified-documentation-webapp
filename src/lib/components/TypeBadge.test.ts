import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import type { DocType } from "$lib/api";
import TypeBadge from "./TypeBadge.svelte";

describe("TypeBadge", () => {
	it.each<[DocType, string]>([
		["documentation", "type-badge--documentation"],
		["journal", "type-badge--journal"],
		["prompt", "type-badge--prompt"],
		["not-docs", "type-badge--not-docs"],
	])("renders the %s type with the correct class", (type, expectedClass) => {
		const { getByTestId } = render(TypeBadge, { props: { type } });
		const badge = getByTestId("type-badge");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("type-badge");
		expect(badge).toHaveClass(expectedClass);
		expect(badge.textContent).toBe(type);
	});

	it("renders nothing when type is null", () => {
		const { queryByTestId } = render(TypeBadge, { props: { type: null } });
		expect(queryByTestId("type-badge")).toBeNull();
	});

	it("renders nothing when type is undefined", () => {
		const { queryByTestId } = render(TypeBadge, { props: { type: undefined } });
		expect(queryByTestId("type-badge")).toBeNull();
	});
});
