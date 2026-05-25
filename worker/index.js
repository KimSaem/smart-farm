export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Device-Key",
      "Content-Type": "application/json; charset=utf-8",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: cors });

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
        const [farm, zones, batches, alerts, tasks, latest, trend] = await Promise.all([
          env.DB.prepare("SELECT * FROM farms LIMIT 1").first(),
          env.DB.prepare("SELECT * FROM zones ORDER BY id").all(),
          env.DB.prepare(
            "SELECT b.*, r.crop, z.name zone_name FROM batches b JOIN recipes r ON r.id = b.recipe_id JOIN zones z ON z.id = b.zone_id ORDER BY expected_harvest_at",
          ).all(),
          env.DB.prepare("SELECT * FROM alerts WHERE status = 'open' ORDER BY created_at DESC").all(),
          env.DB.prepare("SELECT * FROM tasks WHERE status = 'open' ORDER BY due_at").all(),
          env.DB.prepare(
            "SELECT t.* FROM telemetry t JOIN (SELECT zone_id, MAX(recorded_at) recorded_at FROM telemetry GROUP BY zone_id) m ON m.zone_id = t.zone_id AND m.recorded_at = t.recorded_at ORDER BY t.zone_id",
          ).all(),
          env.DB.prepare(
            "SELECT strftime('%H:00', recorded_at) time, ROUND(AVG(temp),1) temp, ROUND(AVG(humidity),1) humidity, ROUND(AVG(ppfd),0) ppfd, ROUND(AVG(co2),0) co2 FROM telemetry WHERE recorded_at >= datetime('now','-24 hours') GROUP BY strftime('%H', recorded_at) ORDER BY MIN(recorded_at)",
          ).all(),
        ]);

        return json({
          farm,
          zones: zones.results,
          batches: batches.results,
          alerts: alerts.results,
          tasks: tasks.results,
          latest: latest.results,
          trend: trend.results,
        });
      }

      if (url.pathname === "/api/telemetry" && request.method === "POST") {
        const body = await request.json();
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

      if (url.pathname === "/api/commands" && request.method === "POST") {
        const body = await request.json();
        const id = `CMD-${Date.now()}`;
        await env.DB.prepare(
          "INSERT INTO commands (id, zone_id, command_type, payload, status, requested_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
          .bind(id, body.zone_id, body.command_type, JSON.stringify(body.payload || {}), "queued", new Date().toISOString())
          .run();
        return json({ ok: true, id });
      }

      return json({ ok: false, error: "not_found" }, 404);
    } catch (error) {
      return json({ ok: false, error: error.message }, 500);
    }
  },
};
