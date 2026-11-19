#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const D1_WORKER_URL = 'https://player-registration-portal.rohitdoshicolg.workers.dev';
const CSV_FILE = path.join(process.env.HOME || '/root', 'Downloads', 'players_rows.csv');

async function importCSV() {
  try {
    if (!fs.existsSync(CSV_FILE)) {
      console.error(`❌ File not found: ${CSV_FILE}`);
      process.exit(1);
    }

    console.log(`📂 Reading CSV: ${CSV_FILE}\n`);

    const fileStream = fs.createReadStream(CSV_FILE);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let headers = [];
    let lineCount = 0;
    let updated = 0;
    let failed = 0;

    for await (const line of rl) {
      lineCount++;

      // Skip empty lines
      if (!line.trim()) continue;

      // Parse CSV (simple - assumes no commas in quoted fields)
      const fields = line.split(',');

      if (lineCount === 1) {
        headers = fields;
        console.log(`📋 Headers found: ${headers.length} columns\n`);
        continue;
      }

      // Create object from headers and fields
      const player = {};
      headers.forEach((h, i) => {
        player[h] = fields[i];
      });

      const playerId = player.id;
      const photo = player.photo_url;
      const receipt = player.payment_receipt_url;

      if (!playerId) {
        console.warn(`⚠️  Line ${lineCount}: No ID found`);
        continue;
      }

      const updates = {};

      if (photo && photo !== 'NULL') {
        updates.photo_url = photo;
      }

      if (receipt && receipt !== 'NULL') {
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
    console.log(`  📈 Total lines processed: ${lineCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

importCSV();
