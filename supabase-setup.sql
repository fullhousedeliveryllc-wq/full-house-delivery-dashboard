-- ═══════════════════════════════════════════════════════════════
-- Full House Delivery Dashboard — Supabase Table Setup
-- Run this SQL in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/pgjqfgkxbmlpvzcgqire/sql
-- ═══════════════════════════════════════════════════════════════

-- 1. Categories table
CREATE TABLE IF NOT EXISTS categories (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Job entries table
CREATE TABLE IF NOT EXISTS job_entries (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    category    TEXT NOT NULL,
    amount      INT NOT NULL DEFAULT 1,
    revenue     NUMERIC(12,2) NOT NULL DEFAULT 0,
    customer    TEXT,
    phone       TEXT,
    email       TEXT,
    store_name  TEXT,
    referred_by TEXT,
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration: add revenue column if table already exists
ALTER TABLE job_entries ADD COLUMN IF NOT EXISTS revenue NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 3. Finance entries table
CREATE TABLE IF NOT EXISTS finance_entries (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    type        TEXT NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security (RLS) — each user can only access their own data
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_entries  ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Users can view their own categories"
    ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own categories"
    ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories"
    ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories"
    ON categories FOR DELETE USING (auth.uid() = user_id);

-- Job entries policies
CREATE POLICY "Users can view their own job entries"
    ON job_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own job entries"
    ON job_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own job entries"
    ON job_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own job entries"
    ON job_entries FOR DELETE USING (auth.uid() = user_id);

-- Finance entries policies
CREATE POLICY "Users can view their own finance entries"
    ON finance_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own finance entries"
    ON finance_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own finance entries"
    ON finance_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own finance entries"
    ON finance_entries FOR DELETE USING (auth.uid() = user_id);
