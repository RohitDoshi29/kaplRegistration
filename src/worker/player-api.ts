/**
 * Cloudflare Worker - Player API Handler
 * Handles REST API endpoints for the player registration system using D1 database
 *
 * Deploy with:
 *   wrangler deploy
 *
 * Routes:
 *   GET    /api/players               - Get all players (paginated)
 *   GET    /api/players/:id           - Get player by ID
 *   GET    /api/players/search?q=...  - Search players
 *   GET    /api/players/tournament/:id - Get players by tournament
 *   GET    /api/players/status/:status - Get players by payment status
 *   POST   /api/players               - Create new player
 *   PATCH  /api/players/:id           - Update player
 *   DELETE /api/players/:id           - Delete player
 *   POST   /api/players/batch         - Batch insert players
 *   PATCH  /api/players/batch         - Batch update players
 *   GET    /api/stats                 - Get player statistics
 *   GET    /health                    - Health check
 */

import { Player, PlayerRole, PaymentStatus } from '../types';

// Type definitions for Cloudflare Workers environment
interface Env {
  DB: D1Database;
  API_KEY: string;
}

/**
 * Type guard for D1Database
 */
function isD1Database(db: any): db is D1Database {
  return db && typeof db === 'object';
}

/**
 * Validate API key from Authorization header
 */
function validateApiKey(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer') return false;

  return token === env.API_KEY;
}

/**
 * JSON response helper
 */
function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Error response helper
 */
function errorResponse(error: string, status: number = 400): Response {
  return jsonResponse({ error }, status);
}

/**
 * Handle CORS preflight requests
 */
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * GET /api/players - Get all players with optional filtering and pagination
 */
async function handleGetPlayers(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sortBy = url.searchParams.get('sortBy') || 'created_at';

    const validSortFields = ['name', 'created_at', 'jersey_number', 'payment_status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const orderAsc = url.searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';

    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const stmt = db.prepare(
      `SELECT * FROM players ORDER BY ${sortField} ${orderAsc} LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(limit, offset).all<Player>();

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM players');
    const countResult = await countStmt.first<{ count: number }>();

    return jsonResponse({
      players: result.results || [],
      total: countResult?.count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('GET /api/players error:', error);
    return errorResponse('Failed to fetch players', 500);
  }
}

/**
 * GET /api/players/:id - Get player by ID
 */
async function handleGetPlayerById(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  try {
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const stmt = db.prepare('SELECT * FROM players WHERE id = ?');
    const player = await stmt.bind(id).first<Player>();

    if (!player) {
      return errorResponse('Player not found', 404);
    }

    return jsonResponse({ player });
  } catch (error) {
    console.error('GET /api/players/:id error:', error);
    return errorResponse('Failed to fetch player', 500);
  }
}

/**
 * GET /api/players/search - Search players
 */
async function handleSearchPlayers(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return errorResponse('Search query must be at least 2 characters', 400);
    }

    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const searchPattern = `%${query}%`;
    const stmt = db.prepare(
      `SELECT * FROM players
       WHERE name LIKE ?
          OR mobile_number LIKE ?
          OR transaction_id LIKE ?
          OR flat_no LIKE ?
       LIMIT 50`
    );

    const result = await stmt
      .bind(searchPattern, searchPattern, searchPattern, searchPattern)
      .all<Player>();

    return jsonResponse({ players: result.results || [] });
  } catch (error) {
    console.error('GET /api/players/search error:', error);
    return errorResponse('Failed to search players', 500);
  }
}

/**
 * GET /api/players/tournament/:id - Get players by tournament
 */
async function handleGetByTournament(
  request: Request,
  env: Env,
  tournamentId: string
): Promise<Response> {
  try {
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const stmt = db.prepare(
      'SELECT * FROM players WHERE tournament_id = ? ORDER BY created_at DESC'
    );
    const result = await stmt.bind(tournamentId).all<Player>();

    return jsonResponse({ players: result.results || [] });
  } catch (error) {
    console.error('GET /api/players/tournament/:id error:', error);
    return errorResponse('Failed to fetch tournament players', 500);
  }
}

/**
 * GET /api/players/status/:status - Get players by payment status
 */
async function handleGetByStatus(
  request: Request,
  env: Env,
  status: string
): Promise<Response> {
  try {
    if (!['paid', 'pending'].includes(status)) {
      return errorResponse('Invalid payment status', 400);
    }

    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const stmt = db.prepare(
      'SELECT * FROM players WHERE payment_status = ? ORDER BY created_at DESC'
    );
    const result = await stmt.bind(status).all<Player>();

    return jsonResponse({ players: result.results || [] });
  } catch (error) {
    console.error('GET /api/players/status/:status error:', error);
    return errorResponse('Failed to fetch players by status', 500);
  }
}

/**
 * POST /api/players - Create new player
 */
async function handleCreatePlayer(request: Request, env: Env): Promise<Response> {
  try {
    const player = (await request.json()) as Partial<Player>;

    // Validate required fields
    if (!player.id || !player.name || !player.mobile_number) {
      return errorResponse('Missing required fields: id, name, mobile_number', 400);
    }

    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const createdAt = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO players (
        id, name, mobile_number, email, role, batting_style, bowling_style,
        jersey_number, tournament_id, base_price, photo_url, experience,
        previous_team, past_achievements, bio, gender, age, flat_no,
        payment_method, payment_status, transaction_id, payment_amount,
        payment_receipt_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const result = await stmt.bind(
      player.id,
      player.name,
      player.mobile_number,
      player.email || null,
      player.role || 'all_rounder',
      player.batting_style || 'Right-hand bat',
      player.bowling_style || 'Right-arm medium',
      player.jersey_number || null,
      player.tournament_id || 'kapl-3-mens',
      player.base_price || 100,
      player.photo_url || null,
      player.experience || null,
      player.previous_team || null,
      player.past_achievements || null,
      player.bio || null,
      player.gender || null,
      player.age || null,
      player.flat_no || null,
      player.payment_method || 'upi_qr',
      player.payment_status || 'pending',
      player.transaction_id || null,
      player.payment_amount || null,
      player.payment_receipt_url || null,
      createdAt,
      createdAt
    ).run();

    return jsonResponse({ player: { ...player, created_at: createdAt } }, 201);
  } catch (error) {
    console.error('POST /api/players error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create player';
    return errorResponse(message, 500);
  }
}

/**
 * PATCH /api/players/:id - Update player
 */
async function handleUpdatePlayer(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  try {
    const updates = (await request.json()) as Partial<Player>;

    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    // Check if player exists
    const checkStmt = db.prepare('SELECT id FROM players WHERE id = ?');
    const existing = await checkStmt.bind(id).first();

    if (!existing) {
      return errorResponse('Player not found', 404);
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at') {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    const updateStmt = db.prepare(
      `UPDATE players SET ${updateFields.join(', ')} WHERE id = ?`
    );

    await updateStmt.bind(...updateValues).run();

    // Fetch updated player
    const fetchStmt = db.prepare('SELECT * FROM players WHERE id = ?');
    const updatedPlayer = await fetchStmt.bind(id).first<Player>();

    return jsonResponse({ player: updatedPlayer });
  } catch (error) {
    console.error('PATCH /api/players/:id error:', error);
    return errorResponse('Failed to update player', 500);
  }
}

/**
 * DELETE /api/players/:id - Delete player
 */
async function handleDeletePlayer(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  try {
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const stmt = db.prepare('DELETE FROM players WHERE id = ?');
    await stmt.bind(id).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('DELETE /api/players/:id error:', error);
    return errorResponse('Failed to delete player', 500);
  }
}

/**
 * POST /api/players/batch - Batch insert players
 */
async function handleBatchInsert(request: Request, env: Env): Promise<Response> {
  try {
    const { players } = (await request.json()) as { players: Partial<Player>[] };

    if (!Array.isArray(players) || players.length === 0) {
      return errorResponse('No players to insert', 400);
    }

    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const createdAt = new Date().toISOString();

    for (const player of players) {
      const stmt = db.prepare(
        `INSERT INTO players (
          id, name, mobile_number, email, role, batting_style, bowling_style,
          jersey_number, tournament_id, base_price, photo_url, experience,
          previous_team, past_achievements, bio, gender, age, flat_no,
          payment_method, payment_status, transaction_id, payment_amount,
          payment_receipt_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      await stmt.bind(
        player.id,
        player.name,
        player.mobile_number,
        player.email || null,
        player.role || 'all_rounder',
        player.batting_style || 'Right-hand bat',
        player.bowling_style || 'Right-arm medium',
        player.jersey_number || null,
        player.tournament_id || 'kapl-3-mens',
        player.base_price || 100,
        player.photo_url || null,
        player.experience || null,
        player.previous_team || null,
        player.past_achievements || null,
        player.bio || null,
        player.gender || null,
        player.age || null,
        player.flat_no || null,
        player.payment_method || 'upi_qr',
        player.payment_status || 'pending',
        player.transaction_id || null,
        player.payment_amount || null,
        player.payment_receipt_url || null,
        createdAt,
        createdAt
      ).run();
    }

    return jsonResponse({ inserted: players.length }, 201);
  } catch (error) {
    console.error('POST /api/players/batch error:', error);
    return errorResponse('Failed to batch insert players', 500);
  }
}

/**
 * GET /api/stats - Get player statistics
 */
async function handleGetStats(request: Request, env: Env): Promise<Response> {
  try {
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    // Get all players
    const playersStmt = db.prepare('SELECT * FROM players');
    const playersResult = await playersStmt.all<Player>();
    const players = playersResult.results || [];

    const stats = {
      total: players.length,
      paid: 0,
      pending: 0,
      byGender: {} as Record<string, number>,
      byRole: {} as Record<PlayerRole, number>,
      byTournament: {} as Record<string, number>,
    };

    for (const player of players) {
      if (player.payment_status === 'paid') stats.paid++;
      if (player.payment_status === 'pending') stats.pending++;

      if (player.gender) {
        stats.byGender[player.gender] = (stats.byGender[player.gender] || 0) + 1;
      }

      if (player.role) {
        stats.byRole[player.role] = (stats.byRole[player.role] || 0) + 1;
      }

      if (player.tournament_id) {
        stats.byTournament[player.tournament_id] =
          (stats.byTournament[player.tournament_id] || 0) + 1;
      }
    }

    return jsonResponse(stats);
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return errorResponse('Failed to get statistics', 500);
  }
}

/**
 * GET /health - Health check endpoint
 */
function handleHealth(): Response {
  return jsonResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Main request router
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // Health check endpoint (no authentication)
    if (request.url.includes('/health')) {
      return handleHealth();
    }

    // Authenticate all other endpoints (disabled for now - no auth configured)
    // if (request.method !== 'GET' || request.url.includes('/api')) {
    //   if (!validateApiKey(request, env)) {
    //     return errorResponse('Unauthorized', 401);
    //   }
    // }

    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // Route matching
      if (pathname === '/api/players' && request.method === 'GET') {
        return handleGetPlayers(request, env);
      }

      if (pathname === '/api/players' && request.method === 'POST') {
        return handleCreatePlayer(request, env);
      }

      if (pathname === '/api/players/batch' && request.method === 'POST') {
        return handleBatchInsert(request, env);
      }

      if (pathname === '/api/stats' && request.method === 'GET') {
        return handleGetStats(request, env);
      }

      if (pathname.match(/^\/api\/players\/search\?/)) {
        return handleSearchPlayers(request, env);
      }

      if (pathname.match(/^\/api\/players\/tournament\/.+/)) {
        const tournamentId = pathname.split('/').pop();
        if (tournamentId) {
          return handleGetByTournament(request, env, tournamentId);
        }
      }

      if (pathname.match(/^\/api\/players\/status\/.+/)) {
        const status = pathname.split('/').pop();
        if (status) {
          return handleGetByStatus(request, env, status);
        }
      }

      if (pathname.match(/^\/api\/players\/[^/]+$/) && request.method === 'GET') {
        const id = pathname.split('/').pop();
        if (id) {
          return handleGetPlayerById(request, env, id);
        }
      }

      if (pathname.match(/^\/api\/players\/[^/]+$/) && request.method === 'PATCH') {
        const id = pathname.split('/').pop();
        if (id) {
          return handleUpdatePlayer(request, env, id);
        }
      }

      if (pathname.match(/^\/api\/players\/[^/]+$/) && request.method === 'DELETE') {
        const id = pathname.split('/').pop();
        if (id) {
          return handleDeletePlayer(request, env, id);
        }
      }

      return errorResponse('Not found', 404);
    } catch (error) {
      console.error('Unhandled error:', error);
      return errorResponse('Internal server error', 500);
    }
  },
};
