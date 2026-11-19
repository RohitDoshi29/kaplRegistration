-- Data Import Template for D1
-- Instructions:
-- 1. Export data from Supabase: SELECT * FROM players; (as CSV or JSON)
-- 2. Transform data to match D1 schema
-- 3. Replace sample values below with actual data
-- 4. Run: wrangler d1 execute player-portal --remote --file=./scripts/import-data.sql

-- Example: Import from Supabase export
-- Ensure all fields are properly formatted:
-- - IDs: TEXT (UUID format)
-- - Numbers: INTEGER or DECIMAL
-- - Dates: TEXT (ISO 8601 format: 2024-01-01T00:00:00Z)
-- - Booleans: INTEGER (0 or 1) or TEXT ('true'/'false')
-- - NULL values: NULL (not empty string)

-- WARNING: Adjust column names if your Supabase schema differs from D1 schema

-- Batch insert from Supabase data
-- Copy the entire SELECT result from Supabase and adapt below

-- Option 1: Direct CSV import (if wrangler supports it)
-- wrangler d1 execute player-portal --remote --file=./data/players.csv

-- Option 2: SQL INSERT statements (shown below)

-- IMPORTANT: Back up D1 before importing
-- wrangler d1 export player-portal --remote > backup.sql

-- Example Insert Statement (uncomment and modify with real data):
/*
INSERT INTO players (
  id, name, mobile_number, email, role, batting_style, bowling_style,
  jersey_number, tournament_id, base_price, photo_url, experience,
  previous_team, past_achievements, bio, gender, age, flat_no,
  payment_method, payment_status, transaction_id, payment_amount,
  payment_receipt_url, created_at, updated_at
) VALUES (
  'uuid-1', 'Player Name', '9876543210', 'email@example.com', 'all_rounder',
  'Right-hand bat', 'Right-arm medium', NULL, 'kapl-3-mens', 100, NULL,
  'season_1', 'Previous Team', NULL, 'Bio text', 'male', 25, 'A-101',
  'upi_qr', 'paid', 'UTR123456789012', 500, NULL,
  '2024-01-01T10:00:00Z', '2024-01-01T10:00:00Z'
);
*/

-- Migration checklist:
-- 1. Verify schema matches between Supabase and D1
-- 2. Check data types (especially dates and numbers)
-- 3. Ensure all required fields are non-null
-- 4. Verify transaction_id and mobile_number are unique
-- 5. Test with sample data first
-- 6. Run backup before full import
-- 7. Monitor import performance

-- Data transformation notes:
-- - Supabase timestamps (with timezone) → D1 TEXT ISO 8601
-- - UUIDs stay as TEXT
-- - Numbers: ensure INTEGER types for jersey_number, age, base_price, payment_amount
-- - Boolean values (if any): convert to TEXT ('true'/'false') or INTEGER (0/1)
-- - BLOB/BYTEA fields: may need base64 encoding

-- Testing:
-- SELECT COUNT(*) FROM players;  -- Verify row count
-- SELECT * FROM players LIMIT 5; -- Spot check first 5 rows
-- SELECT payment_status, COUNT(*) FROM players GROUP BY payment_status; -- Verify distribution
