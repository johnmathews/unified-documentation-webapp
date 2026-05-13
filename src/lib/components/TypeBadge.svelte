<script lang="ts">
	import type { DocType } from "$lib/api";

	type Props = {
		type: DocType | null | undefined;
	};

	let { type }: Props = $props();
</script>

{#if type}
	<span class="type-badge type-badge--{type}" data-testid="type-badge">{type}</span>
{/if}

<style>
	.type-badge {
		display: inline-flex;
		align-items: center;
		padding: 1px 6px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 500;
		line-height: 1.4;
		text-transform: lowercase;
		letter-spacing: 0.02em;
		white-space: nowrap;
		border: 1px solid transparent;
	}

	.type-badge--documentation {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 28%, transparent);
	}

	.type-badge--journal {
		background: color-mix(in srgb, #5b8def 14%, transparent);
		color: #6ea2ff;
		border-color: color-mix(in srgb, #5b8def 32%, transparent);
	}

	.type-badge--prompt {
		background: color-mix(in srgb, #d4a017 14%, transparent);
		color: #e2b743;
		border-color: color-mix(in srgb, #d4a017 32%, transparent);
	}

	.type-badge--not-docs {
		background: color-mix(in srgb, var(--text-secondary) 14%, transparent);
		color: var(--text-secondary);
		border-color: color-mix(in srgb, var(--text-secondary) 28%, transparent);
	}
</style>
