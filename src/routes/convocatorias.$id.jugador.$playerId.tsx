import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import {
  getCallUp,
  sessionsOf,
  players,
  records,
  ua,
  avg,
  std,
  loadStatus,
  acStatus,
  statusColor,
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
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from "recharts";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/convocatorias/$id/jugador/$playerId")({
  head: ({ params }) => ({
    meta: [{ title: `Jugador ${params.playerId} · SE-FS Load` }],
  }),
  loader: ({ params }) => {
    const c = getCallUp(params.id);
    const p = players.find((x) => x.id === params.playerId);
    if (!c || !p) throw notFound();
    return { callUp: c, player: p };
  },
  notFoundComponent: () => (
    <AppLayout>
      <div className="p-10 text-muted-foreground">No encontrado.</div>
    </AppLayout>
  ),
  errorComponent: ({ error }) => (
    <AppLayout>
      <div className="p-10 text-destructive">{error.message}</div>
    </AppLayout>
  ),
  component: Page,
});

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function Page() {
  const { callUp, player } = Route.useLoaderData();
  const sess = sessionsOf(callUp.id);

  // SOLO registros de ESTE jugador en ESTA convocatoria
  const data = sess.map((s, i) => {
    const r = records.find(
      (x) => x.sessionId === s.id && x.playerId === player.id,
    );
    const uaVal = r ? ua(r.rpe, s.duration) : 0;

    // ventanas agudo/crónico solo para este jugador
    const w7 = sess.slice(Math.max(0, i - 6), i + 1);
    const w28 = sess.slice(Math.max(0, i - 27), i + 1);
    const uaWindow = (ws: typeof sess) =>
      ws.map((ww) => {
        const rr = records.find(
          (x) => x.sessionId === ww.id && x.playerId === player.id,
        );
        return rr ? ua(rr.rpe, ww.duration) : 0;
      });
    const aguda = avg(uaWindow(w7));
    const cronica = avg(uaWindow(w28)) || 1;
    return {
      id: s.id,
      label: s.label,
      date: s.date,
      type: s.type,
      duration: s.duration,
      rpe: r?.rpe ?? 0,
      fatiga: r?.fatigue ?? 0,
      ua: uaVal,
      ac: +(aguda / cronica).toFixed(2),
    };
  });

  const rpeAvg = avg(data.map((d) => d.rpe));
  const fatAvg = avg(data.map((d) => d.fatiga));
  const uaTot = data.reduce((a, b) => a + b.ua, 0);
  const maxUa = Math.max(0, ...data.map((d) => d.ua));
  const status = loadStatus(maxUa);
  const statusLabel =
    status === "riesgo" ? "Riesgo" : status === "moderado" ? "Precaución" : "Normal";

  const uaArr = data.map((d) => d.ua);
  const monotonia = avg(uaArr) / (std(uaArr) || 1);
  const acLast = data[data.length - 1]?.ac ?? 0;

  const alerts = data.filter((d) => d.ua > 600);

  return (
    <AppLayout>
      <div className="px-8 py-6 border-b">
        <Link
          to="/convocatorias/$id"
          params={{ id: callUp.id }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← {callUp.name}
        </Link>
        <div className="flex items-center gap-4 mt-2">
          <div className="size-14 rounded-full bg-accent grid place-items-center text-xl font-bold">
            {player.number}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{player.name}</h1>
            <p className="text-sm text-muted-foreground">
              {player.position} · Métricas individuales de esta convocatoria
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span
              className="size-2 rounded-full"
              style={{ background: statusColor(status) }}
            />
            Estado: <span className="font-medium">{statusLabel}</span>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <MetricCard label="RPE Medio" value={rpeAvg.toFixed(1)} hint="Escala 1–10" />
          <MetricCard label="Fatiga Media" value={fatAvg.toFixed(1)} hint="Escala 1–10" />
          <MetricCard label="UA Total" value={Math.round(uaTot).toLocaleString()} hint={`${data.length} sesiones`} />
          <MetricCard label="UA Máx" value={maxUa} tone={status} hint="Pico de carga" />
          <MetricCard
            label="Ratio A:C"
            value={acLast.toFixed(2)}
            tone={acStatus(acLast)}
            hint="Óptimo 0.8–1.3"
          />
          <MetricCard
            label="Monotonía"
            value={monotonia.toFixed(2)}
            tone={monotonia > 2 ? "riesgo" : monotonia > 1.5 ? "moderado" : "optimo"}
            hint="< 1.5 óptimo"
          />
        </div>

        {alerts.length > 0 && (
          <div className="rounded-lg border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 p-4">
            <div className="flex items-center gap-2 text-[color:var(--danger)] text-sm font-medium">
              <AlertTriangle className="size-4" />
              {alerts.length} sesión{alerts.length > 1 ? "es" : ""} con carga elevada (UA &gt; 600) para {player.name}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title={`Evolución RPE y Fatiga — ${player.name}`}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="rpe" stroke="var(--chart-1)" strokeWidth={2} />
                <Line type="monotone" dataKey="fatiga" stroke="var(--chart-2)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Carga por sesión (UA)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={400} stroke="var(--warning)" strokeDasharray="4 4" />
                <ReferenceLine y={600} stroke="var(--danger)" strokeDasharray="4 4" />
                <Bar dataKey="ua" radius={[4, 4, 0, 0]}>
                  {data.map((d) => (
                    <Cell key={d.id} fill={statusColor(loadStatus(d.ua))} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Ratio Agudo:Crónico individual">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis domain={[0, 2]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceArea y1={0.8} y2={1.3} fill="var(--success)" fillOpacity={0.12} />
                <ReferenceLine y={1.5} stroke="var(--danger)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="ac" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="RPE vs. Fatiga por tipo de sesión">
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" dataKey="rpe" domain={[0, 10]} name="RPE" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis type="number" dataKey="fatiga" domain={[0, 10]} name="Fatiga" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <ZAxis range={[80, 80]} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {(["TEC-TAC", "PARTIDO", "LIBRE"] as const).map((t, i) => (
                  <Scatter
                    key={t}
                    name={t}
                    data={data.filter((d) => d.type === t)}
                    fill={`var(--chart-${i + 1})`}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-medium">Registro individual — {player.name}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  {["Fecha", "Sesión", "Tipo", "Dur", "RPE", "Fatiga", "UA", "A:C", "Estado"].map((h) => (
                    <th key={h} className="text-left font-medium px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((d) => {
                  const st = loadStatus(d.ua);
                  return (
                    <tr key={d.id} className="border-t hover:bg-muted/20">
                      <td className="px-3 py-2 tabular-nums text-xs">{d.date}</td>
                      <td className="px-3 py-2">{d.label}</td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent">{d.type}</span>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{d.duration}'</td>
                      <td className="px-3 py-2 tabular-nums">{d.rpe}</td>
                      <td className="px-3 py-2 tabular-nums">{d.fatiga}</td>
                      <td className="px-3 py-2 tabular-nums" style={{ color: statusColor(st) }}>{d.ua}</td>
                      <td className="px-3 py-2 tabular-nums" style={{ color: statusColor(acStatus(d.ac)) }}>{d.ac.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="size-2 rounded-full" style={{ background: statusColor(st) }} />
                          {st === "riesgo" ? "Riesgo" : st === "moderado" ? "Precaución" : "Óptimo"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      {children}
    </div>
  );
}
