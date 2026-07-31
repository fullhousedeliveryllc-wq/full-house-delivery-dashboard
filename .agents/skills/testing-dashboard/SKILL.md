---
name: testing-dashboard
description: Test the Full House Delivery Dashboard end-to-end. Use when verifying UI, localStorage, auth modal, or Supabase sync changes.
---

# Testing the Full House Delivery Dashboard

## Prerequisites

- The repo is a single `index.html` file with inline JS/CSS — no build step required.
- Supabase tables must exist before testing cloud sync. The user must run `supabase-setup.sql` in the Supabase SQL Editor. Without this, auth sign-up/sign-in will work but data sync calls will return 404.

## Devin Secrets Needed

None required for local-only testing. The Supabase anon key is hardcoded in `index.html` (it's a public key, safe to embed).

## Environment Setup

1. Start a local HTTP server from the repo root:
   ```bash
   cd /home/ubuntu/full-house-delivery-dashboard
   python3 -m http.server 8080 &
   ```
2. Open `http://localhost:8080/index.html` in the browser.
3. The dashboard should load with the "Local Only" badge and "Sign In" button in the auth bar.

## Key Test Flows

### 1. Dashboard Load
- Verify header ("Fullhouse Delivery LLC"), auth bar ("Local Only" + "Sign In"), two tabs, and summary strip (0/3/0 for fresh state).

### 2. Job Entry CRUD (Customer & Jobs tab)
- Fill form: set Number of Jobs, Customer Name, and optionally Store Name or Referred By (depending on category).
- Click "Add Entry" — verify toast notification, summary strip update, pie chart rendering.
- Reload page — verify data persists via localStorage.

### 3. Finance Entry (Revenues & Expenses tab)
- Switch to finance tab, add a Money Received entry with an amount.
- Verify summary cards update (Total Revenue, Net Profit), bar chart renders.
- Reload — verify persistence.

### 4. Auth Modal
- Click "Sign In" button — modal appears with email/password, Sign In button, Sign Up toggle, and skip option.
- Click "Sign Up" link — button changes to "Create Account", toggle changes to "Already have an account?".
- Click "Continue without account" — modal closes, data remains intact.
- If Supabase tables exist: test actual sign-up with a test email, verify "Synced" badge appears and data uploads.

### 5. Conditional Form Fields
- "Furniture Store Jobs" category: "Furniture Store Name" field visible.
- "Repeat Customers" category: both "Furniture Store Name" and "Referred By" hidden.
- "Online Customers" category: "Referred By" dropdown visible (Google, Website, Miscellaneous).

## Known Issues / Tips

- The dashboard uses Chart.js loaded via CDN — if offline or CDN is slow, charts may not render.
- Supabase JS client is loaded via CDN (`@supabase/supabase-js@2`). Network issues may cause the client to be undefined.
- If testing Supabase sync, the first sign-in with existing local data should trigger an upload (not overwrite). This was a bug that was fixed — verify by checking that local entries survive the first sign-in.
- Rapid saves (e.g., adding multiple entries quickly) are protected by a debounced sync guard. If testing race conditions, add entries in quick succession and verify no data duplication.
- The deployed version is at `https://fullhousedeliveryllc-wq.github.io/full-house-delivery-dashboard/` — but for testing PR branches, use the local server.

### Supabase Auth Rate Limits
- Supabase free tier has an email rate limit (~4 emails/hour). If you hit it during sign-up testing, the Supabase JS client may return a **misleading error message** like `Email address "x@y.com" is invalid` when the actual API error is `429 over_email_send_rate_limit`.
- To verify the real error, use curl directly against the Supabase auth endpoint:
  ```bash
  curl -s -X POST "https://pgjqfgkxbmlpvzcgqire.supabase.co/auth/v1/signup" \
    -H "apikey: <ANON_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@gmail.com","password":"TestPass123!"}'
  ```
- If rate-limited, wait ~1 hour or ask the user to check their Supabase Auth settings (Authentication > Settings) to increase the rate limit or enable auto-confirm to reduce email sends.
- Supabase by default requires email confirmation for new sign-ups. If auto-confirm is not enabled, users will need to confirm their email before they can sign in. For testing, it may help to enable "Confirm email" toggle off in Supabase Auth settings.
