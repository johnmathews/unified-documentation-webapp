<script lang="ts">
	let { source, category, title }: {
		source: string;
		category?: string;
		title?: string;
	} = $props();
</script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
	<a href="/">Home</a>
	<span class="sep">/</span>
	{#if title || category}
		<a href="/source/{encodeURIComponent(source)}">{source}</a>
	{:else}
		<span class="current">{source}</span>
	{/if}

	{#if category}
		<span class="sep">/</span>
		{#if title}
			<a href="/source/{encodeURIComponent(source)}/{category}">{category === 'journal' ? 'Journal' : 'Documentation'}</a>
		{:else}
			<span class="current">{category === 'journal' ? 'Journal' : 'Documentation'}</span>
		{/if}
	{/if}

	{#if title}
		<span class="sep">/</span>
		<span class="current">{title}</span>
	{/if}
</nav>

<style>
	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.breadcrumbs a {
		color: var(--text-muted);
		transition: color 0.1s;
	}

	.breadcrumbs a:hover {
		color: var(--accent);
	}

	.sep {
		color: var(--text-dim);
	}

	.current {
		color: var(--text);
		font-weight: 500;
	}

	@media (max-width: 600px) {
		.breadcrumbs {
			font-size: 0.9rem;
		}
		.breadcrumbs a {
			padding: 0.4rem 0.25rem;
			min-height: 44px;
			display: inline-flex;
			align-items: center;
		}
		.current {
			padding: 0.4rem 0;
		}
	}
</style>
