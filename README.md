# Full House Delivery Dashboard

Business dashboard for **Fullhouse Delivery LLC** — track customer jobs, revenues, and expenses across all your devices.

## Features

- **Customer & Job Tracking** — log deliveries by category (Furniture Store Jobs, Repeat Customers, Online Customers, and custom categories) with customer details
- **Revenue & Expense Tracking** — log income and expenses with financial breakdowns (daily, weekly, monthly, quarterly)
- **Bank Statement Import** — upload CSV or PDF bank statements with automatic transaction categorization
- **Pie & Bar Charts** — visual overview of job distribution and financial performance
- **Cloud Sync via Supabase** — sign in to sync data across phone and computer; works offline with local storage fallback
- **Live Updates** — Supabase Realtime pushes changes made on one device to every other signed-in device
- **Square Payments Sync** — pull real payments, tips, processing fees, and refunds from your Square account
- **Export/Import** — JSON and CSV export for backups

## Setup

### 1. GitHub Pages

This site is deployed automatically via GitHub Pages at:  
<https://fullhousedeliveryllc-wq.github.io/full-house-delivery-dashboard/>

### 2. Supabase Database

Before using cloud sync, create the required tables by running [`supabase-setup.sql`](supabase-setup.sql) in the [Supabase SQL Editor](https://supabase.com/dashboard/project/pgjqfgkxbmlpvzcgqire/sql/new).

This creates three tables with Row Level Security (RLS):
- `categories` — delivery job categories  
- `job_entries` — individual job/delivery records  
- `finance_entries` — revenue and expense records  

The same script also enables **Realtime** on those tables (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`), which powers live updates — changes made on one device appear on the others without a refresh. Alternatively, enable Replication for each table in Dashboard → Database → Replication.

### 3. Authentication

Users can sign up / sign in via the dashboard header. Each user's data is isolated by RLS policies.

### 4. Square Payments

The Square Payments tab can pull live data from Square through the [`square-sync`](supabase/functions/square-sync/index.ts) Supabase Edge Function. The Square access token lives only in Supabase — it is never shipped to the browser.

1. Create a Square access token: <https://developer.squareup.com/apps> → your application → **Credentials** → *Production Access Token* (a production token from the Square dashboard's app settings works too). It needs the read scopes `PAYMENTS_READ` and `ORDERS_READ`.
2. Store it as a secret on the Supabase project (Dashboard → Edge Functions → Secrets, or the CLI):

   ```bash
   supabase secrets set SQUARE_ACCESS_TOKEN=...
   # optional:
   supabase secrets set SQUARE_LOCATION_ID=...   # limit to one location
   supabase secrets set SQUARE_ENV=sandbox       # test against Square's sandbox
   ```

3. Deploy the function:

   ```bash
   supabase functions deploy square-sync
   ```

4. Sign in on the dashboard, open **Square Payments**, and press **Sync from Square**. Each Square payment, its processing fee, and any refunds are imported; re-syncing updates existing rows instead of duplicating them (they are matched on the Square transaction id). Manual entries and CSV imports are left alone.

## Tech Stack

- Vanilla HTML/CSS/JavaScript (single-file app)
- [Supabase](https://supabase.com) — auth + PostgreSQL database
- [PDF.js](https://mozilla.github.io/pdf.js/) — client-side PDF parsing for bank statements
