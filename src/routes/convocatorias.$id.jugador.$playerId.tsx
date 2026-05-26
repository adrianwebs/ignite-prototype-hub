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
  loadStatus,
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
  Legend,
} from "recharts";

export const Route = createFileRoute("/convocatorias/$id/jugador/$playerId")({
  head: () => ({
    meta: [{ title: "Jugador · SE-FS Load" }],
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
  const data = sess.map((s) => {
    const r = records.find(
      (x) => x.sessionId === s.id && x.playerId === player.id,
    );
    return {
      id: s.id,
      label: s.label,
      date: s.date,
      type: s.type,
      duration: s.duration,
      rpe: r?.rpe ?? 0,
      fatiga: r?.fatigue ?? 0,
      ua: r ? ua(r.rpe, s.duration) : 0,
    };
  });

  const rpeAvg = avg(data.map((d) => d.rpe));
  const fatAvg = avg(data.map((d) => d.fatiga));
  const uaTot = data.reduce((a, b) => a + b.ua, 0);
  const maxUa = Math.max(0, ...data.map((d) => d.ua));
  const status = loadStatus(maxUa);
  const statusLabel =
    status === "riesgo" ? "Riesgo" : status === "moderado" ? "Precaución" : "Normal";

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
            <p className="text-sm text-muted-foreground">{player.position}</p>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="RPE Medio" value={rpeAvg.toFixed(1)} hint="Escala 1–10" />
          <MetricCard label="Fatiga Media" value={fatAvg.toFixed(1)} hint="Escala 1–10" />
          <MetricCard label="UA Total" value={Math.round(uaTot).toLocaleString()} hint={`${data.length} sesiones`} />
          <MetricCard label="UA Máx" value={maxUa} tone={status} hint="Pico de carga" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Evolución RPE y Fatiga">
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

          <Panel title="Registro de sesiones">
            <div className="overflow-y-auto max-h-[260px]">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium py-1.5">Fecha</th>
                    <th className="text-left font-medium">Sesión</th>
                    <th className="text-right font-medium">RPE</th>
                    <th className="text-right font-medium">Fat.</th>
                    <th className="text-right font-medium">UA</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="py-1.5 tabular-nums text-xs">{d.date}</td>
                      <td className="text-xs">{d.label}</td>
                      <td className="text-right tabular-nums">{d.rpe}</td>
                      <td className="text-right tabular-nums">{d.fatiga}</td>
                      <td className="text-right tabular-nums" style={{ color: statusColor(loadStatus(d.ua)) }}>
                        {d.ua}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
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
