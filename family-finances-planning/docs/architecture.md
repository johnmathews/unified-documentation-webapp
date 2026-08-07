# Proposed architecture

Three separately deployable components, all running on the home server. The
split is a requirement (see [requirements.md](requirements.md)); the specific
technology suggestions below are proposals to be confirmed in the first coding
session.

```
                    ┌────────────────────────┐
  bank statement    │        Backend         │
  files (CSV /      │  Python · FastAPI      │
  MT940 / CAMT /  ─▶│  ingestion, storage,   │◀─┐
  PDF)              │  categorisation,       │  │
                    │  query/analytics API   │  │
                    └───────────┬────────────┘  │
                                │ HTTP/JSON     │ HTTP/JSON
                    ┌───────────▼────────────┐  │
                    │       Frontend         │  │
                    │  Vue 3 web app         │  │
                    │  (the family-facing    │  │
                    │   interface)           │  │
                    └────────────────────────┘  │
                    ┌───────────────────────────┴──┐
                    │         MCP server           │
                    │  exposes query tools so      │
                    │  Claude can answer finance   │
                    │  questions conversationally  │
                    └──────────────────────────────┘
```

## Why this shape

The brief's driving constraints are **flexibility** and **separation of
concerns**: how the app is used will evolve, and we will iterate. So:

- **All intelligence lives in the backend.** Categorisation rules, savings
  maths, period comparisons — one implementation, exposed over a plain HTTP
  API. The frontend and MCP server are both thin clients of the same API, so
  an answer is identical whether it comes from the web app or from Claude.
- **The MCP server is a sibling, not a bolt-on.** It wraps the backend API in
  MCP tools (`query_spending`, `savings_summary`, `list_uncategorised`, …).
  This is what makes "used in a number of different ways" real from day one:
  web app for browsing and monthly reviews, Claude for ad-hoc questions
  ("what did the holiday cost?").
- **New interfaces stay cheap.** A CLI, a scheduled monthly-summary email, a
  phone shortcut — all just new clients of the existing API.

## Suggested technology choices

| Component | Suggestion | Rationale |
| --- | --- | --- |
| Backend framework | **FastAPI** | De-facto standard for Python JSON APIs; typed models (Pydantic) suit financial data; automatic OpenAPI docs help when writing the Vue and MCP clients |
| Database | **SQLite** to start | Single family's transactions is small data (thousands of rows/year). One file on the home server, trivially backed up. Postgres only if/when genuinely needed |
| ORM / queries | SQLModel or plain SQL | Keep it simple; the analytics queries (weekly variance, seasonal comparison) are where the interesting SQL lives |
| Frontend | **Vue 3** + Vite + TypeScript | Vue is a fixed decision; Vite is its standard tooling |
| Charts | A small chart library (e.g. Chart.js or ECharts) | The variance/seasonality questions are inherently visual |
| MCP server | **Python** (FastMCP / official MCP SDK) | Keeps the whole stack one language; can share Pydantic models with the backend |
| Deployment | **Docker Compose** on the home server | One `docker-compose.yml` with three services mirrors the three-component architecture; same pattern as the existing docserver setup |

## Data model — first sketch

Enough to answer the required questions; deliberately minimal.

- **Account** — a bank account statements are imported for.
- **Transaction** — date, amount (signed), counterparty, description, source
  file, dedup hash. Immutable once imported; everything else is annotation.
- **Category** — a small family-owned tree (e.g. Food → Groceries / Eating
  out). Each transaction gets exactly one category, assigned by rules with
  manual override.
- **Rule** — pattern → category (e.g. counterparty contains "ALBERT HEIJN" →
  Groceries). Rules make categorisation automatic after the first few weeks.
- **Tag / Event** — free-form labels spanning categories and a date range
  ("Holiday France 2026"). Answers the "what did the holiday cost" class of
  question.
- **Recurring expense** — detected (same counterparty, similar amount,
  regular interval) and confirmable; the basis for "fixed expenses" and, by
  complement, "unexpected expenses".

## Design principles carried over from the brief

- **Simple and intuitive beats feature-rich.** The web app must be enjoyable
  for the whole family — if the monthly review feels like a chore, the app has
  failed regardless of how good the analytics are.
- **Iterate.** Start with import → categorise → a handful of answers, in front
  of real data, quickly. Resist building the full analytics suite before the
  ingestion loop is proven.
