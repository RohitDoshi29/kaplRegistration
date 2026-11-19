-- Migration: Create players table for Cloudflare D1
-- This migration creates the main players table for the player registration portal

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL UNIQUE,
  email TEXT,
  role TEXT DEFAULT 'all_rounder',
  batting_style TEXT DEFAULT 'Right-hand bat',
  bowling_style TEXT DEFAULT 'Right-arm medium',
  jersey_number INTEGER,
  tournament_id TEXT DEFAULT 'kapl-3-mens',
  base_price INTEGER DEFAULT 100,
  photo_url TEXT,
  experience TEXT,
  previous_team TEXT,
  past_achievements TEXT,
  bio TEXT,
  gender TEXT,
  age INTEGER,
  flat_no TEXT,
  payment_method TEXT DEFAULT 'upi_qr',
  payment_status TEXT DEFAULT 'pending',
  transaction_id TEXT UNIQUE,
  payment_amount INTEGER,
  payment_receipt_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_players_tournament_id ON players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_payment_status ON players(payment_status);
CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_players_transaction_id ON players(transaction_id);
CREATE INDEX IF NOT EXISTS idx_players_mobile_number ON players(mobile_number);
