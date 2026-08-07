# Data ingestion: statement formats

The brief: PDF statements are what we know we can export; CSV is available and
MT940 is believed to be available; and if other formats are *better*, we should
use them. This document compares the options and makes a recommendation.

## Format comparison

| Format | What it is | Reliability for parsing | Notes |
| --- | --- | --- | --- |
| **CAMT.053** (ISO 20022 XML) | The modern successor to MT940; a structured XML end-of-day statement | Excellent | Richest data: counterparty name *and* IBAN, structured remittance info, balances. Most Dutch/EU banks (ING, ABN AMRO, Rabobank, bunq, …) offer it in their export menu, sometimes labelled "CAMT" or "ISO 20022" |
| **MT940** | SWIFT's classic bank-statement format, plain text | Very good | Well-specified, decades old, good Python libraries (`mt-940`). Less structured than CAMT (counterparty details are packed into free-text fields with bank-specific conventions) |
| **CSV** | Bank's own tabular export | Good | Trivial to parse, but every bank's column layout is different and can change without notice; needs a small per-bank column mapping |
| **PDF** | Human-readable statement | Poor | PDFs are layout, not data — extraction is fragile, table structures break across pages, and some banks render statements as images requiring OCR. Treat as a **fallback**, not the primary path |

## Recommendation

1. **Prefer CAMT.053 if the bank offers it** — it is the "better format" the
   brief asked about. Check the banking website's export/download options for
   "CAMT.053", "ISO 20022", or "XML".
2. **Otherwise MT940** — already believed to be available, and dependable.
3. **CSV as the pragmatic workhorse** — worth supporting from day one anyway,
   because it is the easiest to inspect by eye when debugging categorisation.
4. **PDF as a fallback importer, built later** — only for statements that
   predate the switch to structured exports, or for accounts that offer
   nothing else. Don't let PDF parsing complexity block the first version.

A practical note: banks typically only let you export the last 1–2 years of
transactions in structured formats. It is worth **downloading the full
available history once, early** (in every format on offer), so the data exists
even before the importer for it does.

## Importer design principles

- **One importer per format, one common output.** Every importer produces the
  same normalised `Transaction` records; nothing downstream knows or cares
  what file format a transaction came from.
- **Idempotent imports.** Re-importing an overlapping export must not create
  duplicates — dedup on a hash of (account, date, amount, counterparty,
  description). This makes the workflow forgiving: when in doubt, re-import.
- **Keep the original files.** Store every uploaded statement file as-is
  (path recorded on the transactions it produced). Re-parsing is then always
  possible when an importer improves, and the originals double as an archive.
- **Import via the web app.** Uploading a statement should be a drag-and-drop
  action in the frontend — simple enough to be part of a monthly routine, not
  a developer-only script.
