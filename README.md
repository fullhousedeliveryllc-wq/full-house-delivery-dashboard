# Full House Delivery Dashboard

Business dashboard for **Fullhouse Delivery LLC** — track customer jobs, revenues, and expenses across all your devices.

## Features

- **Customer & Job Tracking** — log deliveries by category (Furniture Store Warehouse, Furniture Store Floor Models, Move, Junk Removal, Repeat Customers, Online Customers, and custom categories) with customer details
- **Revenue & Expense Tracking** — log income and expenses with financial breakdowns (daily, weekly, monthly, quarterly)
- **Bank Statement Import** — upload CSV or PDF bank statements with automatic transaction categorization
- **Pie & Bar Charts** — visual overview of job distribution and financial performance
- **Cloud Sync via Supabase** — sign in to sync data across phone and computer; works offline with local storage fallback
- **Live Updates** — Supabase Realtime pushes changes made on one device to every other signed-in device
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

## Tech Stack

- Vanilla HTML/CSS/JavaScript (single-file app)
- [Supabase](https://supabase.com) — auth + PostgreSQL database
- [PDF.js](https://mozilla.github.io/pdf.js/) — client-side PDF parsing for bank statements
