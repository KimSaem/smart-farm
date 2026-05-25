import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Boxes,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Cpu,
  Database,
  Droplets,
  Factory,
  Fan,
  Gauge,
  Lightbulb,
  Lock,
  PackageCheck,
  Pause,
  Play,
  Plus,
  Radar,
  RadioTower,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
  Sprout,
  Target,
  Thermometer,
  TimerReset,
  TrendingUp,
  Wifi,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./styles.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://smartfarm-microgreen-api.rlatoa2201.workers.dev";

const fallback = {
  farm: {
    name: "Auckland Enterprise Microgreen Cell",
    timezone: "Pacific/Auckland",
    status: "demo",
  },
  zones: [
    { id: "germ-a", name: "Germination A", kind: "germination", status: "warning" },
    { id: "grow-1", name: "Grow Rack 1", kind: "grow", status: "online" },
    { id: "grow-2", name: "Grow Rack 2", kind: "grow", status: "online" },
    { id: "harvest", name: "Harvest / Pack", kind: "harvest", status: "online" },
  ],
  latest: [
    { zone_id: "germ-a", temp: 22.4, humidity: 73, co2: 620, ppfd: 12, water_level: 86, ph: 6.0, ec: 0.4 },
    { zone_id: "grow-1", temp: 21.8, humidity: 56, co2: 810, ppfd: 238, water_level: 64, ph: 5.8, ec: 0.7 },
    { zone_id: "grow-2", temp: 22.1, humidity: 52, co2: 760, ppfd: 265, water_level: 72, ph: 5.9, ec: 0.8 },
    { zone_id: "harvest", temp: 18.6, humidity: 47, co2: 440, ppfd: 80, water_level: 51, ph: 5.9, ec: 0.5 },
  ],
  batches: [
    { id: "B-260525-01", crop: "Broccoli", trays: 48, expected_harvest_at: "2026-06-01T08:00:00+12:00", expected_yield_kg: 11.5, status: "germinating", zone_name: "Germination A" },
    { id: "B-260524-03", crop: "Pea Shoots", trays: 36, expected_harvest_at: "2026-05-30T08:00:00+12:00", expected_yield_kg: 18, status: "growing", zone_name: "Grow Rack 1" },
  ],
  alerts: [
    { id: "AL-DEMO-01", severity: "high", title: "Germination humidity is high", detail: "Open airflow and remove covers on schedule.", status: "open" },
  ],
  tasks: [
    { id: "T-DEMO-01", label: "Check germination cover removal", owner: "Grow Ops", due_at: "2026-05-26T09:20:00+12:00", priority: "high", status: "open" },
  ],
  commands: [],
  trend: [],
};

const recipes = [
  { id: "broccoli", crop: "Broccoli", germ: "3d", light: "16h", ppfd: 210, humidity: "55%", harvest: "9d" },
  { id: "radish", crop: "Radish", germ: "2d", light: "14h", ppfd: 190, humidity: "50%", harvest: "7d" },
  { id: "pea", crop: "Pea Shoots", germ: "3d", light: "16h", ppfd: 240, humidity: "58%", harvest: "10d" },
  { id: "red-cabbage", crop: "Red Cabbage", germ: "3d", light: "17h", ppfd: 260, humidity: "52%", harvest: "10d" },
];

const equipment = [
  { name: "Raspberry Pi Gateway", spec: "Sensor bus, command runner, offline cache", status: "Core" },
  { name: "ESP32 Sensor Nodes", spec: "Rack sensors for temp, humidity, PPFD, water", status: "Scale" },
  { name: "PLC / Relay Board", spec: "Fan, pump, light, and lock control", status: "Control" },
  { name: "Cloudflare D1", spec: "Telemetry, batches, alerts, commands", status: "Live" },
  { name: "QC Trace Passport", spec: "Seed lot, wash, harvest, pack evidence", status: "Audit" },
];

const autopilotPlaybooks = [
  {
    id: "humidity_guard",
    title: "Humidity Guard",
    command: "vent_boost",
    zone_id: "germ-a",
    payload: { minutes: 20, fan_percent: 85 },
    detail: "Boost airflow when germination humidity drifts above target.",
  },
  {
    id: "yield_push",
    title: "Yield Push",
    command: "apply_light_recipe",
    zone_id: "grow-2",
    payload: { ppfd: 270, hours: 17 },
    detail: "Apply a color and biomass push on the strongest rack.",
  },
  {
    id: "water_recover",
    title: "Water Recovery",
    command: "water_cycle",
    zone_id: "grow-1",
    payload: { seconds: 55, mode: "ebb_flow" },
    detail: "Run an extra irrigation cycle when reservoir trend drops.",
  },
];

function makeTelemetry(seed = 0) {
  return Array.from({ length: 18 }, (_, index) => {
    const t = index + seed;
    return {
      time: `${String((5 + index) % 24).padStart(2, "0")}:00`,
      temp: Number((21.2 + Math.sin(t / 2) * 0.7).toFixed(1)),
      humidity: Number((54 + Math.cos(t / 3) * 7).toFixed(1)),
      ppfd: Math.round(225 + Math.sin(t / 1.8) * 35),
      co2: Math.round(720 + Math.cos(t / 2.5) * 95),
    };
  });
}

function timeOnly(value) {
  return new Date(value).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(value) {
  return new Date(value).toLocaleDateString("en-NZ", { month: "short", day: "2-digit" });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreReading(reading, zone) {
  const tempPenalty = Math.abs(Number(reading.temp || 22) - 22) * 4;
  const humidityTarget = zone.kind === "germination" ? 68 : zone.kind === "harvest" ? 48 : 55;
  const humidityPenalty = Math.abs(Number(reading.humidity || humidityTarget) - humidityTarget) * 1.6;
  const waterPenalty = Number(reading.water_level || 80) < 45 ? 16 : 0;
  const phPenalty = reading.ph ? Math.abs(Number(reading.ph) - 5.9) * 16 : 4;
  return Math.round(clamp(100 - tempPenalty - humidityPenalty - waterPenalty - phPenalty, 0, 100));
}

function buildAutopilot(data) {
  const latestByZone = Object.fromEntries((data.latest || []).map((item) => [item.zone_id, item]));
  const zoneScores = (data.zones || []).map((zone) => {
    const reading = latestByZone[zone.id] || fallback.latest[0];
    return { zone, reading, score: scoreReading(reading, zone) };
  });
  const health = zoneScores.length
    ? Math.round(zoneScores.reduce((sum, item) => sum + item.score, 0) / zoneScores.length)
    : 86;
  const expectedYield = (data.batches || []).reduce((sum, batch) => sum + Number(batch.expected_yield_kg || 0), 0);
  const riskZones = zoneScores.filter((item) => item.score < 82);
  const recommendations = [];

  for (const item of riskZones) {
    if (Number(item.reading.humidity) > 65) {
      recommendations.push({
        title: `${item.zone.name}: high humidity`,
        detail: "Autopilot recommends airflow boost and tighter blackout timing.",
        zone_id: item.zone.id,
        command: "vent_boost",
        payload: { minutes: 20, fan_percent: 85 },
      });
    }
    if (Number(item.reading.water_level) < 55) {
      recommendations.push({
        title: `${item.zone.name}: reservoir trending low`,
        detail: "Run an irrigation cycle and verify pump prime.",
        zone_id: item.zone.id,
        command: "water_cycle",
        payload: { seconds: 50, mode: "ebb_flow" },
      });
    }
  }

  if (!recommendations.length) {
    recommendations.push({
      title: "System stable",
      detail: "Run Yield Push to increase biomass and color on Grow Rack 2.",
      zone_id: "grow-2",
      command: "apply_light_recipe",
      payload: { ppfd: 270, hours: 17 },
    });
  }

  return {
    health,
    expectedYield: Number(expectedYield.toFixed(1)),
    confidence: clamp(health + 3, 72, 98),
    riskZones,
    recommendations: recommendations.slice(0, 3),
    projectedLift: health > 88 ? "+6%" : "+11%",
  };
}

function StatCard({ icon: Icon, label, value, trend, tone }) {
  return (
    <section className={`stat-card ${tone || ""}`}>
      <div className="stat-icon"><Icon size={20} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{trend}</span>
      </div>
    </section>
  );
}

function ZoneCard({ zone, reading, onCommand, busy }) {
  const healthy = zone.status === "online";
  const phase = zone.kind === "germination" ? "Blackout / Germination" : zone.kind === "harvest" ? "Harvest & Pack" : "Canopy Build";
  const score = scoreReading(reading, zone);
  return (
    <article className="zone-card">
      <div className="zone-head">
        <div>
          <p>{zone.name}</p>
          <h3>{phase}</h3>
        </div>
        <span className={healthy && score >= 82 ? "pill ok" : "pill warn"}>
          {healthy && score >= 82 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {score}
        </span>
      </div>
      <div className="sensor-grid">
        <span><Thermometer size={16} />{reading.temp} C</span>
        <span><Droplets size={16} />{reading.humidity}%</span>
        <span><Gauge size={16} />{reading.co2} ppm</span>
        <span><Lightbulb size={16} />{reading.ppfd} PPFD</span>
      </div>
      <div className="chem-row">
        <span>pH {reading.ph ?? "-"}</span>
        <span>EC {reading.ec ?? "-"}</span>
      </div>
      <div className="water-row">
        <div><small>Reservoir</small><b>{reading.water_level}%</b></div>
        <div className="bar"><i style={{ width: `${reading.water_level}%` }} /></div>
      </div>
      <div className="mini-actions">
        <button disabled={busy} onClick={() => onCommand(zone.id, "vent_boost", { minutes: 15 })}><Fan size={15} />Air</button>
        <button disabled={busy} onClick={() => onCommand(zone.id, "water_cycle", { seconds: 45 })}><Droplets size={15} />Water</button>
      </div>
    </article>
  );
}

function App() {
  const [running, setRunning] = useState(true);
  const [tick, setTick] = useState(0);
  const [data, setData] = useState(fallback);
  const [cloud, setCloud] = useState("connecting");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("System ready");
  const generatedTrend = useMemo(() => makeTelemetry(tick), [tick]);
  const trend = data.trend?.length ? data.trend : generatedTrend;
  const autopilot = useMemo(() => buildAutopilot(data), [data]);

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `API ${response.status}`);
    return payload;
  }

  async function loadSummary(message) {
    try {
      const payload = await api("/api/summary");
      setData(payload);
      setCloud("online");
      if (message) setToast(message);
    } catch (error) {
      setData(fallback);
      setCloud("offline");
      setToast(`API fallback mode: ${error.message}`);
    }
  }

  async function runAction(label, action) {
    setBusy(label);
    try {
      await action();
      await loadSummary(`${label} complete`);
    } catch (error) {
      setToast(`${label} failed: ${error.message}`);
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    loadSummary("Cloudflare data connected");
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
      loadSummary();
    }, 6000);
    return () => window.clearInterval(timer);
  }, [running]);

  const latestByZone = Object.fromEntries((data.latest || []).map((item) => [item.zone_id, item]));
  const current = data.latest?.[0] || fallback.latest[0];
  const totalTrays = data.batches.reduce((sum, batch) => sum + batch.trays, 0);
  const expectedYield = data.batches.reduce((sum, batch) => sum + Number(batch.expected_yield_kg || 0), 0).toFixed(1);
  const openAlerts = data.alerts.filter((alert) => alert.status === "open");
  const queuedCommands = data.commands?.filter((command) => command.status === "queued").length || 0;

  const createCommand = (zoneId, commandType, payload) =>
    runAction("Queue command", () =>
      api("/api/commands", {
        method: "POST",
        body: JSON.stringify({ zone_id: zoneId, command_type: commandType, payload }),
      }),
    );

  const applyAutopilot = () =>
    runAction("Autopilot playbook", async () => {
      for (const recommendation of autopilot.recommendations) {
        await api("/api/commands", {
          method: "POST",
          body: JSON.stringify({
            zone_id: recommendation.zone_id,
            command_type: recommendation.command,
            payload: { ...recommendation.payload, source: "autopilot_twin" },
          }),
        });
      }
    });

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Sprout size={24} /></div>
          <div>
            <strong>SmartFarm OS</strong>
            <span>Microgreen Enterprise</span>
          </div>
        </div>
        <nav>
          <a className="active"><Factory size={18} />Command</a>
          <a><BrainCircuit size={18} />Autopilot</a>
          <a><Cpu size={18} />Raspberry Pi</a>
          <a><ShieldCheck size={18} />QC Trace</a>
          <a><Cloud size={18} />Cloudflare</a>
        </nav>
        <div className="install-panel">
          <RadioTower size={20} />
          <b>Field gateway ready</b>
          <p>Pi posts telemetry and polls command queues for fan, pump, lighting, and lock actions.</p>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p>2026-05-26 · {data.farm?.timezone || "Pacific/Auckland"}</p>
            <h1>{data.farm?.name || "Microgreen Command Center"}</h1>
          </div>
          <div className="actions">
            <button disabled={Boolean(busy)} title="Add batch" onClick={() => runAction("Add batch", () => api("/api/batches", { method: "POST", body: JSON.stringify({ recipe_id: "broccoli", zone_id: "germ-a", trays: 24 }) }))}><Plus size={18} /></button>
            <button disabled={Boolean(busy)} title="Sensor rerun" onClick={() => runAction("Sensor rerun", () => api("/api/demo-tick", { method: "POST" }))}><RefreshCcw size={18} /></button>
            <button className="primary" onClick={() => setRunning((value) => !value)}>
              {running ? <Pause size={18} /> : <Play size={18} />}
              {running ? "Live receiving" : "Paused"}
            </button>
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <div className={`live ${cloud}`}><Wifi size={16} />{cloud === "online" ? "Cloudflare API online" : "Fallback demo mode"}</div>
            <h2>Autopilot Twin for high-density microgreen production</h2>
            <p>Digital twin scoring, yield forecast, QC traceability, and one-click Pi command playbooks for a serious production cell.</p>
          </div>
          <div className="hero-grid">
            <StatCard icon={BrainCircuit} label="Twin Health" value={`${autopilot.health}%`} trend={`${autopilot.confidence}% confidence`} />
            <StatCard icon={TrendingUp} label="Yield Forecast" value={`${expectedYield}kg`} trend={`${autopilot.projectedLift} playbook lift`} tone="green" />
            <StatCard icon={Zap} label="Command Queue" value={`${queuedCommands} jobs`} trend="Pi execution queue" tone="amber" />
          </div>
        </section>

        <section className="autopilot-panel">
          <div className="autopilot-core">
            <div className="score-ring" style={{ "--score": `${autopilot.health}%` }}>
              <span>{autopilot.health}</span>
              <small>OS Score</small>
            </div>
            <div>
              <p>Autopilot Twin</p>
              <h2>Recommended production playbook</h2>
              <span className="muted">The twin reads zone telemetry, batch load, and active alerts to propose the next high-impact move.</span>
            </div>
          </div>
          <div className="recommendation-list">
            {autopilot.recommendations.map((item) => (
              <article key={`${item.zone_id}-${item.command}`}>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </article>
            ))}
          </div>
          <div className="autopilot-actions">
            <button disabled={Boolean(busy)} className="primary" onClick={applyAutopilot}><Bot size={18} />Apply Autopilot</button>
            <button disabled={Boolean(busy)} onClick={() => runAction("Create QC trace", () => api("/api/commands", { method: "POST", body: JSON.stringify({ zone_id: "harvest", command_type: "qc_trace_snapshot", payload: { source: "dashboard" } }) }))}><ScanLine size={18} />QC Snapshot</button>
          </div>
        </section>

        <section className="metrics">
          <StatCard icon={Thermometer} label="Representative Temp" value={`${current.temp} C`} trend="Target 20-24 C" />
          <StatCard icon={Droplets} label="Representative RH" value={`${current.humidity}%`} trend="Target 45-60%" />
          <StatCard icon={Lightbulb} label="Representative PPFD" value={`${current.ppfd}`} trend="Recipe controlled" />
          <StatCard icon={Gauge} label="CO2" value={`${current.co2} ppm`} trend="Stable range" />
        </section>

        <section className="status-strip">
          <span>{toast}</span>
          <button disabled={Boolean(busy)} onClick={() => loadSummary("Manual refresh complete")}><RefreshCcw size={16} />Refresh</button>
        </section>

        <section className="main-grid">
          <div className="panel wide">
            <div className="panel-head">
              <div><p>Live telemetry</p><h2>Environment trend</h2></div>
              <span className="pill ok"><Activity size={14} />Live</span>
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9e2dc" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="temp" stroke="#ef6f51" fill="#f6c4b8" name="Temp" />
                  <Area type="monotone" dataKey="humidity" stroke="#239d8f" fill="#bfe8e0" name="Humidity" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><p>Today</p><h2>SOP Queue</h2></div>
              <ClipboardList size={20} />
            </div>
            <div className="task-list">
              {data.tasks.map((task) => (
                <article className={`task ${task.priority}`} key={task.id}>
                  <b>{timeOnly(task.due_at)}</b>
                  <div><strong>{task.label}</strong><span>{task.owner}</span></div>
                  <button disabled={Boolean(busy)} onClick={() => runAction("Complete task", () => api(`/api/tasks/${task.id}/complete`, { method: "POST" }))}>Done</button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="zone-grid">
          {data.zones.map((zone) => (
            <ZoneCard
              zone={zone}
              reading={latestByZone[zone.id] || fallback.latest[0]}
              key={zone.id}
              busy={Boolean(busy)}
              onCommand={createCommand}
            />
          ))}
        </section>

        <section className="ops-grid">
          <div className="panel">
            <div className="panel-head"><div><p>Alerts</p><h2>Risk Control</h2></div><AlertTriangle size={20} /></div>
            <div className="alert-list">
              {openAlerts.map((alert) => (
                <article className={`alert ${alert.severity}`} key={alert.id}>
                  <strong>{alert.title}</strong>
                  <span>{alert.detail}</span>
                  <button disabled={Boolean(busy)} onClick={() => runAction("Acknowledge alert", () => api(`/api/alerts/${alert.id}/ack`, { method: "POST" }))}>Ack</button>
                </article>
              ))}
              {openAlerts.length === 0 && <div className="empty-state">No open alerts.</div>}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div><p>Automation</p><h2>Command Center</h2></div><Zap size={20} /></div>
            <div className="control-grid">
              {autopilotPlaybooks.map((playbook) => (
                <button
                  disabled={Boolean(busy)}
                  key={playbook.id}
                  onClick={() => createCommand(playbook.zone_id, playbook.command, playbook.payload)}
                >
                  <Target size={18} />{playbook.title}
                </button>
              ))}
              <button disabled={Boolean(busy)} onClick={() => createCommand("harvest", "manual_lock", { locked: true })}><Lock size={18} />Manual Lock</button>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div><p>Pi Fleet</p><h2>Execution Queue</h2></div><Cpu size={20} /></div>
            <div className="command-list">
              {(data.commands || []).slice(0, 5).map((command) => (
                <article key={command.id}>
                  <strong>{command.command_type}</strong>
                  <span>{command.zone_id} · {command.status}</span>
                </article>
              ))}
              {(!data.commands || data.commands.length === 0) && <div className="empty-state">No queued commands.</div>}
            </div>
          </div>
        </section>

        <section className="wow-grid">
          <div className="panel">
            <div className="panel-head"><div><p>QC Passport</p><h2>Trace-ready batches</h2></div><ScanLine size={20} /></div>
            <div className="passport-list">
              {data.batches.slice(0, 4).map((batch) => (
                <article key={batch.id}>
                  <strong>{batch.id}</strong>
                  <span>{batch.crop} · {batch.zone_name || batch.zone_id}</span>
                  <small>Seed lot, wash, harvest, pack, and cold-chain evidence slot ready.</small>
                </article>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div><p>Anomaly Radar</p><h2>Next 6 hours</h2></div><Radar size={20} /></div>
            <div className="radar-grid">
              <span><b>{autopilot.riskZones.length}</b> risk zones</span>
              <span><b>{openAlerts.length}</b> open alerts</span>
              <span><b>{queuedCommands}</b> queued jobs</span>
              <span><b>{autopilot.projectedLift}</b> yield lift</span>
            </div>
          </div>
        </section>

        <section className="tables">
          <div className="panel">
            <div className="panel-head"><div><p>Production batches</p><h2>Harvest pipeline</h2></div><CalendarDays size={20} /></div>
            <div className="data-table">
              {data.batches.map((batch) => (
                <div className="table-row" key={batch.id}>
                  <b>{batch.id}</b>
                  <span>{batch.crop}</span>
                  <span>{batch.trays} trays</span>
                  <span>{batch.status}</span>
                  <span>{dayLabel(batch.expected_harvest_at)}</span>
                  <strong>{batch.expected_yield_kg}kg</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div><p>Crop recipes</p><h2>Standard growth conditions</h2></div><TimerReset size={20} /></div>
            <div className="recipe-grid">
              {recipes.map((recipe) => (
                <article key={recipe.id}>
                  <strong>{recipe.crop}</strong>
                  <span>Germ {recipe.germ}</span>
                  <span>Light {recipe.light}</span>
                  <span>{recipe.ppfd} PPFD · RH {recipe.humidity}</span>
                  <b>{recipe.harvest} harvest</b>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="panel equipment">
          <div className="panel-head"><div><p>Enterprise BOM</p><h2>Field build standard</h2></div><PackageCheck size={20} /></div>
          <div className="equipment-grid">
            {equipment.map((item) => (
              <article key={item.name}>
                <Cpu size={18} />
                <div><strong>{item.name}</strong><span>{item.spec}</span></div>
                <a>{item.status}<ArrowUpRight size={14} /></a>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
