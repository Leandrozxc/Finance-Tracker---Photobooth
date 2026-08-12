# RotaSnap / EmpressLedger — Booth Finance Tracker

An offline finance tracker for a student-run, multi-day photo booth event. Built to record sales and expenses, track partner-organization frame fees, and calculate net income after Rotaract's revenue share — without needing an internet connection.

## Tech Stack

- **Frontend:** React + TypeScript, built with Vite
- **Backend/runtime:** Tauri (Rust)
- **Database:** SQLite (local file, accessed via Rust/`rusqlite`)
- **Styling:** Tailwind-style utility classes

## Setup

### Prerequisites

- Node.js (LTS recommended)
- Rust toolchain (`rustup`) — required for Tauri's backend
- Windows: WebView2 runtime (usually pre-installed on Windows 10/11)

### Install and Run

```powershell
npm install
npm run tauri dev
```

This launches the app in development mode with hot reload for the React frontend. Changes to Rust files require a restart of this command.

### Build a Production Executable

```powershell
npm run tauri build
```

The `.exe` and installer will be output under `src-tauri/target/release/`.

### Local Database

The app stores all sales and expense records in a local SQLite file. This file is intentionally excluded from Git (see `.gitignore`) since it contains real event financial data — each fresh clone of this repo starts with an empty database.

## Project Structure

```text
src/
  pages/
    RecordSale.tsx      Sale entry screen (item, add-ons, org frame selection)
    ManageEntries.tsx    Edit/delete past sales & expenses, filter by booth day
    Summary.tsx          Gross/net income, Rotaract revenue split, totals
    OrgTracker.tsx        Amount owed per partner org, manual usage adjustment
  store/
    ledgerStore.ts        App-wide config (items, modifiers, cycle/day, currency)
  db/
    client.ts              Frontend wrappers around Tauri `invoke()` calls
  types/
    ledger.ts               Shared TypeScript types (Sale, Expense, Organization)
src-tauri/
  src/                      Rust backend: Tauri commands, SQLite queries
```

## Core Business Logic

### Pricing

```text
Sale total = Base price + (Extra copies × extra-copy price)
```

The "different frame" add-on does **not** add to the customer's total — selecting an organization's frame only increments that org's usage count in Org Tracker. It represents a revenue cut, not an extra charge.

### Booth Days (Cycles)

Each sale is tagged with the current booth day (`cycle`) at the moment it's recorded. Changing the current day in Settings only affects new sales — past sales keep their original day. Manage Entries lets you filter and view sales per day.

### Rotaract Revenue Split

```text
Gross income (per day)     = SUM(total) for Paid sales that day
Rotaract's share            = Gross income × 15%
Net income (per day)        = Gross income − Rotaract's share
Final profit (event total)  = SUM(Net income across all days) − Total expenses
```

This 15% applies to **every** paid sale regardless of which frame was chosen.

### Partner Organization Frame Fees

Separately from Rotaract's 15%, any organization whose frame is picked earns a flat fee (default ₱5) per pick, tracked via a `usage_count` on each organization.

```text
Amount owed to an org        = usage_count × frame fee
Net income after org payouts = Final profit − total owed to all orgs
```

Frame usage counts can be adjusted **manually** on the Org Tracker page (±buttons with a custom amount field) as a safety net for corrections, independent of automatic tracking from Record Sale.

⚠️ **Open question, not yet resolved:** if Rotaract's own frame is ever selected, they'd currently be paid both the 15% cut *and* the flat per-frame fee for that sale. Confirm with the user whether this double-payment is intended or whether Rotaract should be excluded from the Org Tracker table.

### Timestamps

Every sale stores `recorded_at` in UTC (via SQLite's `datetime('now')`). The frontend converts this to local time for display — do not print the raw string without conversion, or displayed times will be off by the local UTC offset.

---

## Handoff Notes for the Next LLM/Developer

This section exists so a future assistant (or the project owner working with one) can pick up exactly where this conversation left off, without re-deriving context from scratch.

### Where This Project Actually Stands

- The tech stack is **Tauri + React + TypeScript + Rust + SQLite** — not Streamlit/Python. An earlier README in this repo's history described a Streamlit version; that was superseded by a deliberate pivot to Tauri for offline deployability, and is now outdated. Do not follow that old README's setup instructions.
- Git repo was just initialized locally (`git init`, `main` branch, no commits yet as of this handoff). `.gitignore` has been extended beyond the default Vite template to also exclude `src-tauri/target`, `*.db`/`*.sqlite`, and `.env` files.

### Files Generated This Session, Not Yet Confirmed Wired-In

These were written based on inferred conventions (matching patterns like `useLedgerConfig()`, `getSales()`, `window.addEventListener("ledger:changed", ...)`) since the actual source files weren't available for direct editing. **Before trusting them as final, diff them against the real files in this repo:**

1. `RecordSale.tsx` — excludes the frame modifier's price from the customer-facing total.
2. `ManageEntries.tsx` — adds a Day filter/badge and a formatted "Recorded At" column.
3. `Summary.tsx` — adds the Rotaract revenue-split table and revised Final Profit formula.
4. `OrgTracker.tsx` — adds per-org amount-owed table with manual +/− usage adjustment.
5. `org_usage_backend_additions.rs` — a Rust Tauri command (`adjust_organization_usage`) that needs to be pasted into the real backend file and registered in `invoke_handler![...]`.

### Known Gaps Requiring User Confirmation or Real File Access

- `client.ts` needs a new `adjustOrganizationUsage(orgId, delta)` function calling `invoke("adjust_organization_usage", {...})` — the exact argument casing (camelCase vs snake_case) must match whatever convention the user's other `invoke()` calls already use. This was never verified against the real file.
- The Rotaract-vs-org-fee double-counting question above is unresolved — ask before assuming either resolution.
- Organization type is assumed to have `id`, `name`, `active`, `usage_count` fields — confirm against the real `types/ledger.ts`.

### User Preferences Established So Far

- Wants simple, student-friendly terminology and a low-clutter UI (high customer volume during the event).
- Wants completed sales to retain their original prices/settings even if Settings values change later.
- Wants manual override controls wherever automatic tracking could plausibly drift or double-count, as a safety mechanism.
- Prefers being asked for explicit approval before new features are implemented (per this project's own stated "Future Development Rule").
