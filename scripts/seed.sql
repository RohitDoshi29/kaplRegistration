-- Test data for D1 seeding
-- Run with: wrangler d1 execute player-portal --remote --file=./scripts/seed.sql

INSERT INTO players (
  id, name, mobile_number, email, role, batting_style, bowling_style,
  jersey_number, tournament_id, base_price, photo_url, experience,
  previous_team, past_achievements, bio, gender, age, flat_no,
  payment_method, payment_status, transaction_id, payment_amount,
  payment_receipt_url, created_at, updated_at
) VALUES (
  'player-001',
  'Virat Sharma',
  '9876543210',
  'virat@example.com',
  'all_rounder',
  'Right-hand bat',
  'Right-arm medium',
  7,
  'kapl-3-mens',
  100,
  NULL,
  'both_seasons',
  "Kapil's Warriors",
  'Tournament winner 2024',
  'Aggressive batsman and medium pacer',
  'male',
  28,
  'A-101',
  'upi_qr',
  'paid',
  'UPI123456789012',
  500,
  NULL,
  datetime('now'),
  datetime('now')
);

INSERT INTO players (
  id, name, mobile_number, email, role, batting_style, bowling_style,
  jersey_number, tournament_id, base_price, photo_url, experience,
  previous_team, past_achievements, bio, gender, age, flat_no,
  payment_method, payment_status, transaction_id, payment_amount,
  payment_receipt_url, created_at, updated_at
) VALUES (
  'player-002',
  'Priya Verma',
  '9876543211',
  'priya@example.com',
  'batter',
  'Left-hand bat',
  'None / Occasional',
  12,
  'kapl-3-womens',
  100,
  NULL,
  'season_2',
  'Insta Paltans',
  'Best batter award',
  'Opening batter',
  'female',
  26,
  'B-205',
  'upi_qr',
  'pending',
  'UTR987654321098',
  500,
  NULL,
  datetime('now'),
  datetime('now')
);

INSERT INTO players (
  id, name, mobile_number, email, role, batting_style, bowling_style,
  jersey_number, tournament_id, base_price, photo_url, experience,
  previous_team, past_achievements, bio, gender, age, flat_no,
  payment_method, payment_status, transaction_id, payment_amount,
  payment_receipt_url, created_at, updated_at
) VALUES (
  'player-003',
  'Rohit Patel',
  '9876543212',
  'rohit@example.com',
  'bowler',
  'Right-hand bat',
  'Right-arm fast',
  3,
  'kapl-3-mens',
  100,
  NULL,
  'new_player',
  NULL,
  NULL,
  'Fast bowler',
  'male',
  24,
  'C-310',
  'upi_qr',
  'paid',
  'GPY345678901234',
  500,
  NULL,
  datetime('now'),
  datetime('now')
);
