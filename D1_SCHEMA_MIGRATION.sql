-- ============================================================================
-- Cloudflare D1 Schema for Player Registration Portal
-- ============================================================================
-- This script creates the complete schema for migrating from Supabase PostgreSQL
-- to Cloudflare D1 (SQLite)
--
-- Key differences from PostgreSQL:
-- - SQLite uses TEXT for UUIDs instead of UUID type
-- - No native ENUM types, validation done in application
-- - Foreign keys disabled by default, must be enabled with PRAGMA
-- - Timestamps stored as ISO 8601 TEXT format
-- - NUMERIC stored as REAL (float)
--
-- ============================================================================

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================================================
-- PLAYERS TABLE
-- ============================================================================
-- Core table storing all player registration data including:
-- - Demographics: name, mobile, email, age, gender
-- - Cricket skills: role, batting/bowling style
-- - Registration: jersey number, tournament, experience
-- - Payment: status, method, transaction ID, receipts
-- - Media: photos, payment receipts (stored as base64 URLs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,
  batting_style TEXT,
  bowling_style TEXT,
  jersey_number INTEGER,
  tournament_id TEXT,
  base_price REAL,
  photo_url TEXT,
  experience TEXT,
  previous_team TEXT,
  past_achievements TEXT,
  bio TEXT,
  gender TEXT,
  age INTEGER,
  flat_no TEXT,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT UNIQUE,
  payment_amount REAL,
  payment_receipt_url TEXT,
  payment_verification TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Optimized queries for common filtering operations

-- Index for tournament filtering (used in roster display)
CREATE INDEX IF NOT EXISTS idx_players_tournament ON players(tournament_id);

-- Index for payment status filtering (reporting, verification)
CREATE INDEX IF NOT EXISTS idx_players_payment_status ON players(payment_status);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(created_at DESC);

-- Index for phone number lookup (duplicate detection)
CREATE INDEX IF NOT EXISTS idx_players_mobile_number ON players(mobile_number);

-- Index for transaction ID lookup (payment duplicate detection)
CREATE INDEX IF NOT EXISTS idx_players_transaction_id ON players(transaction_id);

-- ============================================================================
-- MIGRATION METADATA TABLE
-- ============================================================================
-- Tracks migration history and system state

CREATE TABLE IF NOT EXISTS _migration_metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Record initial schema information
INSERT OR IGNORE INTO _migration_metadata (key, value) VALUES
  ('schema_version', '1.0'),
  ('source_system', 'supabase_postgresql'),
  ('destination_system', 'cloudflare_d1'),
  ('migration_type', 'postgresql_to_sqlite');

-- ============================================================================
-- VIEW: Payment Status Summary
-- ============================================================================
-- Useful for payment verification and reporting

CREATE VIEW IF NOT EXISTS players_payment_summary AS
SELECT
  payment_status,
  COUNT(*) as count,
  SUM(CAST(payment_amount AS REAL)) as total_amount,
  AVG(CAST(payment_amount AS REAL)) as avg_amount
FROM players
GROUP BY payment_status;

-- ============================================================================
-- VIEW: Tournament Statistics
-- ============================================================================
-- Analytics for each tournament

CREATE VIEW IF NOT EXISTS tournament_stats AS
SELECT
  tournament_id,
  COUNT(*) as total_players,
  SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female_count,
  SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male_count,
  SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
  SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
  SUM(CASE WHEN payment_status = 'cash_venue' THEN 1 ELSE 0 END) as cash_venue_count
FROM players
GROUP BY tournament_id;

-- ============================================================================
-- CONSTRAINTS VALIDATION QUERIES
-- ============================================================================
-- These queries validate data integrity. Run after import to verify:

-- Verify all required fields are present
-- SELECT COUNT(*) as issues FROM players
-- WHERE name IS NULL OR mobile_number IS NULL OR role IS NULL OR payment_status IS NULL;

-- Verify payment status values are valid
-- SELECT DISTINCT payment_status FROM players
-- WHERE payment_status NOT IN ('paid', 'pending', 'cash_venue');

-- Verify role values are valid
-- SELECT DISTINCT role FROM players
-- WHERE role NOT IN ('batter', 'bowler', 'all_rounder', 'wicket_keeper');

-- Verify gender values are valid
-- SELECT DISTINCT gender FROM players
-- WHERE gender NOT IN ('male', 'female', NULL);

-- Check for duplicate IDs
-- SELECT id, COUNT(*) as count FROM players
-- GROUP BY id HAVING count > 1;

-- Check for duplicate transaction IDs
-- SELECT transaction_id, COUNT(*) as count FROM players
-- WHERE transaction_id IS NOT NULL
-- GROUP BY transaction_id HAVING count > 1;

-- ============================================================================
-- HELPFUL QUERIES FOR DATA VERIFICATION
-- ============================================================================

-- Total players by tournament
-- SELECT tournament_id, COUNT(*) as total FROM players GROUP BY tournament_id;

-- Payment status summary
-- SELECT payment_status, COUNT(*) as total FROM players GROUP BY payment_status;

-- Players with photos
-- SELECT COUNT(*) as total FROM players WHERE photo_url IS NOT NULL;

-- Players with payment receipts
-- SELECT COUNT(*) as total FROM players WHERE payment_receipt_url IS NOT NULL;

-- Average age
-- SELECT AVG(age) as average_age FROM players WHERE age IS NOT NULL;

-- Players missing email
-- SELECT COUNT(*) as total FROM players WHERE email IS NULL;

-- Recent registrations (last 7 days)
-- SELECT * FROM players WHERE datetime(created_at) >= datetime('now', '-7 days');

-- ============================================================================
-- DATA IMPORT PROCEDURE
-- ============================================================================
-- After creating this schema, import data using:
--
-- 1. Using SQL batch files (recommended):
--    for file in data/d1_import_batch_*.sql; do
--      wrangler d1 execute player-registration-d1 --file "$file"
--    done
--
-- 2. Verify import completed:
--    wrangler d1 execute player-registration-d1 \
--      --command "SELECT COUNT(*) as total FROM players;"
--
-- 3. Run verification script:
--    npx ts-node scripts/verify_d1_import.ts
--
-- ============================================================================

-- ============================================================================
-- ROLLBACK PROCEDURE (if needed)
-- ============================================================================
-- If issues are discovered during migration:
--
-- 1. Drop all tables and views:
--    DROP VIEW IF EXISTS tournament_stats;
--    DROP VIEW IF EXISTS players_payment_summary;
--    DROP TABLE IF EXISTS players;
--    DROP TABLE IF EXISTS _migration_metadata;
--
-- 2. Re-run this script to recreate schema
-- 3. Restore from backup if data was corrupted
--
-- ============================================================================
