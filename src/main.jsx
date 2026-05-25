import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
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
  Leaf,
  Lightbulb,
  Lock,
  PackageCheck,
  Pause,
  Play,
  Plus,
  RadioTower,
  RefreshCcw,
  ShieldCheck,
  Sprout,
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
    { id: "germ-a", name: "발아실 A", kind: "germination", status: "warning" },
    { id: "grow-1", name: "생장랙 1", kind: "grow", status: "online" },
    { id: "grow-2", name: "생장랙 2", kind: "grow", status: "online" },
    { id: "harvest", name: "수확/포장", kind: "harvest", status: "online" },
  ],
  latest: [
    { zone_id: "germ-a", temp: 22.4, humidity: 73, co2: 620, ppfd: 12, water_level: 86, ph: 6.0, ec: 0.4 },
    { zone_id: "grow-1", temp: 21.8, humidity: 56, co2: 810, ppfd: 238, water_level: 64, ph: 5.8, ec: 0.7 },
    { zone_id: "grow-2", temp: 22.1, humidity: 52, co2: 760, ppfd: 265, water_level: 72, ph: 5.9, ec: 0.8 },
    { zone_id: "harvest", temp: 18.6, humidity: 47, co2: 440, ppfd: 80, water_level: 51, ph: 5.9, ec: 0.5 },
  ],
  batches: [],
  alerts: [],
  tasks: [],
  commands: [],
  trend: [],
};

const recipes = [
  { id: "broccoli", crop: "브로콜리", germ: "3일", light: "16h", ppfd: 210, humidity: "55%", harvest: "9일" },
  { id: "radish", crop: "무", germ: "2일", light: "14h", ppfd: 190, humidity: "50%", harvest: "7일" },
  { id: "pea", crop: "완두순", germ: "3일", light: "16h", ppfd: 240, humidity: "58%", harvest: "10일" },
  { id: "red-cabbage", crop: "적양배추", germ: "3일", light: "17h", ppfd: 260, humidity: "52%", harvest: "10일" },
];

const equipment = [
  { name: "Raspberry Pi Gateway", spec: "센서 수집, 로컬 캐시, 명령 실행", status: "권장" },
  { name: "ESP32 Sensor Nodes", spec: "랙별 온습도, 수위, PPFD 송신", status: "확장" },
  { name: "PLC / Relay Board", spec: "팬, 펌프, LED 오버라이드", status: "제어" },
  { name: "Cloudflare D1", spec: "배치, 센서, 알림, 명령 저장", status: "운영중" },
  { name: "QC SOP Line", spec: "세척, 살균, 수확 전 확인", status: "추적" },
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
  return new Date(value).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(value) {
  return new Date(value).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
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
  return (
    <article className="zone-card">
      <div className="zone-head">
        <div>
          <p>{zone.name}</p>
          <h3>{phase}</h3>
        </div>
        <span className={healthy ? "pill ok" : "pill warn"}>
          {healthy ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {healthy ? "정상" : "주의"}
        </span>
      </div>
      <div className="sensor-grid">
        <span><Thermometer size={16} />{reading.temp}°C</span>
        <span><Droplets size={16} />{reading.humidity}%</span>
        <span><Gauge size={16} />{reading.co2} ppm</span>
        <span><Lightbulb size={16} />{reading.ppfd} PPFD</span>
      </div>
      <div className="chem-row">
        <span>pH {reading.ph ?? "-"}</span>
        <span>EC {reading.ec ?? "-"}</span>
      </div>
      <div className="water-row">
        <div><small>저수조</small><b>{reading.water_level}%</b></div>
        <div className="bar"><i style={{ width: `${reading.water_level}%` }} /></div>
      </div>
      <div className="mini-actions">
        <button disabled={busy} onClick={() => onCommand(zone.id, "vent_boost", { minutes: 15 })}><Fan size={15} />환기</button>
        <button disabled={busy} onClick={() => onCommand(zone.id, "water_cycle", { seconds: 45 })}><Droplets size={15} />급수</button>
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
  const [toast, setToast] = useState("시스템 준비 중");
  const generatedTrend = useMemo(() => makeTelemetry(tick), [tick]);
  const trend = data.trend?.length ? data.trend : generatedTrend;

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
      setToast(`API 연결 실패: ${error.message}`);
    }
  }

  async function runAction(label, action) {
    setBusy(label);
    try {
      await action();
      await loadSummary(`${label} 완료`);
    } catch (error) {
      setToast(`${label} 실패: ${error.message}`);
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    loadSummary("Cloudflare 데이터 연결됨");
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
    runAction("명령 큐 등록", () =>
      api("/api/commands", {
        method: "POST",
        body: JSON.stringify({ zone_id: zoneId, command_type: commandType, payload }),
      }),
    );

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
          <a className="active"><Factory size={18} />관제센터</a>
          <a><Database size={18} />D1 데이터</a>
          <a><Cpu size={18} />Raspberry Pi</a>
          <a><ShieldCheck size={18} />위생/QC</a>
          <a><Cloud size={18} />Cloudflare</a>
        </nav>
        <div className="install-panel">
          <RadioTower size={20} />
          <b>현장 연결 준비됨</b>
          <p>Pi가 `/api/telemetry`로 송신하고 `/api/commands`를 폴링하면 자동 운전이 시작됩니다.</p>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p>2026-05-26 · {data.farm?.timezone || "Pacific/Auckland"}</p>
            <h1>{data.farm?.name || "마이크로그린 통합 생산 관제"}</h1>
          </div>
          <div className="actions">
            <button disabled={Boolean(busy)} title="새 배치 추가" onClick={() => runAction("새 배치 추가", () => api("/api/batches", { method: "POST", body: JSON.stringify({ recipe_id: "broccoli", zone_id: "germ-a", trays: 24 }) }))}><Plus size={18} /></button>
            <button disabled={Boolean(busy)} title="센서 리런" onClick={() => runAction("센서 리런", () => api("/api/demo-tick", { method: "POST" }))}><RefreshCcw size={18} /></button>
            <button className="primary" onClick={() => setRunning((value) => !value)}>
              {running ? <Pause size={18} /> : <Play size={18} />}
              {running ? "실시간 수신 중" : "수신 일시정지"}
            </button>
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <div className={`live ${cloud}`}><Wifi size={16} />{cloud === "online" ? "Cloudflare API online" : "Fallback demo mode"}</div>
            <h2>라즈베리파이 게이트웨이와 연결되는 기업형 마이크로그린 운영실</h2>
            <p>센서 데이터, 배치 추가, 알림 확인, 작업 완료, 팬/펌프/LED 명령이 모두 D1에 기록되고 화면에 바로 반영됩니다.</p>
          </div>
          <div className="hero-grid">
            <StatCard icon={Boxes} label="운영 트레이" value={`${totalTrays}장`} trend={`${data.batches.length}개 배치 활성`} />
            <StatCard icon={TrendingUp} label="예상 수확" value={`${expectedYield}kg`} trend="다음 7일" tone="green" />
            <StatCard icon={Zap} label="명령 대기" value={`${queuedCommands}건`} trend="Pi 실행 큐" tone="amber" />
          </div>
        </section>

        <section className="metrics">
          <StatCard icon={Thermometer} label="대표 온도" value={`${current.temp}°C`} trend="목표 20-24°C" />
          <StatCard icon={Droplets} label="대표 습도" value={`${current.humidity}%`} trend="목표 45-60%" />
          <StatCard icon={Lightbulb} label="대표 광량" value={`${current.ppfd} PPFD`} trend="랙별 레시피 적용" />
          <StatCard icon={Gauge} label="CO2" value={`${current.co2} ppm`} trend="안정 범위" />
        </section>

        <section className="status-strip">
          <span>{toast}</span>
          <button disabled={Boolean(busy)} onClick={() => loadSummary("수동 새로고침 완료")}><RefreshCcw size={16} />새로고침</button>
        </section>

        <section className="main-grid">
          <div className="panel wide">
            <div className="panel-head">
              <div><p>실시간 텔레메트리</p><h2>환경 추세</h2></div>
              <span className="pill ok"><Activity size={14} />Live</span>
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9e2dc" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="temp" stroke="#ef6f51" fill="#f6c4b8" name="온도" />
                  <Area type="monotone" dataKey="humidity" stroke="#239d8f" fill="#bfe8e0" name="습도" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><p>오늘의 작업</p><h2>SOP 큐</h2></div>
              <ClipboardList size={20} />
            </div>
            <div className="task-list">
              {data.tasks.map((task) => (
                <article className={`task ${task.priority}`} key={task.id}>
                  <b>{timeOnly(task.due_at)}</b>
                  <div><strong>{task.label}</strong><span>{task.owner}</span></div>
                  <button disabled={Boolean(busy)} onClick={() => runAction("작업 완료", () => api(`/api/tasks/${task.id}/complete`, { method: "POST" }))}>완료</button>
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
            <div className="panel-head"><div><p>알림</p><h2>위험 관리</h2></div><AlertTriangle size={20} /></div>
            <div className="alert-list">
              {openAlerts.map((alert) => (
                <article className={`alert ${alert.severity}`} key={alert.id}>
                  <strong>{alert.title}</strong>
                  <span>{alert.detail}</span>
                  <button disabled={Boolean(busy)} onClick={() => runAction("알림 확인", () => api(`/api/alerts/${alert.id}/ack`, { method: "POST" }))}>확인</button>
                </article>
              ))}
              {openAlerts.length === 0 && <div className="empty-state">열린 알림이 없습니다.</div>}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div><p>자동제어</p><h2>명령 센터</h2></div><Zap size={20} /></div>
            <div className="control-grid">
              <button disabled={Boolean(busy)} onClick={() => createCommand("grow-1", "vent_boost", { minutes: 15 })}><Fan size={18} />환기 강화</button>
              <button disabled={Boolean(busy)} onClick={() => createCommand("grow-2", "apply_light_recipe", { ppfd: 260, hours: 17 })}><Lightbulb size={18} />광량 레시피</button>
              <button disabled={Boolean(busy)} onClick={() => createCommand("grow-1", "water_cycle", { seconds: 45 })}><Droplets size={18} />급수 사이클</button>
              <button disabled={Boolean(busy)} onClick={() => createCommand("harvest", "manual_lock", { locked: true })}><Lock size={18} />수동 잠금</button>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div><p>Pi 명령 큐</p><h2>현장 실행 대기</h2></div><Cpu size={20} /></div>
            <div className="command-list">
              {(data.commands || []).slice(0, 5).map((command) => (
                <article key={command.id}>
                  <strong>{command.command_type}</strong>
                  <span>{command.zone_id} · {command.status}</span>
                </article>
              ))}
              {(!data.commands || data.commands.length === 0) && <div className="empty-state">대기 중인 명령이 없습니다.</div>}
            </div>
          </div>
        </section>

        <section className="tables">
          <div className="panel">
            <div className="panel-head"><div><p>생산 배치</p><h2>수확 파이프라인</h2></div><CalendarDays size={20} /></div>
            <div className="data-table">
              {data.batches.map((batch) => (
                <div className="table-row" key={batch.id}>
                  <b>{batch.id}</b>
                  <span>{batch.crop}</span>
                  <span>{batch.trays}장</span>
                  <span>{batch.status}</span>
                  <span>{dayLabel(batch.expected_harvest_at)}</span>
                  <strong>{batch.expected_yield_kg}kg</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div><p>작물 레시피</p><h2>표준 생장 조건</h2></div><TimerReset size={20} /></div>
            <div className="recipe-grid">
              {recipes.map((recipe) => (
                <article key={recipe.id}>
                  <strong>{recipe.crop}</strong>
                  <span>발아 {recipe.germ}</span>
                  <span>조명 {recipe.light}</span>
                  <span>{recipe.ppfd} PPFD · 습도 {recipe.humidity}</span>
                  <b>{recipe.harvest} 수확</b>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="panel equipment">
          <div className="panel-head"><div><p>대기업급 설치 BOM</p><h2>현장 구축 기준</h2></div><PackageCheck size={20} /></div>
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
