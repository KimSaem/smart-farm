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
  Droplets,
  Factory,
  Fan,
  Gauge,
  Leaf,
  Lightbulb,
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

const zones = [
  {
    id: "germ",
    name: "발아실 A",
    crop: "브로콜리 / 무",
    phase: "Blackout",
    temp: 22.4,
    humidity: 73,
    co2: 620,
    ppfd: 12,
    water: 86,
    status: "주의",
    risk: "습도 상한 접근",
  },
  {
    id: "grow-1",
    name: "생장랙 1",
    crop: "완두순",
    phase: "Canopy Build",
    temp: 21.8,
    humidity: 56,
    co2: 810,
    ppfd: 238,
    water: 64,
    status: "정상",
    risk: "없음",
  },
  {
    id: "grow-2",
    name: "생장랙 2",
    crop: "적양배추",
    phase: "Color Push",
    temp: 22.1,
    humidity: 52,
    co2: 760,
    ppfd: 265,
    water: 72,
    status: "정상",
    risk: "없음",
  },
  {
    id: "harvest",
    name: "수확/포장",
    crop: "혼합 샐러드",
    phase: "Harvest Window",
    temp: 18.6,
    humidity: 47,
    co2: 440,
    ppfd: 80,
    water: 51,
    status: "정상",
    risk: "수확 대기",
  },
];

const batches = [
  { id: "B-260525-01", crop: "브로콜리", trays: 48, day: 2, harvest: "2026-06-01", yield: "11.5kg", zone: "발아실 A" },
  { id: "B-260524-03", crop: "완두순", trays: 36, day: 4, harvest: "2026-05-30", yield: "18.0kg", zone: "생장랙 1" },
  { id: "B-260523-02", crop: "적양배추", trays: 42, day: 5, harvest: "2026-05-31", yield: "8.4kg", zone: "생장랙 2" },
  { id: "B-260519-04", crop: "무", trays: 30, day: 8, harvest: "2026-05-26", yield: "7.2kg", zone: "수확/포장" },
];

const tasks = [
  { label: "발아실 A 덮개 제거", time: "09:20", owner: "Grow Ops", level: "high" },
  { label: "저수조 pH 보정 6.1 -> 5.9", time: "10:00", owner: "Automation", level: "medium" },
  { label: "랙 2 LED 렌즈 표면 점검", time: "13:30", owner: "Maintenance", level: "low" },
  { label: "수확 배치 B-260519-04 QC 샘플링", time: "15:00", owner: "QA", level: "high" },
];

const equipment = [
  { name: "6단 수직 재배랙", spec: "A1 트레이 288장 / 랙당 48장", status: "설치 기준 확정" },
  { name: "LED 광원", spec: "풀스펙트럼 150-300 PPFD, 디밍 제어", status: "레시피 연동" },
  { name: "Ebb & Flow 급수", spec: "저수조, 펌프, 역류 방지, 필터", status: "자동 스케줄" },
  { name: "센서 네트워크", spec: "온습도, CO2, PPFD, pH, EC, 수위", status: "클라우드 수집" },
  { name: "위생 라인", spec: "트레이 세척, 살균, 포장 구역 분리", status: "SOP 필요" },
];

const recipes = [
  { crop: "브로콜리", germ: "3일", light: "16h", ppfd: 210, humidity: "55%", harvest: "9일" },
  { crop: "무", germ: "2일", light: "14h", ppfd: 190, humidity: "50%", harvest: "7일" },
  { crop: "완두순", germ: "3일", light: "16h", ppfd: 240, humidity: "58%", harvest: "10일" },
  { crop: "적양배추", germ: "3일", light: "17h", ppfd: 260, humidity: "52%", harvest: "10일" },
];

function makeTelemetry(seed = 0) {
  return Array.from({ length: 16 }, (_, index) => {
    const t = index + seed;
    return {
      time: `${String((6 + index) % 24).padStart(2, "0")}:00`,
      temp: Number((21.2 + Math.sin(t / 2) * 0.7).toFixed(1)),
      humidity: Number((54 + Math.cos(t / 3) * 7).toFixed(1)),
      ppfd: Math.round(225 + Math.sin(t / 1.8) * 35),
      co2: Math.round(720 + Math.cos(t / 2.5) * 95),
    };
  });
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

function ZoneCard({ zone }) {
  const healthy = zone.status === "정상";
  return (
    <article className="zone-card">
      <div className="zone-head">
        <div>
          <p>{zone.name}</p>
          <h3>{zone.crop}</h3>
        </div>
        <span className={healthy ? "pill ok" : "pill warn"}>
          {healthy ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {zone.status}
        </span>
      </div>
      <div className="zone-phase">{zone.phase}</div>
      <div className="sensor-grid">
        <span><Thermometer size={16} />{zone.temp}°C</span>
        <span><Droplets size={16} />{zone.humidity}%</span>
        <span><Gauge size={16} />{zone.co2} ppm</span>
        <span><Lightbulb size={16} />{zone.ppfd} PPFD</span>
      </div>
      <div className="water-row">
        <div>
          <small>저수조</small>
          <b>{zone.water}%</b>
        </div>
        <div className="bar"><i style={{ width: `${zone.water}%` }} /></div>
      </div>
      <footer>{zone.risk}</footer>
    </article>
  );
}

function App() {
  const [running, setRunning] = useState(true);
  const [tick, setTick] = useState(0);
  const telemetry = useMemo(() => makeTelemetry(tick), [tick]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setTick((value) => value + 1), 2200);
    return () => window.clearInterval(timer);
  }, [running]);

  const current = telemetry[telemetry.length - 1];
  const totalTrays = batches.reduce((sum, batch) => sum + batch.trays, 0);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Sprout size={24} /></div>
          <div>
            <strong>Microgreen OS</strong>
            <span>Enterprise Farm Control</span>
          </div>
        </div>
        <nav>
          <a className="active"><Factory size={18} />관제센터</a>
          <a><Leaf size={18} />배치</a>
          <a><Activity size={18} />센서</a>
          <a><ShieldCheck size={18} />위생/QC</a>
          <a><Cloud size={18} />클라우드</a>
        </nav>
        <div className="install-panel">
          <RadioTower size={20} />
          <b>설치 기준</b>
          <p>랙, 센서, 급수, 조명, 위생 라인을 이 대시보드 기준으로 맞추면 바로 운영 데이터에 연결할 수 있습니다.</p>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p>2026-05-25 · Pacific/Auckland</p>
            <h1>마이크로그린 통합 생산 관제</h1>
          </div>
          <div className="actions">
            <button title="새 배치 추가"><Plus size={18} /></button>
            <button title="데이터 새로고침" onClick={() => setTick((value) => value + 1)}><RefreshCcw size={18} /></button>
            <button className="primary" onClick={() => setRunning((value) => !value)}>
              {running ? <Pause size={18} /> : <Play size={18} />}
              {running ? "실시간 수신 중" : "수신 일시정지"}
            </button>
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <div className="live"><Wifi size={16} />Cloud sync · {running ? "online" : "paused"}</div>
            <h2>씨앗부터 포장까지 한 화면에서 제어하는 기업형 재배 시스템</h2>
            <p>발아실, 수직랙, 급수, 광량, 수확 예정량, QC 작업을 통합 관리하도록 설계했습니다.</p>
          </div>
          <div className="hero-grid">
            <StatCard icon={Boxes} label="운영 트레이" value={`${totalTrays}장`} trend="4개 배치 활성" />
            <StatCard icon={TrendingUp} label="예상 수확" value="45.1kg" trend="다음 7일" tone="green" />
            <StatCard icon={AlertTriangle} label="주의 알림" value="1건" trend="습도 관리" tone="amber" />
          </div>
        </section>

        <section className="metrics">
          <StatCard icon={Thermometer} label="평균 온도" value={`${current.temp}°C`} trend="목표 20-24°C" />
          <StatCard icon={Droplets} label="평균 습도" value={`${current.humidity}%`} trend="목표 45-60%" />
          <StatCard icon={Lightbulb} label="평균 광량" value={`${current.ppfd} PPFD`} trend="생장 랙 기준" />
          <StatCard icon={Gauge} label="CO2" value={`${current.co2} ppm`} trend="안정 범위" />
        </section>

        <section className="main-grid">
          <div className="panel wide">
            <div className="panel-head">
              <div>
                <p>실시간 텔레메트리</p>
                <h2>환경 추세</h2>
              </div>
              <span className="pill ok"><Activity size={14} />Live</span>
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetry}>
                  <defs>
                    <linearGradient id="temp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef6f51" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#ef6f51" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="humidity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#239d8f" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#239d8f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9e2dc" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="temp" stroke="#ef6f51" fill="url(#temp)" name="온도" />
                  <Area type="monotone" dataKey="humidity" stroke="#239d8f" fill="url(#humidity)" name="습도" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <p>오늘의 작업</p>
                <h2>SOP 큐</h2>
              </div>
              <ClipboardList size={20} />
            </div>
            <div className="task-list">
              {tasks.map((task) => (
                <article className={`task ${task.level}`} key={task.label}>
                  <b>{task.time}</b>
                  <div>
                    <strong>{task.label}</strong>
                    <span>{task.owner}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="zone-grid">
          {zones.map((zone) => <ZoneCard zone={zone} key={zone.id} />)}
        </section>

        <section className="tables">
          <div className="panel">
            <div className="panel-head">
              <div>
                <p>생산 배치</p>
                <h2>수확 파이프라인</h2>
              </div>
              <CalendarDays size={20} />
            </div>
            <div className="data-table">
              {batches.map((batch) => (
                <div className="table-row" key={batch.id}>
                  <b>{batch.id}</b>
                  <span>{batch.crop}</span>
                  <span>{batch.trays}장</span>
                  <span>{batch.day}일차</span>
                  <span>{batch.harvest}</span>
                  <strong>{batch.yield}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <p>작물 레시피</p>
                <h2>표준 생장 조건</h2>
              </div>
              <TimerReset size={20} />
            </div>
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
          <div className="panel-head">
            <div>
              <p>설치 BOM</p>
              <h2>현장 구축 기준</h2>
            </div>
            <PackageCheck size={20} />
          </div>
          <div className="equipment-grid">
            {equipment.map((item) => (
              <article key={item.name}>
                <Fan size={18} />
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.spec}</span>
                </div>
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
