# Getting started

A concrete plan for the first coding sessions, ordered so that real data flows
through the system as early as possible. The fastest way to find out what the
app actually needs is to get a month of real transactions imported and
categorised.

## Before the first session (no code)

1. **Create the `family-finances` GitHub repository** (private) and copy these
   planning docs into it.
2. **Check the bank's export menu** — which of CAMT.053 / MT940 / CSV are
   actually offered? (See [data-ingestion.md](data-ingestion.md).)
3. **Download the full available transaction history** in the best structured
   format on offer, plus CSV. Banks limit how far back exports go, so do this
   once now regardless of when the importer gets written.

## Suggested repository layout

```
family-finances/
├── README.md
├── docs/                  ← these planning documents
├── backend/               ← Python · FastAPI
│   ├── pyproject.toml
│   └── src/
├── frontend/              ← Vue 3 · Vite
│   ├── package.json
│   └── src/
├── mcp-server/            ← Python · MCP SDK, thin client of backend API
│   ├── pyproject.toml
│   └── src/
└── docker-compose.yml     ← home-server deployment, one service per component
```

## Milestone 1 — data in

Backend only. Prove the ingestion loop with real exports.

- Project scaffolding: FastAPI app, SQLite database, transaction model.
- One importer for the best format the bank offers (CSV first if in doubt —
  quickest to write, easiest to debug).
- Idempotent import (dedup hash), originals stored.
- A couple of raw endpoints: list transactions, monthly income/expense totals.

**Done when:** a real statement file imports cleanly, twice, without
duplicates.

## Milestone 2 — categories

- Category tree, rules engine (pattern → category), manual override endpoint.
- Seed rules by categorising one real month by hand and turning the obvious
  counterparties into rules.

**Done when:** a fresh month imports with most transactions auto-categorised
and the stragglers are quick to fix.

## Milestone 3 — first answers in the web app

The first Vue milestone. Aim small and pleasant, not complete — this is the
first thing the family sees, and it must make a good impression.

- Transaction list with category editing (this is also the categorisation UI).
- Statement upload (drag and drop).
- A first answers page: this month's income vs. spending, spend by category,
  saving so far this year.

**Done when:** the monthly routine — upload, tidy categories, look at the
numbers — is genuinely pleasant to do in the browser.

## Milestone 4 — MCP server

- Wrap the backend API in MCP tools: `spending_by_category`,
  `savings_summary`, `event_cost`, `find_transactions`, period-comparison
  queries.
- Connect from Claude and try the real question list from
  [requirements.md](requirements.md) against real data.

**Done when:** "how much are we spending on eating out?" gets a correct answer
in a Claude conversation.

## Milestone 5 — the harder questions

Now the analytics that need history and modelling:

- Recurring-expense detection → fixed vs. variable → "unexpected expenses per
  month/quarter".
- Weekly food-spend variance; month-to-month and seasonal comparisons.
- Event tags for holidays and other one-offs.
- "Where could we save money?" — start simple: biggest categories, fastest
  growth, comparison against own past months.

## Deployment on the home server

- `docker-compose.yml` with three services (backend, frontend, mcp-server) and
  a volume for the SQLite file and original statement files.
- **Back up the volume** — this becomes the family's financial record.
- LAN-only is a sensible starting posture; decide deliberately later if any
  remote access is wanted, since this is sensitive data.

## Open questions for the first session

- Which export formats does the bank actually offer? (Determines the first
  importer.)
- One bank account or several (joint, savings, credit card)? Multiple accounts
  are worth modelling from the start even if only one is imported initially.
- What does "saving enough" mean to us — a fixed monthly target, a percentage
  of income? The app can compute either; the target is a family decision.
- Does the MCP server talk to the backend over HTTP (fully separate, matches
  the architecture) or import it as a library (simpler, tighter coupling)?
  Proposal: HTTP, to keep the separation honest.
