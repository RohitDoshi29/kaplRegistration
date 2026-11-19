#!/usr/bin/env node

/**
 * Complete migration: Fetch all player data from Supabase and update D1 with photos & receipts
 */

const SUPABASE_URL = 'https://jftwjqprwjeesivzmycy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdHdqcXByd2plZWVzaXZ6bXljeSIsInJvbGUiOiJhbm9uIiwiaWEiOiIxNzAwMDA2NDAwIiwiZXhwIjoiMTg0MTYzNDQwMCJ9.A0FLZDx0nE8gk1f3iQCyVZGGg1K3J5h3Lf0RR1aL0so';
const D1_WORKER_URL = 'https://player-registration-portal.rohitdoshicolg.workers.dev';

async function migrateAllData() {
  try {
    console.log('📸 Fetching all players from Supabase (with photos & receipts)...');

    // Fetch from Supabase using pagination to avoid timeout
    let allPlayers = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/players?select=*&offset=${offset}&limit=50&order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Prefer': 'return=representation',
          },
        }
      );

      if (!res.ok) {
        console.error(`Supabase error at offset ${offset}: ${res.status}`);
        break;
      }

      const players = await res.json();
      console.log(`  📥 Got ${players.length} players (offset: ${offset})`);

      if (players.length === 0) {
        hasMore = false;
      } else {
        allPlayers = allPlayers.concat(players);
        offset += 50;
      }
    }

    console.log(`✅ Total fetched: ${allPlayers.length} players\n`);
    console.log('📤 Updating D1 with photos & receipts...');

    let updated = 0;
    let failed = 0;

    for (const player of allPlayers) {
      const updates = {};

      if (player.photo_url && player.photo_url !== 'NULL') {
        updates.photo_url = player.photo_url;
      }

      if (player.payment_receipt_url && player.payment_receipt_url !== 'NULL') {
        updates.payment_receipt_url = player.payment_receipt_url;
      }

      // Only update if there's something to update
      if (Object.keys(updates).length === 0) {
        continue;
      }

      try {
        const updateRes = await fetch(
          `${D1_WORKER_URL}/api/players/${player.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          }
        );

        if (!updateRes.ok) {
          console.warn(`  ⚠️  ${player.name}: ${updateRes.status}`);
          failed++;
          continue;
        }

        updated++;
        if (updated % 5 === 0) {
          console.log(`  ✅ ${updated} players updated...`);
        }
      } catch (e) {
        console.warn(`  ❌ ${player.name}: ${e.message}`);
        failed++;
      }

      // Rate limit: 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`  ✅ Updated with photos/receipts: ${updated}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⏭️  No photos/receipts to update: ${allPlayers.length - updated - failed}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrateAllData();
