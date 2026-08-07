# Family Finances

An application for understanding and managing our family's finances. It ingests
bank statements exported from our banking website and answers everyday
questions about spending, saving, and where the money goes.

**Status: planning.** Coding has not started yet. These documents capture the
project brief and the proposed starting point.

## The idea in one paragraph

Download bank statements, feed them into the app, and then ask real family
questions: *How much are we spending on eating out? What did the holiday cost?
Are we saving anything each month — and is it enough?* The primary interface is
a web app that is genuinely pleasant to use — intuitive and simple enough that
both of us enjoy using it, not just the person who built it. An MCP server sits
alongside it so the same questions can be asked conversationally through
Claude.

## Documents

| Document | What it covers |
| --- | --- |
| [docs/requirements.md](docs/requirements.md) | The full project brief: goals, the questions the app must answer, constraints |
| [docs/architecture.md](docs/architecture.md) | Proposed component split (backend / frontend / MCP server) and tech stack |
| [docs/data-ingestion.md](docs/data-ingestion.md) | Bank statement formats — PDF, CSV, MT940, CAMT.053 — and which to prefer |
| [docs/getting-started.md](docs/getting-started.md) | A concrete plan for the first coding sessions |

## Fixed decisions

These were decided up front and are not open questions:

- **Python** on the backend.
- **Vue** for the frontend web application.
- **Three separate components** — backend, frontend, MCP server — so the app
  can be used in different ways and evolve flexibly over time.
- **Hosted entirely on the home server.**
- The web app must be **intuitive and simple**, and a pleasure for the whole
  family to use.
