import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import {
  getCallUp,
  sessionsOf,
  recordsOf,
  ua,
  avg,
  players,
  loadStatus,
  acStatus,
  statusColor,
  std,
} from "@/lib/mock-data";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ReferenceArea,
  ReferenceLine,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useState } from "react";
import { AlertTriangle, Download } from "lucide-react";

// Removed createFileRoute for react-router-dom migration

type Tab = "resumen" | "carga" | "ratio" | "sesiones" | "jugadores";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const callUp = id ? getCallUp(id) : undefined;

  useEffect(() => {
    if (callUp) {
      document.title = `Convocatoria · ${callUp.name} · SE-FS Load`;
    } else {
      document.title = "Convocatoria no encontrada · SE-FS Load";
    }
  }, [callUp]);

  if (!callUp) {
    return (
      <AppLayout>
        <div className="p-10 text-muted-foreground">Convocatoria no encontrada.</div>
      </AppLayout>
    );
  }
  const [tab, setTab] = useState<Tab>("resumen");
  const sess = sessionsOf(callUp.id);

  // per-session aggregates
  const perSession = sess.map((s) => {
    const recs = recordsOf(s.id);
    const rpeAvg = avg(recs.map((r) => r.rpe));
    const fatAvg = avg(recs.map((r) => r.fatigue));
    const uaAvg = avg(recs.map((r) => ua(r.rpe, s.duration)));
    return {
      id: s.id,
      label: s.label,
      date: s.date,
      type: s.type,
      duration: s.duration,
      rpe: +rpeAvg.toFixed(1),
      fatiga: +fatAvg.toFixed(1),
      ua: Math.round(uaAvg),
    };
  });

  const teamRpe = avg(perSession.map((s) => s.rpe));
  const teamFat = avg(perSession.map((s) => s.fatiga));
  const teamUaTotal = perSession.reduce((a, b) => a + b.ua, 0);

  // simple A:C ratio over the call-up: last 3 sessions avg / overall avg
  const recentUa = avg(perSession.slice(-3).map((s) => s.ua));
  const chronicUa = avg(perSession.map((s) => s.ua)) || 1;
  const acRatio = recentUa / chronicUa;

  // alerts: players with any session UA > 600
  const alerts = sess.flatMap((s) =>
    recordsOf(s.id)
      .filter((r) => ua(r.rpe, s.duration) > 600)
      .map((r) => ({
        playerId: r.playerId,
        sessionLabel: s.label,
        date: s.date,
        uaValue: ua(r.rpe, s.duration),
      })),
  );

  const typeDist = (["TEC-TAC", "PARTIDO", "LIBRE"] as const).map((t) => ({
    name: t,
    value: sess.filter((s) => s.type === t).length,
  }));

  const tabs: { id: Tab; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "carga", label: "Control de Carga" },
    { id: "ratio", label: "Ratio A:C" },
    { id: "sesiones", label: "Sesiones" },
    { id: "jugadores", label: "Jugadores" },
  ];

  return (
    <AppLayout>
      <div className="px-8 py-6 border-b">
        <div className="flex items-end justify-between">
          <div>
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Convocatorias
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {callUp.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {callUp.startDate} → {callUp.endDate} · {callUp.location}
            </p>
          </div>
          <button className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-md border hover:bg-accent">
            <Download className="size-3.5" /> Exportar CSV
          </button>
        </div>
        <div className="mt-5 flex gap-1 -mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {tab === "resumen" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="RPE Medio Equipo" value={teamRpe.toFixed(1)} hint="Escala 1–10" />
              <MetricCard label="Fatiga Media Equipo" value={teamFat.toFixed(1)} hint="Escala 1–10" />
              <MetricCard
                label="Carga Total (UA)"
                value={teamUaTotal.toLocaleString()}
                hint={`${sess.length} sesiones`}
              />
              <MetricCard
                label="Ratio A:C Equipo"
                value={acRatio.toFixed(2)}
                tone={acStatus(acRatio)}
                hint="Óptimo: 0.8–1.3"
              />
            </div>

            {alerts.length > 0 && (
              <div className="rounded-lg border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 p-4">
                <div className="flex items-center gap-2 text-[color:var(--danger)] text-sm font-medium">
                  <AlertTriangle className="size-4" /> {alerts.length} alertas de carga elevada (UA &gt; 600)
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
              <Panel title="Evolución de RPE y Fatiga por sesión">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={perSession}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="rpe" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="fatiga" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Carga por sesión (UA)">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={perSession}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <ReferenceLine y={400} stroke="var(--warning)" strokeDasharray="4 4" />
                    <ReferenceLine y={600} stroke="var(--danger)" strokeDasharray="4 4" />
                    <Bar dataKey="ua" radius={[4, 4, 0, 0]}>
                      {perSession.map((s) => (
                        <Cell key={s.id} fill={statusColor(loadStatus(s.ua))} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Distribución de tipo de sesión">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={typeDist}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {typeDist.map((_, i) => (
                        <Cell key={i} fill={`var(--chart-${i + 1})`} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Mapa de calor — UA por jugador">
                <Heatmap callUpId={callUp.id} />
              </Panel>
            </div>
          </>
        )}

        {tab === "carga" && <CargaTable callUpId={callUp.id} />}
        {tab === "ratio" && <RatioView callUpId={callUp.id} />}
        {tab === "sesiones" && <SessionsTable callUpId={callUp.id} />}
        {tab === "jugadores" && <PlayersGrid callUpId={callUp.id} />}
      </div>
    </AppLayout>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Heatmap({ callUpId }: { callUpId: string }) {
  const sess = sessionsOf(callUpId);
  return (
    <div className="overflow-x-auto">
      <table className="text-[11px] border-separate border-spacing-[2px]">
        <thead>
          <tr>
            <th className="text-left text-muted-foreground font-normal pr-2">Jugador</th>
            {sess.map((s) => (
              <th key={s.id} className="text-muted-foreground font-normal px-1" title={s.label}>
                {s.date.slice(5)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td className="pr-2 whitespace-nowrap">
                <Link
                  to={`/convocatorias/${callUpId}/jugador/${p.id}`}
                  className="hover:text-primary hover:underline"
                >
                  {p.name}
                </Link>
              </td>
              {sess.map((s) => {
                const r = recordsOf(s.id).find((x) => x.playerId === p.id);
                const uaV = r ? ua(r.rpe, s.duration) : 0;
                const intensity = Math.min(1, uaV / 700);
                const status = loadStatus(uaV);
                const color =
                  status === "riesgo"
                    ? `oklch(0.55 0.22 25 / ${0.3 + intensity * 0.6})`
                    : status === "moderado"
                      ? `oklch(0.75 0.16 70 / ${0.25 + intensity * 0.6})`
                      : `oklch(0.74 0.15 175 / ${0.2 + intensity * 0.6})`;
                return (
                  <td
                    key={s.id}
                    title={`${p.name} · ${s.label} · UA ${uaV}`}
                    className="size-6 text-center tabular-nums text-[10px] rounded"
                    style={{ background: color, color: "white" }}
                  >
                    <Link
                      to={`/convocatorias/${callUpId}/jugador/${p.id}`}
                      className="block"
                    >
                      {uaV}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function CargaTable({ callUpId }: { callUpId: string }) {
  const sess = sessionsOf(callUpId);
  const rows = sess.map((s, i) => {
    const recs = recordsOf(s.id);
    const uaVals = recs.map((r) => ua(r.rpe, s.duration));
    const fatAvg = avg(recs.map((r) => r.fatigue));
    const uaAvg = avg(uaVals);

    const window7 = sess.slice(Math.max(0, i - 6), i + 1);
    const window28 = sess.slice(Math.max(0, i - 27), i + 1);
    const aguda = avg(
      window7.flatMap((w) => recordsOf(w.id).map((r) => ua(r.rpe, w.duration))),
    );
    const cronica =
      avg(
        window28.flatMap((w) =>
          recordsOf(w.id).map((r) => ua(r.rpe, w.duration)),
        ),
      ) || 1;
    const ac = aguda / cronica;
    const monotonia = uaAvg / (std(uaVals) || 1);
    return {
      ...s,
      fatAvg: fatAvg.toFixed(1),
      uaAvg: Math.round(uaAvg),
      aguda: Math.round(aguda),
      cronica: Math.round(cronica),
      ac,
      monotonia: monotonia.toFixed(2),
    };
  });

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {[
                "Fecha",
                "Sesión",
                "Tipo",
                "Dur (min)",
                "Fatiga media",
                "UA media",
                "Aguda",
                "Crónica",
                "A:C",
                "Monotonía",
              ].map((h) => (
                <th key={h} className="text-left font-medium px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/20">
                <td className="px-3 py-2 tabular-nums">{r.date}</td>
                <td className="px-3 py-2">{r.label}</td>
                <td className="px-3 py-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent">
                    {r.type}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{r.duration}</td>
                <td className="px-3 py-2 tabular-nums">{r.fatAvg}</td>
                <td className="px-3 py-2 tabular-nums">
                  <span style={{ color: statusColor(loadStatus(r.uaAvg)) }}>
                    {r.uaAvg}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{r.aguda}</td>
                <td className="px-3 py-2 tabular-nums">{r.cronica}</td>
                <td className="px-3 py-2 tabular-nums">
                  <span style={{ color: statusColor(acStatus(r.ac)) }}>
                    {r.ac.toFixed(2)}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{r.monotonia}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RatioView({ callUpId }: { callUpId: string }) {
  const sess = sessionsOf(callUpId);
  const data = sess.map((s, i) => {
    const w7 = sess.slice(Math.max(0, i - 6), i + 1);
    const w28 = sess.slice(Math.max(0, i - 27), i + 1);
    const aguda = avg(
      w7.flatMap((w) => recordsOf(w.id).map((r) => ua(r.rpe, w.duration))),
    );
    const cronica =
      avg(
        w28.flatMap((w) =>
          recordsOf(w.id).map((r) => ua(r.rpe, w.duration)),
        ),
      ) || 1;
    return { label: s.label, ac: +(aguda / cronica).toFixed(2) };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium mb-3">
          Ratio Agudo:Crónico por sesión — Equipo
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis domain={[0, 2]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceArea y1={0.8} y2={1.3} fill="var(--success)" fillOpacity={0.12} />
            <ReferenceLine y={1.5} stroke="var(--danger)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="ac"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="text-xs text-muted-foreground mt-2">
          Banda verde: zona óptima (0.8–1.3). Línea roja: umbral de riesgo (1.5).
        </div>
      </div>
    </div>
  );
}

function SessionsTable({ callUpId }: { callUpId: string }) {
  const sess = sessionsOf(callUpId);
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-sm font-medium">Sesiones de la convocatoria</h3>
        <button className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
          + Añadir sesión
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            {["Fecha", "Sesión", "Tipo", "Duración", "Registros"].map((h) => (
              <th key={h} className="text-left font-medium px-3 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sess.map((s) => (
            <tr key={s.id} className="border-t hover:bg-muted/20">
              <td className="px-3 py-2 tabular-nums">{s.date}</td>
              <td className="px-3 py-2">{s.label}</td>
              <td className="px-3 py-2">{s.type}</td>
              <td className="px-3 py-2 tabular-nums">{s.duration} min</td>
              <td className="px-3 py-2 tabular-nums">{recordsOf(s.id).length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayersGrid({ callUpId }: { callUpId: string }) {
  const sess = sessionsOf(callUpId);
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {players.map((p) => {
        const recs = sess.flatMap((s) =>
          recordsOf(s.id)
            .filter((r) => r.playerId === p.id)
            .map((r) => ({ ...r, dur: s.duration })),
        );
        const rpeAvg = avg(recs.map((r) => r.rpe));
        const fatAvg = avg(recs.map((r) => r.fatigue));
        const uaTot = recs.reduce((a, b) => a + ua(b.rpe, b.dur), 0);
        const maxUa = Math.max(0, ...recs.map((r) => ua(r.rpe, r.dur)));
        const st = loadStatus(maxUa);
        return (
          <Link
            key={p.id}
            to={`/convocatorias/${callUpId}/jugador/${p.id}`}
            className="rounded-lg border bg-card p-4 hover:border-primary/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-accent grid place-items-center text-sm font-semibold">
                  {p.number}
                </div>
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.position}</div>
                </div>
              </div>
              <span
                className="size-2 rounded-full"
                style={{ background: statusColor(st) }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
              <Stat label="RPE" value={rpeAvg.toFixed(1)} />
              <Stat label="Fatiga" value={fatAvg.toFixed(1)} />
              <Stat label="UA tot" value={Math.round(uaTot).toLocaleString()} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
