# Requirements

Captured from the project brief (2026-08-07), before any coding started. This
is the source of truth for what the application is for. Anything not in here is
a proposal, not a requirement.

## Purpose

Answer real questions about our family's finances, based on our actual bank
transactions. The app should make it easy to see where money goes, whether we
are saving, and where we could do better.

## Architecture requirements

1. **Separate backend, frontend, and MCP server components.** The application
   must be usable in a number of different ways, not only through the web app.
   As with all home projects, how it is used will evolve and develop over time
   — we will iterate on solutions, so **flexibility and separation of concerns
   are important**.
2. **Primary interface is a web app.**
3. **Everything is hosted on the home server.**

## Data ingestion requirements

- The backend must ingest **PDF bank statements** downloaded/exported from the
  banking website.
- Other formats should also be supported. **CSV** is available from the bank,
  and **MT940** is believed to be available too.
- If other formats are *better* than PDF, prefer them — the format choice is
  open, PDF is simply what is known to be available. (See
  [data-ingestion.md](data-ingestion.md) for the format comparison and
  recommendation.)

## Questions the app must be able to answer

This list is the heart of the project. Every design decision should be tested
against "does this help answer these questions?"

### Spending by category

- How much are we spending on eating out?
- How much is the car costing us?
- What are we spending on the children's extracurricular activities?
- How much are we spending on clothing?
- How much do we spend on food each week?

### One-off events

- How much did our family holiday cost us?

### Income vs. outgoings and saving

- Are we spending more than we are earning?
- Are we saving any money per month?
- What is our average saving per month?
- Are we saving *enough*?

### Fixed vs. variable, and the unexpected

- What are our fixed expenses?
- How many unexpected expenses do we have per month, or per quarter?
- Where could we save money?

### Variation over time

- Does food spending vary from week to week? Are some weeks cheaper than
  others, or are all weeks equally expensive?
- Are all months equally expensive?
- Seasonally, are the summer months more expensive than the winter months, or
  is it the other way around?

## What those questions imply (derived, not dictated)

Reading the question list, the app needs at minimum:

- **Transaction categorisation** (eating out, food, car, clothing, children's
  activities, …) — largely automatic, with easy manual correction, because a
  categorisation chore nobody does means the questions can't be answered.
- **Event tagging** — a holiday is a *time-bounded group of transactions
  across many categories*, which is different from a category.
- **Income tracking**, not just expenses, to compute earning vs. spending and
  the savings rate.
- **Fixed vs. variable classification** of expenses (recurring detection).
- **A notion of "unexpected"** — expenses that don't fit the recurring/fixed
  pattern, countable per month and per quarter.
- **Aggregation at multiple granularities** — weekly, monthly, quarterly,
  seasonal — with comparison between periods (variance, not just totals).

## User experience requirements

- It needs to be a **nice web app that my wife also enjoys using**.
- It needs to be **intuitive and simple**.

This is a hard requirement, equal in weight to the functional ones. If a
feature makes the app more capable but harder or uglier to use, it fails.

## Stack decisions (fixed)

- **Backend: Python**
- **Frontend: Vue**
- MCP server component (language open — Python keeps the stack uniform; see
  architecture doc).
