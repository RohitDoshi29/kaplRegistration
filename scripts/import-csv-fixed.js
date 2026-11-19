#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const D1_WORKER_URL = 'https://player-registration-portal.rohitdoshicolg.workers.dev';
const CSV_FILE = path.join(process.env.HOME || '/root', 'Downloads', 'players_rows.csv');

// Proper CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

async function importCSV() {
  try {
    if (!fs.existsSync(CSV_FILE)) {
      console.error(`❌ File not found: ${CSV_FILE}`);
      process.exit(1);
    }

    console.log(`📂 Reading CSV: ${CSV_FILE}\n`);

    const fileContent = fs.readFileSync(CSV_FILE, 'utf-8');
    const lines = fileContent.split('\n');

    let headers = [];
    let updated = 0;
    let failed = 0;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];

      if (!line.trim()) continue;

      const fields = parseCSVLine(line);

      if (lineNum === 0) {
        headers = fields;
        console.log(`📋 Headers found: ${headers.length} columns\n`);
        continue;
      }

      // Create object from headers and fields
      const player = {};
      headers.forEach((h, i) => {
        player[h.trim()] = fields[i];
      });

      const playerId = player.id;
      const photo = player.photo_url;
      const receipt = player.payment_receipt_url;

      if (!playerId) {
        continue;
      }

      const updates = {};

      if (photo && photo !== 'NULL' && photo.length > 10) {
        updates.photo_url = photo;
      }

      if (receipt && receipt !== 'NULL' && receipt.length > 10) {
        updates.payment_receipt_url = receipt;
      }

      if (Object.keys(updates).length === 0) {
        continue;
      }

      try {
        const updateRes = await fetch(`${D1_WORKER_URL}/api/players/${playerId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!updateRes.ok) {
          console.warn(`  ⚠️  ${playerId}: ${updateRes.status}`);
          failed++;
          continue;
        }

        updated++;
        if (updated % 5 === 0) {
          console.log(`  ✅ ${updated} players updated...`);
        }
      } catch (e) {
        console.warn(`  ❌ ${playerId}: ${e.message}`);
        failed++;
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`\n✅ Import complete!`);
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ❌ Failed: ${failed}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

importCSV();
