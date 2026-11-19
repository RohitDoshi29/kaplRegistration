/**
 * D1 Test Queries - Validation script for D1 deployment
 * Run this to validate that D1 is working correctly
 *
 * Usage:
 *   npx ts-node scripts/d1-test-queries.ts
 */

async function runTests() {
  const workerUrl = process.env.D1_WORKER_URL || 'http://localhost:8787';
  const apiKey = process.env.D1_API_KEY || 'dev-api-key-123';

  console.log('\n=== D1 API Test Suite ===\n');
  console.log(`Worker URL: ${workerUrl}`);
  console.log(`Using API Key: ${apiKey ? 'configured' : 'not configured'}\n`);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  try {
    // Test 1: Health Check
    console.log('1. Testing health check endpoint...');
    const healthRes = await fetch(`${workerUrl}/health`);
    const health = await healthRes.json();
    console.log(`   Status: ${health.status}`);
    console.log(`   Timestamp: ${health.timestamp}\n`);

    // Test 2: Get all players (paginated)
    console.log('2. Fetching all players (limit=10)...');
    const playersRes = await fetch(`${workerUrl}/api/players?limit=10&offset=0`, {
      headers,
    });
    const playersData = await playersRes.json();
    console.log(`   Total players: ${playersData.total}`);
    console.log(`   Returned: ${playersData.players.length}`);
    if (playersData.players.length > 0) {
      console.log(`   Sample: ${playersData.players[0].name} (${playersData.players[0].role})\n`);
    } else {
      console.log('   (No players in database yet)\n');
    }

    // Test 3: Search players
    console.log('3. Searching for players (query="Virat")...');
    const searchRes = await fetch(`${workerUrl}/api/players/search?q=Virat`, {
      headers,
    });
    const searchData = await searchRes.json();
    console.log(`   Found: ${searchData.players?.length || 0} players\n`);

    // Test 4: Get statistics
    console.log('4. Fetching player statistics...');
    const statsRes = await fetch(`${workerUrl}/api/stats`, { headers });
    const stats = await statsRes.json();
    console.log(`   Total: ${stats.total}`);
    console.log(`   Paid: ${stats.paid}`);
    console.log(`   Pending: ${stats.pending}`);
    console.log(`   By Gender: ${JSON.stringify(stats.byGender)}`);
    console.log(`   By Role: ${JSON.stringify(stats.byRole)}`);
    console.log(`   By Tournament: ${JSON.stringify(stats.byTournament)}\n`);

    // Test 5: Create a player
    console.log('5. Creating a test player...');
    const newPlayer = {
      id: `player-test-${Date.now()}`,
      name: 'Test Player',
      mobile_number: `999999${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      email: `test-${Date.now()}@example.com`,
      role: 'all_rounder',
      batting_style: 'Right-hand bat',
      bowling_style: 'Right-arm medium',
      tournament_id: 'kapl-3-mens',
      base_price: 100,
      gender: 'male',
      age: 25,
      flat_no: 'TEST-01',
      payment_status: 'pending',
      created_at: new Date().toISOString(),
    };

    const createRes = await fetch(`${workerUrl}/api/players`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newPlayer),
    });

    if (createRes.ok) {
      const createdPlayer = await createRes.json();
      console.log(`   Created: ${createdPlayer.player?.name} (ID: ${createdPlayer.player?.id})\n`);

      // Test 6: Get player by ID
      console.log('6. Fetching player by ID...');
      const getRes = await fetch(`${workerUrl}/api/players/${createdPlayer.player?.id}`, {
        headers,
      });
      const player = await getRes.json();
      console.log(`   Retrieved: ${player.player?.name}`);
      console.log(`   Role: ${player.player?.role}`);
      console.log(`   Email: ${player.player?.email}\n`);

      // Test 7: Update player
      console.log('7. Updating player...');
      const updateRes = await fetch(`${workerUrl}/api/players/${createdPlayer.player?.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          role: 'batter',
          jersey_number: 42,
        }),
      });

      if (updateRes.ok) {
        const updated = await updateRes.json();
        console.log(`   Updated: ${updated.player?.name}`);
        console.log(`   New role: ${updated.player?.role}`);
        console.log(`   Jersey: ${updated.player?.jersey_number}\n`);

        // Test 8: Delete player
        console.log('8. Deleting player...');
        const deleteRes = await fetch(`${workerUrl}/api/players/${createdPlayer.player?.id}`, {
          method: 'DELETE',
          headers,
        });

        if (deleteRes.ok) {
          console.log('   Successfully deleted\n');
        }
      }
    } else {
      console.log(`   Failed to create player: ${createRes.status}\n`);
    }

    // Test 9: Get by tournament
    console.log('9. Fetching players by tournament (kapl-3-mens)...');
    const tournamentRes = await fetch(
      `${workerUrl}/api/players/tournament/kapl-3-mens`,
      { headers }
    );
    const tournamentData = await tournamentRes.json();
    console.log(`   Found: ${tournamentData.players?.length || 0} players\n`);

    // Test 10: Get by payment status
    console.log('10. Fetching players by payment status (paid)...');
    const statusRes = await fetch(`${workerUrl}/api/players/status/paid`, {
      headers,
    });
    const statusData = await statusRes.json();
    console.log(`   Found: ${statusData.players?.length || 0} players\n`);

    console.log('=== All tests completed! ===\n');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTests();
