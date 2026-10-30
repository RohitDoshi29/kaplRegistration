# Supabase Configuration & Setup

## New Project Credentials (Updated 2026-10-28)

```
Project URL: https://jftwjqprwjeesivzmycy.supabase.co
Anon Key: sb_publishable_r0U5JThsuKCB5wqX5s9aXQ_wQgamwTs
```

✅ Already updated in:
- `.env` file
- `src/lib/supabase.ts`

---

## Setup Steps

### 1. Create Database Schema

Go to **Supabase Dashboard → SQL Editor → New Query** and paste this:

```sql
-- Create players table
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile_number text not null, -- Non-unique: allows family/friends to register multiple players
  email text,
  role text not null check (role in ('batter', 'bowler', 'all_rounder', 'wicket_keeper')),
  batting_style text,
  bowling_style text,
  jersey_number integer,
  tournament_id text,
  base_price numeric,
  photo_url text,
  experience text,
  previous_team text,
  past_achievements text,
  bio text,
  gender text check (gender in ('male', 'female', null)),
  age integer,
  flat_no text,
  payment_method text check (payment_method in ('upi_qr', 'cash', 'bank_transfer', null)),
  payment_status text not null default 'pending' check (payment_status in ('paid', 'pending', 'cash_venue')),
  transaction_id text unique,
  payment_amount numeric,
  payment_receipt_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Migration for existing tables (run this if you already have the table created):
ALTER TABLE players ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE players ADD COLUMN IF NOT EXISTS flat_no text;
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_mobile_number_key; -- Allow multiple registrations per phone number

-- Enable Row Level Security
alter table players enable row level security;

-- Allow anyone to read players (for live feed)
create policy "Players are publicly readable" on players
  for select using (true);

-- Allow anyone to insert their own player data
create policy "Allow inserts for new players" on players
  for insert with check (true);

-- Allow updates to own records
create policy "Allow updates to own records" on players
  for update using (true);

-- Allow deletes on records
create policy "Allow deletes on players" on players
  for delete using (true);

-- Create index on tournament_id for faster filtering
create index idx_players_tournament on players(tournament_id);

-- Create index on payment_status for payment queries
create index idx_players_payment_status on players(payment_status);

-- Enable full replica identity (REQUIRED for Supabase Realtime DELETE events)
alter table players replica identity full;

-- Enable realtime for live updates
alter publication supabase_realtime add table players;
```

### 2. Create Storage Bucket (Optional - for photo uploads)

```sql
-- Create storage bucket for player photos
insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true);

-- Set storage policy to allow public uploads
create policy "Allow public uploads" on storage.objects
  for insert with check (bucket_id = 'player-photos');

-- Allow public reads
create policy "Allow public read" on storage.objects
  for select using (bucket_id = 'player-photos');

-- Allow users to delete their own uploads
create policy "Allow delete own files" on storage.objects
  for delete using (bucket_id = 'player-photos');
```

---

## Bug Fixes Applied ✅

### 1. **Supabase Submission Error Handling** (Line 281-298)
- ❌ **Before**: Silently caught insert errors with `console.warn()`
- ✅ **After**: Now throws proper error so users see a false-success message only if insert actually succeeds

### 2. **Payment Status Logic** (Line 144)
- ❌ **Before**: Hardcoded all players as `payment_status: 'paid'`
- ✅ **After**: Now reads actual `payment_status` from Supabase database

### 3. **Experience & Previous Team UI** (Added section 4)
- ❌ **Before**: Form logic existed but no UI inputs
- ✅ **After**: Added full form section with:
  - Experience dropdown (New / Casual / Semi-Professional / Professional)
  - Previous Team selector (shows only if experience ≠ new)
  - Custom team input (shows only if "Other / Custom Franchise" selected)
  - Past Achievements textarea

### 4. **Tournament Filter in Roster** (Added filter chips)
- ❌ **Before**: State existed but no filter buttons
- ✅ **After**: Added tournament filter chips:
  - All Tournaments
  - Men's League (kapl-3-mens)
  - Women's League (kapl-3-womens)

### 5. **Form Fields in Insert**
- ✅ Added missing fields: `email`, `experience`, `previous_team` to Supabase insert
- ✅ Properly handles `mobile_number` in player mapping

---

## Testing Checklist

- [ ] Run SQL to create tables
- [ ] Test registration form → verify data appears in Supabase
- [ ] Check payment_status in database (should be 'pending' or 'paid')
- [ ] Use Experience/Previous Team form fields
- [ ] Filter roster by tournament
- [ ] Test error handling: try submitting with duplicate phone number (should error)

---

## Environment

The app now uses:
- **Dev**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`
- **Production**: Same (make sure to update `.env` with prod credentials if deploying)

Start dev server:
```bash
npm run build
npm run dev  # or npm run preview
```
