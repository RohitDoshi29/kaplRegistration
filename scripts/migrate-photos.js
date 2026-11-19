#!/usr/bin/env node

/**
 * Migrate photo URLs from Supabase to Cloudflare D1
 */

const SUPABASE_URL = 'https://jftwjqprwjeesivzmycy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdHdqcXByd2plZWVzaXZ6bXljeSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2OTkwMDY0MDAsImV4cCI6MTg0MTYzNDQwMH0.YiS7E8X1Z6-u4WI8eCeGFo5e3-kCOv3VLrqVcVfYZk4';
const D1_WORKER_URL = 'https://player-registration-portal.rohitdoshicolg.workers.dev';

async function migratePhotos() {
  try {
    console.log('📸 Fetching players from Supabase...');

    const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/players?select=id,photo_url`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!supabaseRes.ok) {
      throw new Error(`Supabase error: ${supabaseRes.status}`);
    }

    const players = await supabaseRes.json();
    console.log(`✅ Got ${players.length} players from Supabase`);

    let updated = 0;
    let skipped = 0;

    for (const player of players) {
      if (!player.photo_url || player.photo_url === 'NULL') {
        skipped++;
        continue;
      }

      console.log(`  Updating ${player.id}...`);

      const updateRes = await fetch(`${D1_WORKER_URL}/api/players/${player.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo_url: player.photo_url,
        }),
      });

      if (!updateRes.ok) {
        console.warn(`    ⚠️  Failed: ${updateRes.status}`);
        continue;
      }

      updated++;
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ⏭️  Skipped (no photo): ${skipped}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migratePhotos();
