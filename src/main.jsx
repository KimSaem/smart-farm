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
  batches: [
    { id: "B-260525-01", crop: "브로콜리", trays: 48, expected_harvest_at: "2026-06-01T08:00:00+12:00", expected_yield_kg: 11.5, status: "germinating", zone_name: "발아실 A" },
    { id: "B-260524-03", crop: "완두순", trays: 36, expected_harvest_at: "2026-05-30T08:00:00+12:00", expected_yield_kg: 18, status: "growing", zone_name: "생장랙 1" },
    { id: "B-260523-02", crop: "적양배추", trays: 42, expected_harvest_at: "2026-05-31T08:00:00+12:00", expected_yield_kg: 8.4, status: "growing", zone_name: "생장랙 2" },
    { id: "B-260519-04", crop: "무", trays: 30, expected_harvest_at: "2026-05-26T08:00:00+12:00", expected_yield_kg: 7.2, status: "ready", zone_name: "수확/포장" },
  ],
  alerts: [
    { id: "AL-260525-01", severity: "high", title: "발아실 습도 상한 접근", detail: "덮개 제거와 환기 확인 필요", status: "open" },
    { id: "AL-260525-02", severity: "medium", title: "LED 렌즈 점검 예정", detail: "랙 2 PPFD 편차 확인", status: "open" },
  ],
  tasks: [
    { id: "T-001", label: "발아실 A 덮개 제거", owner: "Grow Ops", due_at: "2026-05-25T09:20:00+12:00", priority: "high", status: "open" },
    { id: "T-002", label: "저수조 pH 6.1 -> 5.9 보정", owner: "Automation", due_at: "2026-05-25T10:00:00+12:00", priority: "medium", status: "open" },
    { id: "T-003", label: "랙 2 LED 렌즈 표면 점검", owner: "Maintenance", due_at: "2026-05-25T13:30:00+12:00", priority: "low", status: "open" },
    { id: "T-004", label: "수확 배치 QC 샘플링", owner: "QA", due_at: "2026-05-25T15:00:00+12:00", priority: "high", status: "open" },
  ],
  trend: [],
};

const recipes = [
  { crop: "브로콜리", germ: "3일", light: "16h", ppfd: 210, humidity: "55%", harvest: "9일" },
  { crop: "무", germ: "2일", light: "14h", ppfd: 190, humidity: "50%", harvest: "7일" },
  { crop: "완두순", germ: "3일", light: "16h", ppfd: 240, humidity: "58%", harvest: "10일" },
  { crop: "적양배추", germ: "3일", light: "17h", ppfd: 260, humidity: "52%", harvest: "10일" },
];

const equipment = [
  { name: "6단 수직 재배랙", spec: "랙당 A1 트레이 48장, 6랙 시작", status: "288트레이 셀" },
  { name: "조명 제어", spec: "풀스펙트럼 LED, PPFD 레시피", status: "디밍 준비" },
  { name: "Ebb & Flow 급수", spec: "저수조, 펌프, 필터, pH/EC", status: "자동화 준비" },
  { name: "센서 네트워크", spec: "온습도, CO2, PPFD, 수위", status: "D1 저장" },
  { name: "위생/QC 라인", spec: "세척, 살균, 배치 추적", status: "SOP 운영" },
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

function ZoneCard({ zone, reading }) {
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
    </article>
  );
}

function App() {
  const [running, setRunning] = useState(true);
  const [tick, setTick] = useState(0);
  const [data, setData] = useState(fallback);
  const [cloud, setCloud] = useState("connecting");
  const generatedTrend = useMemo(() => makeTelemetry(tick), [tick]);
  const trend = data.trend?.length ? data.trend : generatedTrend;

  async function loadSummary() {
    try {
      const response = await fetch(`${API_URL}/api/summary`);
      if (!response.ok) throw new Error(`API ${response.status}`);
      setData(await response.json());
      setCloud("online");
    } catch {
      setData(fallback);
      setCloud("offline");
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
      loadSummary();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [running]);

  const latestByZone = Object.fromEntries((data.latest || []).map((item) => [item.zone_id, item]));
  const current = data.latest?.[0] || fallback.latest[0];
  const totalTrays = data.batches.reduce((sum, batch) => sum + batch.trays, 0);
  const expectedYield = data.batches.reduce((sum, batch) => sum + Number(batch.expected_yield_kg || 0), 0).toFixed(1);
  const openAlerts = data.alerts.filter((alert) => alert.status === "open");

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
          <a><Cpu size={18} />자동제어</a>
          <a><ShieldCheck size={18} />위생/QC</a>
          <a><Cloud size={18} />Cloudflare</a>
        </nav>
        <div className="install-panel">
          <RadioTower size={20} />
          <b>Cloudflare 연결됨</b>
          <p>D1: smartfarm-microgreen-os<br />Worker: smartfarm-microgreen-api</p>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p>2026-05-25 · {data.farm?.timezone || "Pacific/Auckland"}</p>
            <h1>{data.farm?.name || "마이크로그린 통합 생산 관제"}</h1>
          </div>
          <div className="actions">
            <button title="새 배치 추가"><Plus size={18} /></button>
            <button title="데이터 새로고침" onClick={loadSummary}><RefreshCcw size={18} /></button>
            <button className="primary" onClick={() => setRunning((value) => !value)}>
              {running ? <Pause size={18} /> : <Play size={18} />}
              {running ? "실시간 수신 중" : "수신 일시정지"}
            </button>
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <div className={`live ${cloud}`}><Wifi size={16} />{cloud === "online" ? "Cloudflare API online" : "Fallback demo mode"}</div>
            <h2>센서, 배치, 품질, 수확 예측을 클라우드에서 통합 제어하는 스마트팜 운영실</h2>
            <p>현장 설치 후 ESP32, PLC, Raspberry Pi가 Worker API로 데이터를 보내면 D1에 저장되고 이 화면에서 바로 관제됩니다.</p>
          </div>
          <div className="hero-grid">
            <StatCard icon={Boxes} label="운영 트레이" value={`${totalTrays}장`} trend={`${data.batches.length}개 배치 활성`} />
            <StatCard icon={TrendingUp} label="예상 수확" value={`${expectedYield}kg`} trend="다음 7일" tone="green" />
            <StatCard icon={AlertTriangle} label="주의 알림" value={`${openAlerts.length}건`} trend="미확인 알림" tone="amber" />
          </div>
        </section>

        <section className="metrics">
          <StatCard icon={Thermometer} label="대표 온도" value={`${current.temp}°C`} trend="목표 20-24°C" />
          <StatCard icon={Droplets} label="대표 습도" value={`${current.humidity}%`} trend="목표 45-60%" />
          <StatCard icon={Lightbulb} label="대표 광량" value={`${current.ppfd} PPFD`} trend="랙별 레시피 적용" />
          <StatCard icon={Gauge} label="CO2" value={`${current.co2} ppm`} trend="안정 범위" />
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
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="zone-grid">
          {data.zones.map((zone) => (
            <ZoneCard zone={zone} reading={latestByZone[zone.id] || fallback.latest[0]} key={zone.id} />
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
                </article>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div><p>자동제어</p><h2>명령 센터</h2></div><Zap size={20} /></div>
            <div className="control-grid">
              <button><Fan size={18} />환기 강화</button>
              <button><Lightbulb size={18} />광량 레시피 적용</button>
              <button><Droplets size={18} />급수 사이클 예약</button>
              <button><Lock size={18} />수동 오버라이드 잠금</button>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div><p>품질</p><h2>QC 게이트</h2></div><ShieldCheck size={20} /></div>
            <div className="qc-list">
              <span><CheckCircle2 size={16} />씨앗 로트 추적</span>
              <span><CheckCircle2 size={16} />트레이 세척 기록</span>
              <span><CheckCircle2 size={16} />수확 전 샘플링</span>
              <span><CheckCircle2 size={16} />냉장 출하 대기</span>
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
                <article key={recipe.crop}>
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
          <div className="panel-head"><div><p>설치 BOM</p><h2>현장 구축 기준</h2></div><PackageCheck size={20} /></div>
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
