<script lang="ts">
	import { displaySource } from "$lib/titles";

	let {
		source,
		filePath,
		title,
		crumbs,
	}: {
		source?: string;
		filePath?: string;
		title?: string;
		// Optional generic mode: when provided, renders Home + these crumbs
		// (last one is the current page, no link) using the same markup.
		// The source/filePath/title props are ignored in this mode.
		crumbs?: { label: string; href?: string }[];
	} = $props();

	// File-path segments excluding the filename itself. Each renders as a
	// clickable link into the folder-browse route.
	const folderSegments = $derived.by(() => {
		if (!filePath) return [];
		const parts = filePath.split("/").filter(Boolean);
		return parts.slice(0, -1);
	});

	// Href for the folder-browse route up to and including segment index `i`.
	// Encode each segment but join with literal `/` so the route's [...path]
	// rest param keeps its separators.
	function folderHref(i: number): string {
		const encoded = folderSegments
			.slice(0, i + 1)
			.map(encodeURIComponent)
			.join("/");
		return `/source/${encodeURIComponent(source ?? "")}/${encoded}`;
	}
</script>

<nav class="govuk-breadcrumbs" aria-label="Breadcrumb">
	<ol class="govuk-breadcrumbs__list">
		<li class="govuk-breadcrumbs__list-item">
			<a class="govuk-breadcrumbs__link" href="/">Home</a>
		</li>
		{#if crumbs}
			{#each crumbs as crumb, i (i)}
				{#if i === crumbs.length - 1}
					<li class="govuk-breadcrumbs__list-item" aria-current="page">
						{crumb.label}
					</li>
				{:else}
					<li class="govuk-breadcrumbs__list-item">
						<a class="govuk-breadcrumbs__link" href={crumb.href ?? "#"}
							>{crumb.label}</a
						>
					</li>
				{/if}
			{/each}
		{:else}
			{#if title || folderSegments.length > 0}
				<li class="govuk-breadcrumbs__list-item">
					<a class="govuk-breadcrumbs__link" href="/source/{encodeURIComponent(source ?? '')}"
						>{displaySource(source ?? "")}</a
					>
				</li>
			{:else}
				<li class="govuk-breadcrumbs__list-item" aria-current="page">
					{displaySource(source ?? "")}
				</li>
			{/if}

			{#each folderSegments as segment, i (i)}
				<li class="govuk-breadcrumbs__list-item">
					<a class="govuk-breadcrumbs__link" href={folderHref(i)}>{segment}</a>
				</li>
			{/each}

			{#if title}
				<li class="govuk-breadcrumbs__list-item" aria-current="page">{title}</li>
			{/if}
		{/if}
	</ol>
</nav>

<style>
	.govuk-breadcrumbs {
		font-size: 1rem;
		line-height: 1.25;
		/* padding (not margin) so the breathing room survives the doc page's
		   sticky-header override that zeroes margin-top — keeps the crumbs
		   off the service-nav band on every page. */
		padding-top: 15px;
		margin-bottom: 10px;
		color: var(--text);
	}

	.govuk-breadcrumbs__list {
		margin: 0;
		padding: 0;
		list-style-type: none;
	}

	.govuk-breadcrumbs__list-item {
		display: inline-block;
		position: relative;
		margin-bottom: 5px;
		margin-left: 0.625em;
		padding-left: 0.9784375em;
	}

	/* First item has no chevron */
	.govuk-breadcrumbs__list-item:first-child {
		margin-left: 0;
		padding-left: 0;
	}

	/* Chevron separator — GOV.UK rotated border trick. */
	.govuk-breadcrumbs__list-item::before {
		content: "";
		display: block;
		position: absolute;
		top: 0.375em;
		left: -0.206875em;
		width: 0.4375em;
		height: 0.4375em;
		transform: rotate(45deg);
		border: solid;
		border-width: 1px 1px 0 0;
		border-color: var(--text-secondary);
	}

	.govuk-breadcrumbs__list-item:first-child::before {
		content: none;
		display: none;
	}

	.govuk-breadcrumbs__link {
		color: var(--text);
		text-decoration: underline;
		text-decoration-thickness: max(1px, 0.0625rem);
		text-underline-offset: 0.1578em;
	}

	.govuk-breadcrumbs__link:link,
	.govuk-breadcrumbs__link:visited,
	.govuk-breadcrumbs__link:active {
		color: var(--text);
	}

	.govuk-breadcrumbs__link:hover {
		color: var(--text);
		text-decoration-thickness: max(3px, 0.1875rem, 0.12em);
	}

	@media (max-width: 640px) {
		.govuk-breadcrumbs__link {
			min-height: 44px;
			display: inline-flex;
			align-items: flex-start;
		}
	}
</style>
