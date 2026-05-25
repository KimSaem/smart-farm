function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Device-Key",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function requireDeviceKey(request, env) {
  if (!env.DEVICE_KEY) return null;
  const provided = request.headers.get("X-Device-Key") || "";
  return provided === env.DEVICE_KEY ? null : json({ ok: false, error: "unauthorized_device" }, 401);
}

async function readBody(request) {
  return request.headers.get("content-type")?.includes("application/json") ? request.json() : {};
}

async function createCommand(env, body) {
  const id = `CMD-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  await env.DB.prepare(
    "INSERT INTO commands (id, zone_id, command_type, payload, status, requested_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      body.zone_id || "grow-1",
      body.command_type || "noop",
      JSON.stringify(body.payload || {}),
      "queued",
      new Date().toISOString(),
    )
    .run();
  return id;
}

async function insertTelemetry(env, body) {
  const required = ["zone_id", "temp", "humidity", "co2", "ppfd", "water_level"];
  for (const key of required) {
    if (body[key] === undefined) return json({ ok: false, error: `missing_${key}` }, 400);
  }

  await env.DB.prepare(
    "INSERT INTO telemetry (zone_id, recorded_at, temp, humidity, co2, ppfd, water_level, ph, ec) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      body.zone_id,
      body.recorded_at || new Date().toISOString(),
      body.temp,
      body.humidity,
      body.co2,
      body.ppfd,
      body.water_level,
      body.ph ?? null,
      body.ec ?? null,
    )
    .run();

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return json(null);

    try {
      if (url.pathname === "/api/health") {
        return json({
          ok: true,
          service: "smartfarm-microgreen-api",
          database: Boolean(env.DB),
          now: new Date().toISOString(),
        });
      }

      if (url.pathname === "/api/summary") {
        const [farm, zones, batches, alerts, tasks, latest, trend, commands] = await Promise.all([
          env.DB.prepare("SELECT * FROM farms LIMIT 1").first(),
          env.DB.prepare("SELECT * FROM zones ORDER BY id").all(),
          env.DB.prepare(
            "SELECT b.*, r.crop, z.name zone_name FROM batches b JOIN recipes r ON r.id = b.recipe_id JOIN zones z ON z.id = b.zone_id WHERE b.status != 'archived' ORDER BY expected_harvest_at",
          ).all(),
          env.DB.prepare("SELECT * FROM alerts WHERE status = 'open' ORDER BY created_at DESC").all(),
          env.DB.prepare("SELECT * FROM tasks WHERE status = 'open' ORDER BY due_at").all(),
          env.DB.prepare(
            "SELECT t.* FROM telemetry t JOIN (SELECT zone_id, MAX(recorded_at) recorded_at FROM telemetry GROUP BY zone_id) m ON m.zone_id = t.zone_id AND m.recorded_at = t.recorded_at ORDER BY t.zone_id",
          ).all(),
          env.DB.prepare(
            "SELECT strftime('%H:00', recorded_at) time, ROUND(AVG(temp),1) temp, ROUND(AVG(humidity),1) humidity, ROUND(AVG(ppfd),0) ppfd, ROUND(AVG(co2),0) co2 FROM telemetry WHERE recorded_at >= datetime('now','-24 hours') GROUP BY strftime('%H', recorded_at) ORDER BY MIN(recorded_at)",
          ).all(),
          env.DB.prepare("SELECT * FROM commands WHERE status IN ('queued','claimed') ORDER BY requested_at DESC LIMIT 12").all(),
        ]);

        return json({
          farm,
          zones: zones.results,
          batches: batches.results,
          alerts: alerts.results,
          tasks: tasks.results,
          latest: latest.results,
          trend: trend.results,
          commands: commands.results,
        });
      }

      if (url.pathname === "/api/telemetry" && request.method === "POST") {
        const auth = requireDeviceKey(request, env);
        if (auth) return auth;
        return insertTelemetry(env, await readBody(request));
      }

      if (url.pathname === "/api/demo-tick" && request.method === "POST") {
        const latest = await env.DB.prepare(
          "SELECT t.* FROM telemetry t JOIN (SELECT zone_id, MAX(recorded_at) recorded_at FROM telemetry GROUP BY zone_id) m ON m.zone_id = t.zone_id AND m.recorded_at = t.recorded_at",
        ).all();
        const now = Date.now();
        await Promise.all((latest.results || []).map((row, index) =>
          env.DB.prepare(
            "INSERT INTO telemetry (zone_id, recorded_at, temp, humidity, co2, ppfd, water_level, ph, ec) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
            .bind(
              row.zone_id,
              new Date(now + index).toISOString(),
              Number(row.temp) + (Math.random() - 0.5) * 0.4,
              Math.max(35, Math.min(80, Number(row.humidity) + Math.round((Math.random() - 0.5) * 4))),
              Math.max(350, Math.round(Number(row.co2) + (Math.random() - 0.5) * 40)),
              Math.max(0, Math.round(Number(row.ppfd) + (Math.random() - 0.5) * 20)),
              Math.max(0, Math.min(100, Math.round(Number(row.water_level) - Math.random() * 2))),
              row.ph,
              row.ec,
            )
            .run(),
        ));
        return json({ ok: true });
      }

      if (url.pathname === "/api/commands" && request.method === "GET") {
        const auth = requireDeviceKey(request, env);
        if (auth) return auth;
        const zoneId = url.searchParams.get("zone_id");
        const claim = url.searchParams.get("claim") === "1";
        const query = zoneId
          ? env.DB.prepare("SELECT * FROM commands WHERE status = 'queued' AND zone_id = ? ORDER BY requested_at LIMIT 10").bind(zoneId)
          : env.DB.prepare("SELECT * FROM commands WHERE status = 'queued' ORDER BY requested_at LIMIT 10");
        const rows = await query.all();
        if (claim && rows.results.length) {
          await Promise.all(rows.results.map((command) =>
            env.DB.prepare("UPDATE commands SET status = 'claimed' WHERE id = ?").bind(command.id).run(),
          ));
          rows.results = rows.results.map((command) => ({ ...command, status: "claimed" }));
        }
        return json({ ok: true, commands: rows.results });
      }

      if (url.pathname === "/api/commands" && request.method === "POST") {
        const id = await createCommand(env, await readBody(request));
        return json({ ok: true, id });
      }

      const commandComplete = url.pathname.match(/^\/api\/commands\/([^/]+)\/complete$/);
      if (commandComplete && request.method === "POST") {
        const auth = requireDeviceKey(request, env);
        if (auth) return auth;
        await env.DB.prepare("UPDATE commands SET status = 'done', executed_at = ? WHERE id = ?")
          .bind(new Date().toISOString(), commandComplete[1])
          .run();
        return json({ ok: true });
      }

      const taskComplete = url.pathname.match(/^\/api\/tasks\/([^/]+)\/complete$/);
      if (taskComplete && request.method === "POST") {
        await env.DB.prepare("UPDATE tasks SET status = 'done' WHERE id = ?").bind(taskComplete[1]).run();
        return json({ ok: true });
      }

      const alertAck = url.pathname.match(/^\/api\/alerts\/([^/]+)\/ack$/);
      if (alertAck && request.method === "POST") {
        await env.DB.prepare("UPDATE alerts SET status = 'acknowledged', acknowledged_at = ? WHERE id = ?")
          .bind(new Date().toISOString(), alertAck[1])
          .run();
        return json({ ok: true });
      }

      if (url.pathname === "/api/batches" && request.method === "POST") {
        const body = await readBody(request);
        const recipe = await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(body.recipe_id || "broccoli").first();
        if (!recipe) return json({ ok: false, error: "recipe_not_found" }, 404);

        const seededAt = new Date();
        const harvestAt = new Date(seededAt.getTime() + recipe.harvest_days * 86400000);
        const trays = Number(body.trays || 24);
        const id = `B-${seededAt.toISOString().slice(2, 10).replaceAll("-", "")}-${Math.random().toString(16).slice(2, 5).toUpperCase()}`;

        await env.DB.prepare(
          "INSERT INTO batches (id, farm_id, zone_id, recipe_id, trays, seeded_at, expected_harvest_at, expected_yield_kg, status, seed_lot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(
            id,
            "farm-akl-01",
            body.zone_id || "germ-a",
            recipe.id,
            trays,
            seededAt.toISOString(),
            harvestAt.toISOString(),
            Number((trays * 0.24).toFixed(1)),
            "germinating",
            body.seed_lot || `SL-${recipe.id.toUpperCase()}-${seededAt.getTime().toString().slice(-5)}`,
          )
          .run();

        await env.DB.prepare(
          "INSERT INTO tasks (id, farm_id, label, owner, due_at, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(`T-${Date.now()}`, "farm-akl-01", `${recipe.crop} batch germination check`, "Grow Ops", new Date(Date.now() + 6 * 3600000).toISOString(), "medium", "open")
          .run();

        return json({ ok: true, id });
      }

      return json({ ok: false, error: "not_found" }, 404);
    } catch (error) {
      return json({ ok: false, error: error.message }, 500);
    }
  },
};
