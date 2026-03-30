# Status Table Column Reorder and Padding

## Changes

Reordered the status table columns from `Source | Files | Chunks | Last Indexed` to
`Source | Last Indexed | Files | Chunks`. The "Last Indexed" column is the most
immediately useful information after identifying a source — users scan for "what was
updated and when" before caring about file/chunk counts.

Also added 8px left padding to the first column (`th:first-child`, `td:first-child`)
so the source badges don't sit flush against the table edge.

## Files Modified

- `src/routes/status/+page.svelte` — reordered columns in thead, tbody, and tfoot;
  added first-column padding rule

## Context

This followed a style review of the status table against GOV.UK brutalist design
guidelines and general table best practices. The column reorder was a user request
after discussing readability improvements. The padding fix was identified as a minor
polish item during the review.
