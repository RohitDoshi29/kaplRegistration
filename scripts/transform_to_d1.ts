/**
 * Transform Supabase export data for Cloudflare D1 import
 *
 * Usage:
 *   npx ts-node scripts/transform_to_d1.ts
 *
 * Prerequisites:
 *   - Run scripts/export_supabase.ts first to generate data/supabase_export.json
 *
 * Output:
 *   - data/d1_import.json (transformed data)
 *   - data/d1_import_batch_*.sql (SQL insert statements split into batches)
 *   - data/d1_validation_report.json (statistics and validation results)
 */

import * as fs from 'fs';
import * as path from 'path';

interface SupabasePlayer {
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

interface D1Player extends SupabasePlayer {}

/**
 * Transform players data for D1
 * Main transformations:
 * - Ensure all required fields have default values
 * - Parse age as integer if string
 * - Normalize timestamps to ISO 8601
 * - Preserve base64 image data
 */
function transformPlayers(supabasePlayers: SupabasePlayer[]): D1Player[] {
  return supabasePlayers.map(p => ({
    ...p,
    // Ensure all required fields have values
    role: p.role || 'all_rounder',
    payment_status: p.payment_status || 'pending',
    // Parse age as integer if string
    age: typeof p.age === 'string' ? parseInt(p.age) || null : p.age,
    // Ensure timestamps are ISO 8601
    created_at: p.created_at ? normalizeTimestamp(p.created_at) : null,
    updated_at: p.updated_at ? normalizeTimestamp(p.updated_at) : null,
    // Preserve base64 images as-is
    photo_url: p.photo_url,
    payment_receipt_url: p.payment_receipt_url,
  }));
}

/**
 * Normalize timestamp to ISO 8601 format
 */
function normalizeTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid timestamp: ${timestamp}`);
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Generate SQL INSERT statements for D1
 * Splits into batches to avoid statement size limits
 */
function generateSQLInserts(players: D1Player[]): string[] {
  const inserts: string[] = [];

  for (const p of players) {
    const values = [
      escapeSQLValue(p.id),
      escapeSQLValue(p.name),
      escapeSQLValue(p.mobile_number),
      p.email ? escapeSQLValue(p.email) : 'NULL',
      escapeSQLValue(p.role),
      p.batting_style ? escapeSQLValue(p.batting_style) : 'NULL',
      p.bowling_style ? escapeSQLValue(p.bowling_style) : 'NULL',
      p.jersey_number ?? 'NULL',
      p.tournament_id ? escapeSQLValue(p.tournament_id) : 'NULL',
      p.base_price ?? 'NULL',
      p.photo_url ? escapeSQLValue(p.photo_url, 10_000_000) : 'NULL', // 10MB max
      p.experience ? escapeSQLValue(p.experience) : 'NULL',
      p.previous_team ? escapeSQLValue(p.previous_team) : 'NULL',
      p.past_achievements ? escapeSQLValue(p.past_achievements) : 'NULL',
      p.bio ? escapeSQLValue(p.bio) : 'NULL',
      p.gender ? escapeSQLValue(p.gender) : 'NULL',
      p.age ?? 'NULL',
      p.flat_no ? escapeSQLValue(p.flat_no) : 'NULL',
      p.payment_method ? escapeSQLValue(p.payment_method) : 'NULL',
      escapeSQLValue(p.payment_status),
      p.transaction_id ? escapeSQLValue(p.transaction_id) : 'NULL',
      p.payment_amount ?? 'NULL',
      p.payment_receipt_url ? escapeSQLValue(p.payment_receipt_url, 10_000_000) : 'NULL', // 10MB max
      p.payment_verification ? escapeSQLValue(p.payment_verification) : 'NULL',
      p.created_at ? escapeSQLValue(p.created_at) : 'NULL',
      p.updated_at ? escapeSQLValue(p.updated_at) : 'NULL',
    ];

    const insertSQL =
      `INSERT INTO players (id, name, mobile_number, email, role, batting_style, bowling_style, ` +
      `jersey_number, tournament_id, base_price, photo_url, experience, previous_team, past_achievements, ` +
      `bio, gender, age, flat_no, payment_method, payment_status, transaction_id, payment_amount, ` +
      `payment_receipt_url, payment_verification, created_at, updated_at) ` +
      `VALUES (${values.join(', ')});`;

    inserts.push(insertSQL);
  }

  return inserts;
}

/**
 * Escape SQL string values and handle large data
 */
function escapeSQLValue(value: string, maxLength?: number): string {
  let escaped = String(value).replace(/'/g, "''");

  if (maxLength && escaped.length > maxLength) {
    console.warn(`⚠️  Value truncated from ${escaped.length} to ${maxLength} characters`);
    escaped = escaped.slice(0, maxLength);
  }

  return `'${escaped}'`;
}

/**
 * Validate transformed data
 */
function validateData(players: D1Player[]) {
  const issues: string[] = [];

  console.log('\n🔍 VALIDATING DATA...');

  // Check required fields
  const missingName = players.filter(p => !p.name);
  if (missingName.length > 0) {
    issues.push(`❌ ${missingName.length} records missing name`);
  }

  const missingPhone = players.filter(p => !p.mobile_number);
  if (missingPhone.length > 0) {
    issues.push(`❌ ${missingPhone.length} records missing mobile_number`);
  }

  const missingRole = players.filter(p => !p.role);
  if (missingRole.length > 0) {
    issues.push(`❌ ${missingRole.length} records missing role`);
  }

  const missingPaymentStatus = players.filter(p => !p.payment_status);
  if (missingPaymentStatus.length > 0) {
    issues.push(`❌ ${missingPaymentStatus.length} records missing payment_status`);
  }

  // Check for duplicates
  const ids = players.map(p => p.id);
  const duplicateIds = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  if (duplicateIds.length > 0) {
    issues.push(`❌ ${duplicateIds.length} duplicate IDs found`);
  }

  // Check transaction IDs
  const txIds = players.map(p => p.transaction_id).filter(Boolean);
  const duplicateTxIds = txIds.filter((id, idx) => txIds.indexOf(id) !== idx);
  if (duplicateTxIds.length > 0) {
    issues.push(`❌ ${duplicateTxIds.length} duplicate transaction IDs found`);
  }

  // Check payment status values
  const validStatuses = ['paid', 'pending', 'cash_venue'];
  const invalidStatuses = players.filter(p => !validStatuses.includes(p.payment_status));
  if (invalidStatuses.length > 0) {
    issues.push(`❌ ${invalidStatuses.length} records with invalid payment_status`);
  }

  // Check for undefined values
  let undefinedCount = 0;
  players.forEach(p => {
    Object.values(p).forEach(v => {
      if (v === undefined) undefinedCount++;
    });
  });
  if (undefinedCount > 0) {
    issues.push(`⚠️  ${undefinedCount} undefined values found (should be null)`);
  }

  if (issues.length === 0) {
    console.log('✅ All validation checks passed!');
    return true;
  } else {
    issues.forEach(issue => console.log(issue));
    return false;
  }
}

async function main() {
  const exportPath = path.join(process.cwd(), 'data', 'supabase_export.json');

  // Check if export file exists
  if (!fs.existsSync(exportPath)) {
    console.error(`❌ Export file not found: ${exportPath}`);
    console.error('\n📝 Run this first to export data from Supabase:');
    console.error('   VITE_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx ts-node scripts/export_supabase.ts');
    process.exit(1);
  }

  console.log('📖 Loading Supabase export...');
  const rawData = fs.readFileSync(exportPath, 'utf-8');
  const supabasePlayers = JSON.parse(rawData) as SupabasePlayer[];
  console.log(`✅ Loaded ${supabasePlayers.length} player records`);

  console.log('\n🔄 Transforming data for D1...');
  const d1Players = transformPlayers(supabasePlayers);
  console.log(`✅ Transformation complete`);

  // Validate
  const isValid = validateData(d1Players);
  if (!isValid) {
    console.error('\n⚠️  Validation failed, but continuing with import...');
  }

  // Create data directory
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Save transformed JSON
  const jsonPath = path.join(dataDir, 'd1_import.json');
  fs.writeFileSync(jsonPath, JSON.stringify(d1Players, null, 2), 'utf-8');
  console.log(`\n💾 Saved transformed data: ${jsonPath}`);

  // Generate SQL inserts
  console.log('\n🔨 Generating SQL INSERT statements...');
  const inserts = generateSQLInserts(d1Players);
  console.log(`✅ Generated ${inserts.length} INSERT statements`);

  // Split into batches
  const batchSize = 100;
  console.log(`\n📦 Splitting into batches of ${batchSize}...`);

  for (let i = 0; i < inserts.length; i += batchSize) {
    const batch = inserts.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize);
    const filename = `d1_import_batch_${String(batchNum).padStart(4, '0')}.sql`;
    const filepath = path.join(dataDir, filename);

    const batchSQL =
      `-- ======================================================\n` +
      `-- Batch ${batchNum} (records ${i} to ${i + batch.length - 1})\n` +
      `-- ======================================================\n\n` +
      batch.join('\n') +
      `\n`;

    fs.writeFileSync(filepath, batchSQL, 'utf-8');
    console.log(`  ✓ ${filename} (${batch.length} records)`);
  }

  const totalBatches = Math.ceil(inserts.length / batchSize);
  console.log(`✅ Generated ${totalBatches} batch files\n`);

  // Generate validation report
  const report = {
    timestamp: new Date().toISOString(),
    source: 'Supabase',
    destination: 'Cloudflare D1',
    total_records: d1Players.length,
    with_photos: d1Players.filter(p => p.photo_url).length,
    with_payment_receipts: d1Players.filter(p => p.payment_receipt_url).length,
    payment_status_breakdown: {
      paid: d1Players.filter(p => p.payment_status === 'paid').length,
      pending: d1Players.filter(p => p.payment_status === 'pending').length,
      cash_venue: d1Players.filter(p => p.payment_status === 'cash_venue').length,
    },
    tournaments: [...new Set(d1Players.map(p => p.tournament_id).filter(Boolean))].sort(),
    roles: [...new Set(d1Players.map(p => p.role))].sort(),
    genders: [...new Set(d1Players.map(p => p.gender).filter(Boolean))].sort(),
    batch_count: totalBatches,
    batch_size: batchSize,
  };

  const reportPath = path.join(dataDir, 'd1_validation_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📊 Validation report: ${reportPath}`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TRANSFORMATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Records: ${report.total_records}`);
  console.log(`With Photos: ${report.with_photos}`);
  console.log(`With Payment Receipts: ${report.with_payment_receipts}`);
  console.log('\nPayment Status:');
  console.log(`  Paid: ${report.payment_status_breakdown.paid}`);
  console.log(`  Pending: ${report.payment_status_breakdown.pending}`);
  console.log(`  Cash at Venue: ${report.payment_status_breakdown.cash_venue}`);
  console.log('\nTournaments: ' + report.tournaments.join(', '));
  console.log('Roles: ' + report.roles.join(', '));
  console.log('\nNext Steps:');
  console.log(`  1. Deploy D1 schema: wrangler d1 execute player-registration-d1 --file supabase/migrations/d1_schema.sql`);
  console.log(`  2. Import data batches: for file in data/d1_import_batch_*.sql; do wrangler d1 execute player-registration-d1 --file $file; done`);
  console.log(`  3. Verify import: npx ts-node scripts/verify_d1_import.ts`);
  console.log('='.repeat(60) + '\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
