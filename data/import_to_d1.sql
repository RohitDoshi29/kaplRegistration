-- D1 Players Table Schema
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
  payment_status TEXT DEFAULT 'pending',
  transaction_id TEXT UNIQUE,
  payment_amount REAL,
  payment_receipt_url TEXT,
  payment_verification TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(created_at);
CREATE INDEX IF NOT EXISTS idx_players_tournament_id ON players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_payment_status ON players(payment_status);
CREATE INDEX IF NOT EXISTS idx_players_transaction_id ON players(transaction_id);
