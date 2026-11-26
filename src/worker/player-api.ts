/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare Worker - Player API Handler
 * Handles REST API endpoints for the player registration system using D1 database
 *
 * Deploy with:
 *   wrangler deploy
 *
 * Routes:
 *   GET    /api/players               - Get all players (paginated)
 *   GET    /api/players/:id/photo     - Get decoded player profile photo
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

import { Buffer } from 'node:buffer';
import { Player, PlayerRole, PaymentStatus } from '../types';

// Type definitions for Cloudflare Workers environment
interface Env {
  DB: D1Database;
  API_KEY?: string;
  RESEND_API_KEY?: string;
  ALERT_TO_EMAIL?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
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

const PHOTO_API_MARKER = '__PHOTO_API__';

/**
 * Build SQL projection for player queries.
 * By default omits heavy payment_receipt_url blobs and replaces data: photo_urls
 * with a lightweight marker hydrated into /api/players/:id/photo URLs so responses
 * stay well under Cloudflare Worker CPU and payload limits.
 */
function buildPlayerSelect(options: { includePhotos?: boolean; includeReceipts?: boolean } = {}): string {
  const { includePhotos = false, includeReceipts = false } = options;
  const photoExpr = includePhotos
    ? "NULLIF(photo_url, 'NULL') as photo_url"
    : `CASE WHEN photo_url LIKE 'data:%' THEN '${PHOTO_API_MARKER}' ELSE NULLIF(photo_url, 'NULL') END as photo_url`;
  const receiptExpr = includeReceipts
    ? ", NULLIF(payment_receipt_url, 'NULL') as payment_receipt_url"
    : '';

  return `
    NULLIF(id, 'NULL') as id,
    NULLIF(name, 'NULL') as name,
    NULLIF(mobile_number, 'NULL') as mobile_number,
    NULLIF(email, 'NULL') as email,
    NULLIF(role, 'NULL') as role,
    NULLIF(batting_style, 'NULL') as batting_style,
    NULLIF(bowling_style, 'NULL') as bowling_style,
    jersey_number,
    NULLIF(tournament_id, 'NULL') as tournament_id,
    base_price,
    ${photoExpr},
    NULLIF(experience, 'NULL') as experience,
    NULLIF(previous_team, 'NULL') as previous_team,
    NULLIF(past_achievements, 'NULL') as past_achievements,
    NULLIF(bio, 'NULL') as bio,
    NULLIF(gender, 'NULL') as gender,
    age,
    NULLIF(flat_no, 'NULL') as flat_no,
    NULLIF(payment_method, 'NULL') as payment_method,
    NULLIF(payment_status, 'NULL') as payment_status,
    NULLIF(transaction_id, 'NULL') as transaction_id,
    payment_amount,
    NULLIF(payment_verification, 'NULL') as payment_verification,
    NULLIF(created_at, 'NULL') as created_at,
    NULLIF(updated_at, 'NULL') as updated_at${receiptExpr}
  `;
}

/**
 * Hydrate __PHOTO_API__ marker into an absolute /api/players/:id/photo URL.
 */
function hydratePhotoUrl<T extends { id?: string; photo_url?: string | null }>(player: T, origin: string): T {
  if (player.photo_url === PHOTO_API_MARKER && player.id) {
    return { ...player, photo_url: `${origin}/api/players/${encodeURIComponent(player.id)}/photo` };
  }
  return player;
}

/**
 * Convert "NULL" string values to actual null
 */
function cleanNullStrings(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanNullStrings);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k,
        v === 'NULL' ? null : cleanNullStrings(v),
      ])
    );
  }
  return obj;
}

/**
 * Send email alert when player registers
 */
async function sendRegistrationEmail(player: Player, env: Env): Promise<void> {
  try {
    const apiKey = env.RESEND_API_KEY;
    const toEmail = env.ALERT_TO_EMAIL || 'rohit.doshi2007@gmail.com';

    console.log('📧 Starting email send...');
    console.log('   To:', toEmail);
    console.log('   API Key exists:', !!apiKey);

    if (!apiKey) {
      console.warn('❌ No Resend API key configured');
      return;
    }

    console.log('📤 Calling Resend API...');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: toEmail,
        subject: `🎯 New Player Registration: ${player.name}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
                <div style="background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden;">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🎯 New Player Registration!</h1>
                  </div>

                  <!-- Content -->
                  <div style="padding: 30px 20px;">
                    <p style="color: #333; font-size: 16px; margin-top: 0;">A new player has registered for the tournament:</p>

                    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                      <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 12px; font-weight: 600; color: #667eea; width: 35%;">Name</td>
                        <td style="padding: 12px; color: #333;">${player.name}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 12px; font-weight: 600; color: #667eea;">Mobile</td>
                        <td style="padding: 12px; color: #333;">${player.mobile_number}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 12px; font-weight: 600; color: #667eea;">Email</td>
                        <td style="padding: 12px; color: #333;">${player.email || 'Not provided'}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 12px; font-weight: 600; color: #667eea;">Role</td>
                        <td style="padding: 12px; color: #333;">${player.role || 'Not specified'}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 12px; font-weight: 600; color: #667eea;">Flat/Block</td>
                        <td style="padding: 12px; color: #333;">${player.flat_no || 'Not provided'}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 12px; font-weight: 600; color: #667eea;">Age</td>
                        <td style="padding: 12px; color: #333;">${player.age || 'Not provided'}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 12px; font-weight: 600; color: #667eea;">Payment Status</td>
                        <td style="padding: 12px; color: #333;">
                          <span style="background: ${player.payment_status === 'paid' ? '#4caf50' : '#ff9800'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                            ${(player.payment_status || 'pending').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px; font-weight: 600; color: #667eea;">Transaction ID</td>
                        <td style="padding: 12px; color: #333;">${player.transaction_id || 'Not provided'}</td>
                      </tr>
                    </table>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
                      <p style="margin: 5px 0;">Registered: ${new Date().toLocaleString()}</p>
                      <p style="margin: 5px 0;">From: KAPL Cricket Tournament Registration Portal</p>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div style="background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999; font-size: 12px; margin: 0;">© 2026 KAPL Cricket Tournament. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    console.log('✅ Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Resend API error:', response.status, errorText);
      return;
    }

    const data = (await response.json()) as any;
    console.log('✅ Email sent successfully! ID:', data?.id);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

/**
 * Resolve SQL ORDER BY clause safely from query params.
 */
function resolveOrderBy(sortBy: string, orderParam: string | null): string {
  switch (sortBy) {
    case 'oldest':
      return 'created_at ASC';
    case 'newest':
      return 'created_at DESC';
    case 'name':
      return `name ${orderParam === 'desc' ? 'DESC' : 'ASC'}`;
    case 'jersey':
    case 'jersey_number':
      return `jersey_number ${orderParam === 'desc' ? 'DESC' : 'ASC'}`;
    case 'payment_status':
      return `payment_status ${orderParam === 'asc' ? 'ASC' : 'DESC'}`;
    case 'created_at':
    default:
      return `created_at ${orderParam === 'asc' ? 'ASC' : 'DESC'}`;
  }
}

/**
 * GET /api/players - Get all players with optional filtering and pagination
 */
async function handleGetPlayers(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const parsedLimit = parseInt(url.searchParams.get('limit') || '50', 10);
    const parsedOffset = parseInt(url.searchParams.get('offset') || '0', 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;
    const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const orderBy = resolveOrderBy(sortBy, url.searchParams.get('order'));

    const includePhotos = url.searchParams.get('includePhotos') === 'true';
    const includeReceipts = url.searchParams.get('includeReceipts') === 'true';

    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const columns = buildPlayerSelect({ includePhotos, includeReceipts });
    const stmt = db.prepare(
      `SELECT ${columns} FROM players ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(limit, offset).all<Player>();

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM players');
    const countResult = await countStmt.first<{ count: number }>();

    const players = (result.results || []).map((p) => hydratePhotoUrl(p, url.origin));

    return jsonResponse({
      players,
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
 * GET /api/players/:id/photo - Serve decoded binary photo for a player
 */
async function handleGetPlayerPhoto(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  try {
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const row = await db
      .prepare('SELECT photo_url FROM players WHERE id = ?')
      .bind(id)
      .first<{ photo_url: string | null }>();

    if (!row?.photo_url || row.photo_url === 'NULL') {
      return errorResponse('Photo not found', 404);
    }

    const photoUrl = row.photo_url.trim();
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: photoUrl,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const b64Marker = ';base64,';
    const b64Idx = photoUrl.indexOf(b64Marker);
    if (!photoUrl.startsWith('data:') || b64Idx === -1) {
      return errorResponse('Unsupported photo format', 400);
    }

    const mimeType = photoUrl.slice(5, b64Idx) || 'image/jpeg';
    const b64Data = photoUrl.slice(b64Idx + b64Marker.length);
    const bytes = Buffer.from(b64Data, 'base64');

    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  } catch (error) {
    console.error('GET /api/players/:id/photo error:', error);
    return errorResponse('Failed to fetch photo', 500);
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
    const url = new URL(request.url);
    const includePhotos = url.searchParams.get('includePhotos') === 'true';

    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const columns = buildPlayerSelect({ includePhotos, includeReceipts: true });
    const stmt = db.prepare(`SELECT ${columns} FROM players WHERE id = ?`);
    const player = await stmt.bind(id).first<Player>();

    if (!player) {
      return errorResponse('Player not found', 404);
    }

    return jsonResponse({ player: hydratePhotoUrl(player, url.origin) });
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
    const columns = buildPlayerSelect();
    const stmt = db.prepare(
      `SELECT ${columns} FROM players
       WHERE name LIKE ?
          OR mobile_number LIKE ?
          OR transaction_id LIKE ?
          OR flat_no LIKE ?
       LIMIT 50`
    );

    const result = await stmt
      .bind(searchPattern, searchPattern, searchPattern, searchPattern)
      .all<Player>();

    const players = (result.results || []).map((p) => hydratePhotoUrl(p, url.origin));
    return jsonResponse({ players });
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
    const url = new URL(request.url);
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const columns = buildPlayerSelect();
    const stmt = db.prepare(
      `SELECT ${columns} FROM players WHERE tournament_id = ? ORDER BY created_at DESC`
    );
    const result = await stmt.bind(tournamentId).all<Player>();

    const players = (result.results || []).map((p) => hydratePhotoUrl(p, url.origin));
    return jsonResponse({ players });
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
    const url = new URL(request.url);
    if (!['paid', 'pending'].includes(status)) {
      return errorResponse('Invalid payment status', 400);
    }

    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse('Database not configured', 500);
    }

    const columns = buildPlayerSelect();
    const stmt = db.prepare(
      `SELECT ${columns} FROM players WHERE payment_status = ? ORDER BY created_at DESC`
    );
    const result = await stmt.bind(status).all<Player>();

    const players = (result.results || []).map((p) => hydratePhotoUrl(p, url.origin));
    return jsonResponse({ players });
  } catch (error) {
    console.error('GET /api/players/status/:status error:', error);
    return errorResponse('Failed to fetch players by status', 500);
  }
}

/**
 * POST /api/players - Create new player
 */
async function handleCreatePlayer(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
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

    // Send email alert asynchronously (don't block response)
    console.log('🔔 Sending email to:', env.ALERT_TO_EMAIL);
    const fullPlayer: Player = {
      ...player,
      created_at: createdAt,
    } as Player;
    const emailPromise = sendRegistrationEmail(fullPlayer, env).catch(err => console.error('Email send error:', err));
    if (ctx) {
      ctx.waitUntil(emailPromise);
    }

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

    // Get lightweight player fields for statistics
    const playersStmt = db.prepare('SELECT payment_status, gender, role, tournament_id FROM players');
    const playersResult = await playersStmt.all<Pick<Player, 'payment_status' | 'gender' | 'role' | 'tournament_id'>>();
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
 * GET /debug - Debug endpoint to check env vars
 */
function handleDebug(env: Env): Response {
  return jsonResponse({
    ALERT_TO_EMAIL: env.ALERT_TO_EMAIL || 'NOT SET',
    RESEND_API_KEY: env.RESEND_API_KEY ? 'SET' : 'NOT SET',
    DB: env.DB ? 'CONFIGURED' : 'NOT CONFIGURED',
  });
}

/**
 * Main request router
 */
export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // Health check endpoint (no authentication)
    if (request.url.includes('/health')) {
      return handleHealth();
    }

    // Debug endpoint
    if (request.url.includes('/debug')) {
      return handleDebug(env);
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
        return handleCreatePlayer(request, env, ctx);
      }

      if (pathname === '/api/players/batch' && request.method === 'POST') {
        return handleBatchInsert(request, env);
      }

      if (pathname === '/api/stats' && request.method === 'GET') {
        return handleGetStats(request, env);
      }

      if (pathname === '/api/players/search' && request.method === 'GET') {
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

      const photoMatch = pathname.match(/^\/api\/players\/([^/]+)\/photo$/);
      if (photoMatch && request.method === 'GET') {
        return handleGetPlayerPhoto(request, env, decodeURIComponent(photoMatch[1]));
      }

      if (pathname.match(/^\/api\/players\/[^/]+$/) && request.method === 'GET') {
        const id = pathname.split('/').pop();
        if (id) {
          return handleGetPlayerById(request, env, decodeURIComponent(id));
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
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
  },
};
