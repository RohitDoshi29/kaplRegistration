// .wrangler/tmp/bundle-gfjMRF/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/worker/player-api.ts
function isD1Database(db) {
  return db && typeof db === "object";
}
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
function errorResponse(error, status = 400) {
  return jsonResponse({ error }, status);
}
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
function cleanNullStrings(obj) {
  if (Array.isArray(obj)) {
    return obj.map(cleanNullStrings);
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k,
        v === "NULL" ? null : cleanNullStrings(v)
      ])
    );
  }
  return obj;
}
async function sendRegistrationEmail(player, env) {
  try {
    const apiKey = env.RESEND_API_KEY;
    const toEmail = env.ALERT_TO_EMAIL || "rohit.doshi2007@gmail.com";
    if (!apiKey) {
      console.warn("No Resend API key configured");
      return;
    }
    const emailBody = `
New Player Registration!

Name: ${player.name}
Mobile: ${player.mobile_number}
Email: ${player.email || "Not provided"}
Role: ${player.role}
Flat: ${player.flat_no || "Not provided"}
Age: ${player.age || "Not provided"}
Payment Status: ${player.payment_status}
UTR: ${player.transaction_id || "Not provided"}

Registered at: ${(/* @__PURE__ */ new Date()).toLocaleString()}
    `;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "noreply@resend.dev",
        to: toEmail,
        subject: `\u{1F3AF} New Player: ${player.name}`,
        html: `
          <div style="font-family: Arial; padding: 20px; background: #f5f5f5;">
            <h2>\u{1F3AF} New Player Registration!</h2>
            <p><strong>Name:</strong> ${player.name}</p>
            <p><strong>Mobile:</strong> ${player.mobile_number}</p>
            <p><strong>Email:</strong> ${player.email || "Not provided"}</p>
            <p><strong>Role:</strong> ${player.role}</p>
            <p><strong>Flat:</strong> ${player.flat_no || "Not provided"}</p>
            <p><strong>Age:</strong> ${player.age || "Not provided"}</p>
            <p><strong>Payment:</strong> ${player.payment_status}</p>
            <p><strong>UTR:</strong> ${player.transaction_id || "Not provided"}</p>
            <p style="color: #666; font-size: 12px;">Registered: ${(/* @__PURE__ */ new Date()).toLocaleString()}</p>
          </div>
        `
      })
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
async function handleGetPlayers(request, env) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const sortBy = url.searchParams.get("sortBy") || "created_at";
    const validSortFields = ["name", "created_at", "jersey_number", "payment_status"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "created_at";
    const orderAsc = url.searchParams.get("order") === "asc" ? "ASC" : "DESC";
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse("Database not configured", 500);
    }
    const stmt = db.prepare(
      `SELECT * FROM players ORDER BY ${sortField} ${orderAsc} LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(limit, offset).all();
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM players");
    const countResult = await countStmt.first();
    return jsonResponse({
      players: cleanNullStrings(result.results || []),
      total: countResult?.count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error("GET /api/players error:", error);
    return errorResponse("Failed to fetch players", 500);
  }
}
async function handleGetPlayerById(request, env, id) {
  try {
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse("Database not configured", 500);
    }
    const stmt = db.prepare("SELECT * FROM players WHERE id = ?");
    const player = await stmt.bind(id).first();
    if (!player) {
      return errorResponse("Player not found", 404);
    }
    return jsonResponse({ player: cleanNullStrings(player) });
  } catch (error) {
    console.error("GET /api/players/:id error:", error);
    return errorResponse("Failed to fetch player", 500);
  }
}
async function handleSearchPlayers(request, env) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    if (!query || query.length < 2) {
      return errorResponse("Search query must be at least 2 characters", 400);
    }
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse("Database not configured", 500);
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
    const result = await stmt.bind(searchPattern, searchPattern, searchPattern, searchPattern).all();
    return jsonResponse({ players: result.results || [] });
  } catch (error) {
    console.error("GET /api/players/search error:", error);
    return errorResponse("Failed to search players", 500);
  }
}
async function handleGetByTournament(request, env, tournamentId) {
  try {
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse("Database not configured", 500);
    }
    const stmt = db.prepare(
      "SELECT * FROM players WHERE tournament_id = ? ORDER BY created_at DESC"
    );
    const result = await stmt.bind(tournamentId).all();
    return jsonResponse({ players: result.results || [] });
  } catch (error) {
    console.error("GET /api/players/tournament/:id error:", error);
    return errorResponse("Failed to fetch tournament players", 500);
  }
}
async function handleGetByStatus(request, env, status) {
  try {
    if (!["paid", "pending"].includes(status)) {
      return errorResponse("Invalid payment status", 400);
    }
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse("Database not configured", 500);
    }
    const stmt = db.prepare(
      "SELECT * FROM players WHERE payment_status = ? ORDER BY created_at DESC"
    );
    const result = await stmt.bind(status).all();
    return jsonResponse({ players: result.results || [] });
  } catch (error) {
    console.error("GET /api/players/status/:status error:", error);
    return errorResponse("Failed to fetch players by status", 500);
  }
}
async function handleCreatePlayer(request, env) {
  try {
    const player = await request.json();
    if (!player.id || !player.name || !player.mobile_number) {
      return errorResponse("Missing required fields: id, name, mobile_number", 400);
    }
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse("Database not configured", 500);
    }
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
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
      player.role || "all_rounder",
      player.batting_style || "Right-hand bat",
      player.bowling_style || "Right-arm medium",
      player.jersey_number || null,
      player.tournament_id || "kapl-3-mens",
      player.base_price || 100,
      player.photo_url || null,
      player.experience || null,
      player.previous_team || null,
      player.past_achievements || null,
      player.bio || null,
      player.gender || null,
      player.age || null,
      player.flat_no || null,
      player.payment_method || "upi_qr",
      player.payment_status || "pending",
      player.transaction_id || null,
      player.payment_amount || null,
      player.payment_receipt_url || null,
      createdAt,
      createdAt
    ).run();
    const fullPlayer = {
      ...player,
      created_at: createdAt
    };
    sendRegistrationEmail(fullPlayer, env).catch((err) => console.error("Email send error:", err));
    return jsonResponse({ player: { ...player, created_at: createdAt } }, 201);
  } catch (error) {
    console.error("POST /api/players error:", error);
    const message = error instanceof Error ? error.message : "Failed to create player";
    return errorResponse(message, 500);
  }
}
async function handleUpdatePlayer(request, env, id) {
  try {
    const updates = await request.json();
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse("Database not configured", 500);
    }
    const checkStmt = db.prepare("SELECT id FROM players WHERE id = ?");
    const existing = await checkStmt.bind(id).first();
    if (!existing) {
      return errorResponse("Player not found", 404);
    }
    const updateFields = [];
    const updateValues = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== "id" && key !== "created_at") {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }
    if (updateFields.length === 0) {
      return errorResponse("No fields to update", 400);
    }
    updateFields.push("updated_at = ?");
    updateValues.push((/* @__PURE__ */ new Date()).toISOString());
    updateValues.push(id);
    const updateStmt = db.prepare(
      `UPDATE players SET ${updateFields.join(", ")} WHERE id = ?`
    );
    await updateStmt.bind(...updateValues).run();
    const fetchStmt = db.prepare("SELECT * FROM players WHERE id = ?");
    const updatedPlayer = await fetchStmt.bind(id).first();
    return jsonResponse({ player: updatedPlayer });
  } catch (error) {
    console.error("PATCH /api/players/:id error:", error);
    return errorResponse("Failed to update player", 500);
  }
}
async function handleDeletePlayer(request, env, id) {
  try {
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse("Database not configured", 500);
    }
    const stmt = db.prepare("DELETE FROM players WHERE id = ?");
    await stmt.bind(id).run();
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("DELETE /api/players/:id error:", error);
    return errorResponse("Failed to delete player", 500);
  }
}
async function handleBatchInsert(request, env) {
  try {
    const { players } = await request.json();
    if (!Array.isArray(players) || players.length === 0) {
      return errorResponse("No players to insert", 400);
    }
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse("Database not configured", 500);
    }
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
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
        player.role || "all_rounder",
        player.batting_style || "Right-hand bat",
        player.bowling_style || "Right-arm medium",
        player.jersey_number || null,
        player.tournament_id || "kapl-3-mens",
        player.base_price || 100,
        player.photo_url || null,
        player.experience || null,
        player.previous_team || null,
        player.past_achievements || null,
        player.bio || null,
        player.gender || null,
        player.age || null,
        player.flat_no || null,
        player.payment_method || "upi_qr",
        player.payment_status || "pending",
        player.transaction_id || null,
        player.payment_amount || null,
        player.payment_receipt_url || null,
        createdAt,
        createdAt
      ).run();
    }
    return jsonResponse({ inserted: players.length }, 201);
  } catch (error) {
    console.error("POST /api/players/batch error:", error);
    return errorResponse("Failed to batch insert players", 500);
  }
}
async function handleGetStats(request, env) {
  try {
    const db = env.DB;
    if (!isD1Database(db)) {
      return errorResponse("Database not configured", 500);
    }
    const playersStmt = db.prepare("SELECT * FROM players");
    const playersResult = await playersStmt.all();
    const players = playersResult.results || [];
    const stats = {
      total: players.length,
      paid: 0,
      pending: 0,
      byGender: {},
      byRole: {},
      byTournament: {}
    };
    for (const player of players) {
      if (player.payment_status === "paid")
        stats.paid++;
      if (player.payment_status === "pending")
        stats.pending++;
      if (player.gender) {
        stats.byGender[player.gender] = (stats.byGender[player.gender] || 0) + 1;
      }
      if (player.role) {
        stats.byRole[player.role] = (stats.byRole[player.role] || 0) + 1;
      }
      if (player.tournament_id) {
        stats.byTournament[player.tournament_id] = (stats.byTournament[player.tournament_id] || 0) + 1;
      }
    }
    return jsonResponse(stats);
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return errorResponse("Failed to get statistics", 500);
  }
}
function handleHealth() {
  return jsonResponse({
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
var player_api_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return handleOptions();
    }
    if (request.url.includes("/health")) {
      return handleHealth();
    }
    const url = new URL(request.url);
    const pathname = url.pathname;
    try {
      if (pathname === "/api/players" && request.method === "GET") {
        return handleGetPlayers(request, env);
      }
      if (pathname === "/api/players" && request.method === "POST") {
        return handleCreatePlayer(request, env);
      }
      if (pathname === "/api/players/batch" && request.method === "POST") {
        return handleBatchInsert(request, env);
      }
      if (pathname === "/api/stats" && request.method === "GET") {
        return handleGetStats(request, env);
      }
      if (pathname.match(/^\/api\/players\/search\?/)) {
        return handleSearchPlayers(request, env);
      }
      if (pathname.match(/^\/api\/players\/tournament\/.+/)) {
        const tournamentId = pathname.split("/").pop();
        if (tournamentId) {
          return handleGetByTournament(request, env, tournamentId);
        }
      }
      if (pathname.match(/^\/api\/players\/status\/.+/)) {
        const status = pathname.split("/").pop();
        if (status) {
          return handleGetByStatus(request, env, status);
        }
      }
      if (pathname.match(/^\/api\/players\/[^/]+$/) && request.method === "GET") {
        const id = pathname.split("/").pop();
        if (id) {
          return handleGetPlayerById(request, env, id);
        }
      }
      if (pathname.match(/^\/api\/players\/[^/]+$/) && request.method === "PATCH") {
        const id = pathname.split("/").pop();
        if (id) {
          return handleUpdatePlayer(request, env, id);
        }
      }
      if (pathname.match(/^\/api\/players\/[^/]+$/) && request.method === "DELETE") {
        const id = pathname.split("/").pop();
        if (id) {
          return handleDeletePlayer(request, env, id);
        }
      }
      return errorResponse("Not found", 404);
    } catch (error) {
      console.error("Unhandled error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
var jsonError = async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
};
var middleware_miniflare3_json_error_default = jsonError;
var wrap = void 0;

// .wrangler/tmp/bundle-gfjMRF/middleware-insertion-facade.js
var envWrappers = [wrap].filter(Boolean);
var facade = {
  ...player_api_default,
  envWrappers,
  middleware: [
    middleware_miniflare3_json_error_default,
    ...player_api_default.middleware ? player_api_default.middleware : []
  ].filter(Boolean)
};
var middleware_insertion_facade_default = facade;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}

// .wrangler/tmp/bundle-gfjMRF/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
var __facade_modules_fetch__ = function(request, env, ctx) {
  if (middleware_insertion_facade_default.fetch === void 0)
    throw new Error("Handler does not export a fetch() function.");
  return middleware_insertion_facade_default.fetch(request, env, ctx);
};
function getMaskedEnv(rawEnv) {
  let env = rawEnv;
  if (middleware_insertion_facade_default.envWrappers && middleware_insertion_facade_default.envWrappers.length > 0) {
    for (const wrapFn of middleware_insertion_facade_default.envWrappers) {
      env = wrapFn(env);
    }
  }
  return env;
}
var registeredMiddleware = false;
var facade2 = {
  ...middleware_insertion_facade_default.tail && {
    tail: maskHandlerEnv(middleware_insertion_facade_default.tail)
  },
  ...middleware_insertion_facade_default.trace && {
    trace: maskHandlerEnv(middleware_insertion_facade_default.trace)
  },
  ...middleware_insertion_facade_default.scheduled && {
    scheduled: maskHandlerEnv(middleware_insertion_facade_default.scheduled)
  },
  ...middleware_insertion_facade_default.queue && {
    queue: maskHandlerEnv(middleware_insertion_facade_default.queue)
  },
  ...middleware_insertion_facade_default.test && {
    test: maskHandlerEnv(middleware_insertion_facade_default.test)
  },
  ...middleware_insertion_facade_default.email && {
    email: maskHandlerEnv(middleware_insertion_facade_default.email)
  },
  fetch(request, rawEnv, ctx) {
    const env = getMaskedEnv(rawEnv);
    if (middleware_insertion_facade_default.middleware && middleware_insertion_facade_default.middleware.length > 0) {
      if (!registeredMiddleware) {
        registeredMiddleware = true;
        for (const middleware of middleware_insertion_facade_default.middleware) {
          __facade_register__(middleware);
        }
      }
      const __facade_modules_dispatch__ = function(type, init) {
        if (type === "scheduled" && middleware_insertion_facade_default.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return middleware_insertion_facade_default.scheduled(controller, env, ctx);
        }
      };
      return __facade_invoke__(
        request,
        env,
        ctx,
        __facade_modules_dispatch__,
        __facade_modules_fetch__
      );
    } else {
      return __facade_modules_fetch__(request, env, ctx);
    }
  }
};
function maskHandlerEnv(handler) {
  return (data, env, ctx) => handler(data, getMaskedEnv(env), ctx);
}
var middleware_loader_entry_default = facade2;
export {
  middleware_loader_entry_default as default
};
//# sourceMappingURL=player-api.js.map
