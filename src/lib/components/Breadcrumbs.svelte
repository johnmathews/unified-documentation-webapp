<script lang="ts">
 import { displaySource } from "$lib/titles";

 let {
  source,
  category,
  title,
 }: {
  source: string;
  category?: string;
  title?: string;
 } = $props();
</script>

<nav class="govuk-breadcrumbs" aria-label="Breadcrumb">
 <ol class="govuk-breadcrumbs__list">
  <li class="govuk-breadcrumbs__list-item">
   <a class="govuk-breadcrumbs__link" href="/">Home</a>
  </li>
  {#if title || category}
   <li class="govuk-breadcrumbs__list-item">
    <a class="govuk-breadcrumbs__link" href="/source/{encodeURIComponent(source)}">{displaySource(source)}</a>
   </li>
  {:else}
   <li class="govuk-breadcrumbs__list-item" aria-current="page">{displaySource(source)}</li>
  {/if}

  {#if category}
   {#if title}
    <li class="govuk-breadcrumbs__list-item">
     <a class="govuk-breadcrumbs__link" href="/source/{encodeURIComponent(source)}/{category}"
      >{category === "journal" ? "Journal" : category === "research" ? "Research" : category === "pdf" ? "PDF" : "Documentation"}</a
     >
    </li>
   {:else}
    <li class="govuk-breadcrumbs__list-item" aria-current="page">
     {category === "journal" ? "Journal" : category === "research" ? "Research" : category === "pdf" ? "PDF" : "Documentation"}
    </li>
   {/if}
  {/if}

  {#if title}
   <li class="govuk-breadcrumbs__list-item" aria-current="page">{title}</li>
  {/if}
 </ol>
</nav>

<style>
 .govuk-breadcrumbs {
  font-size: 1rem;
  line-height: 1.25;
  margin-top: 15px;
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

 /* Chevron separator — GOV.UK rotated border trick */
 .govuk-breadcrumbs__list-item::before {
  content: "";
  display: block;
  position: absolute;
  top: 0;
  bottom: 0;
  left: -0.206875em;
  width: 0.4375em;
  height: 0.4375em;
  margin: auto 0;
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

 .govuk-breadcrumbs__link:focus {
  outline: 3px solid transparent;
  color: var(--focus-text);
  background-color: var(--focus);
  box-shadow:
   0 -2px var(--focus),
   0 4px var(--focus-text);
  text-decoration: none;
 }

 @media (max-width: 640px) {
  .govuk-breadcrumbs__list-item {
   padding: 5px 0;
  }
  .govuk-breadcrumbs__link {
   min-height: 44px;
   display: inline-flex;
   align-items: center;
  }
 }
</style>
