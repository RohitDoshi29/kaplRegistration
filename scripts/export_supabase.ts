/**
 * Export all player data from Supabase
 *
 * Usage:
 *   VITE_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx ts-node scripts/export_supabase.ts
 *
 * Output:
 *   - data/supabase_export.json (full JSON)
 *   - data/supabase_export.jsonl (JSON Lines - one record per line)
 *   - data/supabase_export.csv (CSV format)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing environment variables');
  console.error('  - VITE_SUPABASE_URL: ' + (supabaseUrl ? '✓' : '✗'));
  console.error('  - SUPABASE_SERVICE_ROLE_KEY: ' + (supabaseKey ? '✓' : '✗'));
  process.exit(1);
}

interface Player {
  id: string;
  name: string;
  mobile_number: string;
  email?: string | null;
  role: string;
  batting_style?: string | null;
  bowling_style?: string | null;
  jersey_number?: number | null;
  tournament_id?: string | null;
  base_price?: number | null;
  photo_url?: string | null;
  experience?: string | null;
  previous_team?: string | null;
  past_achievements?: string | null;
  bio?: string | null;
  gender?: string | null;
  age?: number | string | null;
  flat_no?: string | null;
  payment_method?: string | null;
  payment_status: string;
  transaction_id?: string | null;
  payment_amount?: number | null;
  payment_receipt_url?: string | null;
  payment_verification?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportPlayers() {
  console.log('🔄 Connecting to Supabase...');

  try {
    console.log('📊 Fetching all players from Supabase...');

    const { data, error, count } = await supabase
      .from('players')
      .select(
        `id, name, mobile_number, email, role, batting_style, bowling_style,
         jersey_number, tournament_id, base_price, photo_url, experience,
         previous_team, past_achievements, bio, gender, age, flat_no,
         payment_method, payment_status, transaction_id, payment_amount,
         payment_receipt_url, payment_verification, created_at, updated_at`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Export error:', error.message);
      process.exit(1);
    }

    const players = (data as Player[]) || [];
    console.log(`✅ Successfully fetched ${players.length} player records`);

    // Create data directory
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${dataDir}`);
    }

    // 1. Save as JSON
    const jsonPath = path.join(dataDir, 'supabase_export.json');
    fs.writeFileSync(jsonPath, JSON.stringify(players, null, 2), 'utf-8');
    const jsonSize = fs.statSync(jsonPath).size;
    console.log(`💾 Saved JSON export: ${jsonPath} (${formatBytes(jsonSize)})`);

    // 2. Save as JSONL (JSON Lines)
    const jsonlPath = path.join(dataDir, 'supabase_export.jsonl');
    const jsonlContent = players.map(p => JSON.stringify(p)).join('\n');
    fs.writeFileSync(jsonlPath, jsonlContent, 'utf-8');
    const jsonlSize = fs.statSync(jsonlPath).size;
    console.log(`💾 Saved JSONL export: ${jsonlPath} (${formatBytes(jsonlSize)})`);

    // 3. Save as CSV
    const csvPath = path.join(dataDir, 'supabase_export.csv');
    const csvContent = generateCSV(players);
    fs.writeFileSync(csvPath, csvContent, 'utf-8');
    const csvSize = fs.statSync(csvPath).size;
    console.log(`💾 Saved CSV export: ${csvPath} (${formatBytes(csvSize)})`);

    // 4. Generate summary
    const summary = generateSummary(players);
    const summaryPath = path.join(dataDir, 'export_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`📄 Saved export summary: ${summaryPath}`);

    // Print summary
    console.log('\n📊 EXPORT SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Total Records: ${summary.total_records}`);
    console.log(`With Photos: ${summary.with_photos} (${percentage(summary.with_photos, summary.total_records)}%)`);
    console.log(`With Payment Receipts: ${summary.with_payment_receipts} (${percentage(summary.with_payment_receipts, summary.total_records)}%)`);
    console.log(`With Emails: ${summary.with_emails} (${percentage(summary.with_emails, summary.total_records)}%)`);
    console.log('\nPayment Status Breakdown:');
    console.log(`  - Paid: ${summary.payment_status_breakdown.paid}`);
    console.log(`  - Pending: ${summary.payment_status_breakdown.pending}`);
    console.log(`  - Cash at Venue: ${summary.payment_status_breakdown.cash_venue}`);
    console.log('\nTournaments:');
    summary.tournaments.forEach(t => {
      const count = players.filter(p => p.tournament_id === t).length;
      console.log(`  - ${t}: ${count} players`);
    });
    console.log('\nRoles:');
    summary.roles.forEach(r => {
      const count = players.filter(p => p.role === r).length;
      console.log(`  - ${r}: ${count} players`);
    });
    console.log('═'.repeat(50));
    console.log('\n✅ Export completed successfully!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

function generateCSV(players: Player[]): string {
  const headers = [
    'Player ID',
    'Name',
    'Phone',
    'Email',
    'Gender',
    'Age',
    'Flat No',
    'Role',
    'Batting Style',
    'Bowling Style',
    'Experience',
    'Previous Team',
    'Past Achievements',
    'Bio',
    'Tournament',
    'Jersey Number',
    'Payment Method',
    'Payment Status',
    'Transaction ID',
    'Payment Amount',
    'Created At',
    'Updated At',
  ];

  const rows = players.map(p => [
    p.id || '',
    `"${(p.name || '').replace(/"/g, '""')}"`,
    p.mobile_number || '',
    p.email || '',
    p.gender || '',
    p.age || '',
    p.flat_no || '',
    p.role || '',
    p.batting_style || '',
    p.bowling_style || '',
    p.experience || '',
    `"${(p.previous_team || '').replace(/"/g, '""')}"`,
    `"${(p.past_achievements || '').replace(/"/g, '""')}"`,
    `"${(p.bio || '').replace(/"/g, '""')}"`,
    p.tournament_id || '',
    p.jersey_number || '',
    p.payment_method || '',
    p.payment_status || '',
    p.transaction_id || '',
    p.payment_amount || '',
    p.created_at || '',
    p.updated_at || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function generateSummary(players: Player[]) {
  return {
    total_records: players.length,
    with_photos: players.filter(p => p.photo_url).length,
    with_payment_receipts: players.filter(p => p.payment_receipt_url).length,
    with_emails: players.filter(p => p.email).length,
    average_age: calculateAverageAge(players),
    payment_status_breakdown: {
      paid: players.filter(p => p.payment_status === 'paid').length,
      pending: players.filter(p => p.payment_status === 'pending').length,
      cash_venue: players.filter(p => p.payment_status === 'cash_venue').length,
    },
    tournaments: [...new Set(players.map(p => p.tournament_id).filter(Boolean))].sort(),
    roles: [...new Set(players.map(p => p.role))].sort(),
    genders: [...new Set(players.map(p => p.gender).filter(Boolean))].sort(),
    export_timestamp: new Date().toISOString(),
  };
}

function calculateAverageAge(players: Player[]): number | null {
  const ages = players
    .map(p => {
      if (typeof p.age === 'string') return parseInt(p.age);
      return p.age;
    })
    .filter((a): a is number => a !== null && a !== undefined && !isNaN(a));

  if (ages.length === 0) return null;
  return Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function percentage(value: number, total: number): number {
  return Math.round((value / total) * 100);
}

exportPlayers().catch(console.error);
