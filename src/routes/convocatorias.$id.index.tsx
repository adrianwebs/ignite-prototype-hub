import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useCallUpDashboard } from "@/hooks/useLoadData";
import {
  saveSession, deleteSession, updateSession, SESSION_TYPES, type StoredSession, type SessionType, type DayLabel, getLoadThresholds,
} from "@/lib/store";
import { avg, acwrStatus, uaStatus, statusColor, calcACWRSeries } from "@/lib/metrics";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceArea, ReferenceLine, Cell,
} from "recharts";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Download, RefreshCw, Plus, Trash2, Loader2, Users, Pencil } from "lucide-react";

type Tab = "resumen" | "sesiones" | "equipo" | "jugadores";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

export default function ConvocatoriaPage() {
  const { id } = useParams<{ id: string }>();
  const { callUp, sessions, sessionMetrics, acwrSeries, players, playerMetrics, loading, error, refresh } =
    useCallUpDashboard(id);
  const [tab, setTab] = useState<Tab>("resumen");
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const { optimo, moderado } = getLoadThresholds();

  useEffect(() => {
    document.title = callUp ? `${callUp.name} · SE-FS Load` : "Convocatoria · SE-FS Load";
  }, [callUp]);

  function refreshAll() {
    refresh();
    setSessionRefreshKey((k) => k + 1);
  }

  // ─── Filter logic ────────────────────────────────────────────────────────
  // selectedPlayers=[] means "Equipo" (all). Otherwise filter to chosen players.
  const activePlayers = selectedPlayers.length === 0 ? players : selectedPlayers;

  const filteredSessionMetrics = sessionMetrics.map((sm) => {
    if (selectedPlayers.length === 0) return sm;
    // Recalculate per-session metrics restricted to selected players
    const filteredFatigues = activePlayers
      .map((p) => sm.playerFatigue[p])
      .filter((v): v is number => v !== undefined);
    const filteredRPEs = activePlayers
      .map((p) => sm.playerRPE[p])
      .filter((v): v is number => v !== undefined);
    const fatigaMedia = filteredFatigues.length > 0
      ? +(filteredFatigues.reduce((a, b) => a + b, 0) / filteredFatigues.length).toFixed(2)
      : 0;
    const rpeMedia = filteredRPEs.length > 0
      ? +(filteredRPEs.reduce((a, b) => a + b, 0) / filteredRPEs.length).toFixed(2)
      : 0;
    const fatigaXTiempo = +(fatigaMedia * sm.duration).toFixed(0);
    const playerFatigue = Object.fromEntries(activePlayers.map((p) => [p, sm.playerFatigue[p]]).filter(([, v]) => v !== undefined));
    const playerRPE = Object.fromEntries(activePlayers.map((p) => [p, sm.playerRPE[p]]).filter(([, v]) => v !== undefined));
    const playerUA = Object.fromEntries(activePlayers.map((p) => [p, sm.playerUA[p]]).filter(([, v]) => v !== undefined));
    return { ...sm, fatigaMedia, rpeMedia, fatigaXTiempo, responseCount: filteredFatigues.length, playerFatigue, playerRPE, playerUA };
  });

  const filteredAcwrSeries = calcACWRSeries(filteredSessionMetrics.map((s) => ({ date: s.date, ua: s.fatigaXTiempo })));

  const filteredPlayerMetrics = selectedPlayers.length === 0
    ? playerMetrics
    : playerMetrics.filter((p) => selectedPlayers.includes(p.jugador));
  // ─────────────────────────────────────────────────────────────────────────

  if (!callUp && !loading) {
    return (
      <AppLayout>
        <div className="p-10 text-muted-foreground">Convocatoria no encontrada.</div>
      </AppLayout>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "sesiones", label: "Sesiones" },
    { id: "equipo", label: "Control de Carga" },
    { id: "jugadores", label: "Jugadores" },
  ];

  return (
    <AppLayout>
      <div className="px-8 py-6 border-b">
        <div className="flex items-end justify-between">
          <div>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Convocatorias</Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{callUp?.name ?? "…"}</h1>
            {callUp && (
              <p className="text-sm text-muted-foreground">
                {callUp.startDate} → {callUp.endDate} · {callUp.location}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            {players.length > 0 && (
              <PlayerFilter
                players={players}
                selected={selectedPlayers}
                onChange={setSelectedPlayers}
              />
            )}
            <button
              onClick={refreshAll}
              className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-md border hover:bg-accent"
              title="Refrescar datos del formulario"
            >
              <RefreshCw className="size-3.5" /> Sincronizar
            </button>
            {/* <button className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-md border hover:bg-accent">
              <Download className="size-3.5" /> Exportar CSV
            </button> */}
          </div>
        </div>
        <div className="mt-5 flex gap-1 -mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            No se pudo conectar con Google Sheets. Mostrando datos en caché. ({error})
          </div>
        )}

        {loading ? (
          <SyncingOverlay />
        ) : (
          <>
            {tab === "resumen" && callUp && (
              <ResumenTab
                sessionMetrics={filteredSessionMetrics}
                acwrSeries={filteredAcwrSeries}
                players={activePlayers}
                playerMetrics={filteredPlayerMetrics}
              />
            )}
            {tab === "sesiones" && callUp && (
              <SesionesTab
                callUpId={callUp.id}
                sessions={sessions}
                key={sessionRefreshKey}
                onChanged={refreshAll}
              />
            )}
            {tab === "equipo" && (
              <EquipoTab sessionMetrics={sessionMetrics} acwrSeries={acwrSeries} />
            )}
            {tab === "jugadores" && (
              <JugadoresTab players={players} playerMetrics={playerMetrics} sessions={sessions} />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

// ─── Custom tooltips ──────────────────────────────────────────────────────────

/** Shared tooltip container style */
const TT_STYLE: React.CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
  padding: "8px 12px",
  minWidth: 160,
};

function TTRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
      <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500, color: color ?? "var(--popover-foreground)" }}>
        {value}
      </span>
    </div>
  );
}

function TTDivider() {
  return <div style={{ borderTop: "1px solid var(--border)", margin: "5px 0" }} />;
}

function FatigaTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const fatiga = payload.find((p) => p.name === "Fatiga");
  const rpe = payload.find((p) => p.name === "RPE");
  const fatVal = fatiga?.value ?? 0;
  const fatColor = fatVal >= 7 ? "var(--danger)" : fatVal >= 4 ? "var(--warning)" : "var(--success)";

  return (
    <div style={TT_STYLE}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {fatiga && <TTRow label="Fatiga media" value={fatVal.toFixed(1)} color={fatColor} />}
      {rpe && <TTRow label="RPE medio" value={rpe.value.toFixed(1)} />}
    </div>
  );
}

function UATooltip({ active, payload, label, optimo, moderado }: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; ua: number; fatigaMedia: number; duration: number; tipo: string } }>;
  label?: string;
  optimo: number;
  moderado: number;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const uaColor = d.ua >= moderado ? "var(--danger)" : d.ua >= optimo ? "var(--warning)" : "var(--success)";

  return (
    <div style={TT_STYLE}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label ?? d.label}</div>
      <TTRow label="Tipo" value={d.tipo} />
      <TTRow label="Fatiga media" value={d.fatigaMedia.toFixed(1)} />
      <TTRow label="Tiempo" value={`${d.duration} min`} />
      <TTDivider />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <span style={{ color: "var(--muted-foreground)" }}>UA (F × T)</span>
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: uaColor }}>
          {d.ua}
        </span>
      </div>
    </div>
  );
}



function ACWRTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; acwr: number; aguda: number; cronica: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const ratio = d.acwr;
  const ratioColor =
    ratio >= 0.8 && ratio <= 1.3
      ? "var(--success)"
      : ratio > 1.3 && ratio <= 1.5
        ? "var(--warning)"
        : "var(--danger)";

  return (
    <div
      style={{
        background: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        fontSize: 12,
        color: "var(--popover-foreground)",
        padding: "8px 12px",
        minWidth: 160,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--popover-foreground)" }}>
        {label ?? d.label}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
        <span style={{ color: "var(--muted-foreground)" }}>Carga Aguda</span>
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{d.aguda} UA</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
        <span style={{ color: "var(--muted-foreground)" }}>Carga Crónica</span>
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{d.cronica} UA</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          paddingTop: 6,
          borderTop: "1px solid var(--border)",
        }}
      >
        <span style={{ color: "var(--muted-foreground)" }}>Ratio A:C</span>
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: ratioColor }}>
          {ratio.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─── Syncing overlay ─────────────────────────────────────────────────────────


function SyncingOverlay() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="relative size-14">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <div>
        <p className="text-sm font-medium">Sincronizando con Google Sheets…</p>
        <p className="text-xs text-muted-foreground mt-1">
          Cargando sesiones, convocatorias y respuestas del formulario.
        </p>
      </div>
    </div>
  );
}

// ─── Resumen tab ──────────────────────────────────────────────────────────────

function ResumenTab({ sessionMetrics, acwrSeries, players, playerMetrics }: {
  sessionMetrics: ReturnType<typeof useCallUpDashboard>["sessionMetrics"];
  acwrSeries: ReturnType<typeof useCallUpDashboard>["acwrSeries"];
  players: string[];
  playerMetrics: ReturnType<typeof useCallUpDashboard>["playerMetrics"];
}) {
  const { optimo, moderado } = getLoadThresholds();
  const teamFatMedia = avg(sessionMetrics.map((s) => s.fatigaMedia));
  const teamRpeMedia = avg(sessionMetrics.map((s) => s.rpeMedia));
  const teamUATotal = sessionMetrics.reduce((a, b) => a + b.fatigaXTiempo, 0);
  const lastACWR = acwrSeries[acwrSeries.length - 1];
  const acwr = lastACWR?.acwr ?? 0;

  const highFatigueAlerts = playerMetrics.filter((p) => p.ratioACWR > 1.5);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Fatiga Media Equipo" value={teamFatMedia.toFixed(1)} hint="Escala 1–10" />
        <MetricCard label="RPE Medio Equipo" value={teamRpeMedia.toFixed(1)} hint="Escala 1–10" />
        <MetricCard label="Carga Total (UA)" value={Math.round(teamUATotal).toLocaleString()} hint={`${sessionMetrics.length} sesiones`} />
        <MetricCard
          label="Ratio ACWR Equipo"
          value={acwr.toFixed(2)}
          tone={acwrStatus(acwr)}
          hint="Óptimo: 0.8–1.3"
        />
      </div>

      {players.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Sin respuestas del formulario en este rango de fechas. Los jugadores aparecerán aquí cuando respondan.
        </div>
      )}

      {highFatigueAlerts.length > 0 && (
        <div className="rounded-lg border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 p-4">
          <div className="flex items-center gap-2 text-[color:var(--danger)] text-sm font-medium">
            <AlertTriangle className="size-4" /> {highFatigueAlerts.length} jugador(es) con ratio ACWR {">"} 1.5: {highFatigueAlerts.map((p) => p.jugador).join(", ")}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Fatiga media por sesión">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={sessionMetrics.map((s) => ({
              label: s.date.slice(5),
              fatiga: s.fatigaMedia,
              rpe: s.rpeMedia,
              tipo: s.type,
            }))}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip content={<FatigaTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--foreground)" }} />
              <Line type="monotone" dataKey="fatiga" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} name="Fatiga" />
              <Line type="monotone" dataKey="rpe" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} name="RPE" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Carga por sesión (UA = Fatiga × Tiempo)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sessionMetrics.map((s) => ({
              label: s.date.slice(5),
              ua: s.fatigaXTiempo,
              fatigaMedia: s.fatigaMedia,
              duration: s.duration,
              tipo: s.type,
            }))}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip content={<UATooltip optimo={optimo} moderado={moderado} />} />
              <ReferenceLine y={optimo} stroke="var(--warning)" strokeDasharray="4 4" />
              <ReferenceLine y={moderado} stroke="var(--danger)" strokeDasharray="4 4" />
              <Bar dataKey="ua" radius={[4, 4, 0, 0]} name="UA">
                {sessionMetrics.map((s, i) => (
                  <Cell key={i} fill={statusColor(uaStatus(s.fatigaXTiempo))} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Ratio A:C (2-5) equipo — evolución">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={acwrSeries.map((s) => ({
                label: s.date.slice(5),
                acwr: s.acwr,
                aguda: s.aguda,
                cronica: s.cronica,
              }))}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis domain={[0, 2]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip content={<ACWRTooltip />} />
              <ReferenceArea y1={0.8} y2={1.3} fill="var(--success)" fillOpacity={0.12} />
              <ReferenceLine y={1.5} stroke="var(--danger)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="acwr" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3 }} name="Ratio A:C" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">Banda verde: zona óptima (0.8–1.3). Línea roja: umbral de riesgo (1.5).</p>
        </Panel>

        <Panel title="Heatmap fatiga — jugadores × sesiones">
          {players.length === 0
            ? <p className="text-xs text-muted-foreground py-8 text-center">Sin datos de formulario.</p>
            : <FatigaHeatmap players={players} sessionMetrics={sessionMetrics} />
          }
        </Panel>
      </div>
    </>
  );
}

// ─── Sesiones tab ─────────────────────────────────────────────────────────────

function SesionesTab({ callUpId, sessions, onChanged }: {
  callUpId: string; sessions: StoredSession[]; onChanged: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<StoredSession | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta sesión?")) return;
    setDeletingId(id);
    try {
      await deleteSession(id);
      onChanged();
    } catch (e) {
      alert(`Error al eliminar sesión: ${e}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-medium">Sesiones de trabajo</h3>
          <NuevaSesionDialog callUpId={callUpId} onCreated={onChanged} />
        </div>
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No hay sesiones. Usa "+ Añadir sesión" para registrar los entrenamientos.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                {["Fecha", "Día", "Tipo", "Duración (min)", ""].map((h) => (
                  <th key={h} className="text-left font-medium px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 tabular-nums">{s.date}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {s.dayLabel ? `Dia ${s.dayLabel}` : "Dia"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent">{s.type}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{s.duration}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingSession(s)}
                        className="p-1 rounded hover:bg-accent transition-colors"
                        title="Editar sesión"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
                        title="Eliminar sesión"
                      >
                        {deletingId === s.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingSession && (
        <EditSesionDialog
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSaved={() => { setEditingSession(null); onChanged(); }}
        />
      )}
    </>
  );
}

// ─── Equipo tab ───────────────────────────────────────────────────────────────

function EquipoTab({ sessionMetrics, acwrSeries }: {
  sessionMetrics: ReturnType<typeof useCallUpDashboard>["sessionMetrics"];
  acwrSeries: ReturnType<typeof useCallUpDashboard>["acwrSeries"];
}) {
  const tableData = sessionMetrics.map((s, i) => {
    const w7UA = acwrSeries.slice(Math.max(0, i - 6), i + 1).map((a) => a.ua);
    const uaMedia = avg(w7UA);
    return {
      ...s,
      aguda: acwrSeries[i]?.aguda ?? 0,
      cronica: acwrSeries[i]?.cronica ?? 0,
      acwr: acwrSeries[i]?.acwr ?? 0,
    };
  });

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-medium">Control de Carga — Tabla completa</h3>
        <p className="text-xs text-muted-foreground mt-0.5">UA = Fatiga × Duración (min)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {["Fecha", "Tipo", "Dur (min)", "Resp.", "Fatiga media", "UA (F×T)", "Aguda", "Crónica", "Ratio A:C"].map((h) => (
                <th key={h} className="text-left font-medium px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((r) => (
              <tr key={r.sessionId} className="border-t hover:bg-muted/20">
                <td className="px-3 py-2 tabular-nums">{r.date}</td>
                <td className="px-3 py-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-accent">{r.type}</span></td>
                <td className="px-3 py-2 tabular-nums">{r.duration}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.responseCount}</td>
                <td className="px-3 py-2 tabular-nums">{r.fatigaMedia.toFixed(1)}</td>
                <td className="px-3 py-2 tabular-nums font-medium" style={{ color: statusColor(uaStatus(r.fatigaXTiempo)) }}>
                  {Math.round(r.fatigaXTiempo)}
                </td>
                <td className="px-3 py-2 tabular-nums">{r.aguda}</td>
                <td className="px-3 py-2 tabular-nums">{r.cronica}</td>
                <td className="px-3 py-2 tabular-nums font-medium" style={{ color: statusColor(acwrStatus(r.acwr)) }}>
                  {r.acwr.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Jugadores tab ────────────────────────────────────────────────────────────

function JugadoresTab({ players, playerMetrics, sessions }: {
  players: string[];
  playerMetrics: ReturnType<typeof useCallUpDashboard>["playerMetrics"];
  sessions: StoredSession[];
}) {
  if (players.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Sin respuestas del formulario en este rango de fechas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {playerMetrics.map((p) => (
          <PlayerCard key={p.jugador} metrics={p} />
        ))}
      </div>
    </div>
  );
}

function PlayerCard({ metrics: p }: { metrics: ReturnType<typeof useCallUpDashboard>["playerMetrics"][number] }) {
  const acwrSt = acwrStatus(p.ratioACWR);
  const uaSt = uaStatus(p.uaMax);
  const worst = acwrSt === "riesgo" || uaSt === "riesgo" ? "riesgo" : acwrSt === "moderado" || uaSt === "moderado" ? "moderado" : "optimo";

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-medium">{p.jugador}</div>
          <div className="text-[11px] text-muted-foreground">{p.responseCount} respuestas</div>
        </div>
        <span className="size-2.5 rounded-full" style={{ background: statusColor(worst) }} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <MiniStat label="Fatiga media" value={p.fatigaMedia.toFixed(1)} />
        <MiniStat label="RPE medio" value={p.rpeMedia.toFixed(1)} />
        <MiniStat label="UA total" value={Math.round(p.uaTotal).toLocaleString()} />
        <MiniStat label="UA máx" value={p.uaMax.toLocaleString()} color={statusColor(uaSt)} />
        <MiniStat label="Monotonía" value={p.indiceDeMonotonia.toFixed(2)} />
        <MiniStat label="ACWR" value={p.ratioACWR.toFixed(2)} color={statusColor(acwrSt)} />
      </div>
    </div>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function FatigaHeatmap({ players, sessionMetrics }: {
  players: string[];
  sessionMetrics: ReturnType<typeof useCallUpDashboard>["sessionMetrics"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="text-[11px] border-separate border-spacing-[2px]">
        <thead>
          <tr>
            <th className="text-left text-muted-foreground font-normal pr-2">Jugador</th>
            {sessionMetrics.map((s) => (
              <th key={s.sessionId} className="text-muted-foreground font-normal px-1 whitespace-nowrap" title={s.type}>
                {s.date.slice(5)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((jugador) => (
            <tr key={jugador}>
              <td className="pr-2 whitespace-nowrap">{jugador}</td>
              {sessionMetrics.map((s) => {
                const fat = s.playerFatigue[jugador];
                if (fat === undefined) return <td key={s.sessionId} className="size-6 rounded bg-muted/20" />;
                const intensity = fat / 10;
                const color = fat >= 7
                  ? `oklch(0.55 0.22 25 / ${0.3 + intensity * 0.6})`
                  : fat >= 4
                    ? `oklch(0.75 0.16 70 / ${0.25 + intensity * 0.6})`
                    : `oklch(0.74 0.15 175 / ${0.2 + intensity * 0.6})`;
                return (
                  <td
                    key={s.sessionId}
                    title={`${jugador} · ${s.date} · Fatiga ${fat}`}
                    className="size-6 text-center tabular-nums text-[10px] rounded"
                    style={{ background: color, color: "white" }}
                  >
                    {fat}
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

// ─── Nueva sesión dialog ──────────────────────────────────────────────────────

function NuevaSesionDialog({ callUpId, onCreated }: { callUpId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  // Radix Select doesn't allow value="", so we use "single" to represent DayLabel ""
  const [dayLabelSelect, setDayLabelSelect] = useState<string>("single");
  const [type, setType] = useState<SessionType>("TEC-TAC");
  const [duration, setDuration] = useState("");

  const dayLabel: DayLabel = dayLabelSelect === "single" ? "" : (dayLabelSelect as DayLabel);

  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!date || !duration) return;
    setSaving(true);
    try {
      await saveSession({ callUpId, date, dayLabel, type, duration: parseInt(duration, 10) });
      setOpen(false);
      setDate(""); setDayLabelSelect("single"); setType("TEC-TAC"); setDuration("");
      onCreated();
    } catch (e) {
      alert(`Error al guardar sesión: ${e}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground flex items-center gap-1.5">
          <Plus className="size-3" /> Añadir sesión
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Nueva sesión de trabajo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ns-date">Fecha *</Label>
              <Input id="ns-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ns-label">Momento del día</Label>
              <Select value={dayLabelSelect} onValueChange={setDayLabelSelect}>
                <SelectTrigger id="ns-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Dia (único)</SelectItem>
                  <SelectItem value="M">Dia M (Mañana)</SelectItem>
                  <SelectItem value="T">Dia T (Tarde)</SelectItem>
                  <SelectItem value="M-T">Dia M-T (Mañana-Tarde)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ns-type">Tipo de sesión *</Label>
            <Select value={type} onValueChange={(v) => setType(v as SessionType)}>
              <SelectTrigger id="ns-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ns-duration">Duración (minutos) *</Label>
            <Input id="ns-duration" type="number" min={1} max={240} placeholder="Ej. 75"
              value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleCreate} disabled={!date || !duration || saving}>
            {saving ? "Guardando…" : "Guardar sesión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Player filter ────────────────────────────────────────────────────────────

function PlayerFilter({
  players,
  selected,
  onChange,
}: {
  players: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const label =
    selected.length === 0
      ? "Equipo"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} jugadores`;

  function toggle(player: string) {
    if (selected.includes(player)) {
      onChange(selected.filter((p) => p !== player));
    } else {
      onChange([...selected, player]);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`text-xs flex items-center gap-1.5 px-3 py-2 rounded-md border transition-colors ${selected.length > 0
            ? "bg-primary/10 border-primary/40 text-primary"
            : "hover:bg-accent"
          }`}
      >
        <Users className="size-3.5" />
        {label}
        <span className="ml-0.5 text-muted-foreground">▾</span>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border bg-popover shadow-lg py-1 text-sm text-popover-foreground">
            {/* Equipo = deselect all */}
            <button
              onClick={() => { onChange([]); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-accent ${selected.length === 0 ? "font-semibold text-primary" : ""
                }`}
            >
              <span className={`size-3.5 rounded border flex items-center justify-center ${selected.length === 0 ? "bg-primary border-primary" : "border-muted-foreground"
                }`}>
                {selected.length === 0 && <span className="text-primary-foreground text-[9px]">✓</span>}
              </span>
              Equipo (todos)
            </button>

            <div className="border-t my-1" />

            {players.map((p) => {
              const checked = selected.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => toggle(p)}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-accent"
                >
                  <span className={`size-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-primary border-primary" : "border-muted-foreground"
                    }`}>
                    {checked && <span className="text-primary-foreground text-[9px]">✓</span>}
                  </span>
                  <span className="truncate max-w-[140px]">{p}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Edit sesión dialog ───────────────────────────────────────────────────────

function EditSesionDialog({
  session,
  onClose,
  onSaved,
}: {
  session: StoredSession;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(session.date);
  const [dayLabelSelect, setDayLabelSelect] = useState<string>(
    session.dayLabel === "" ? "single" : session.dayLabel
  );
  const [type, setType] = useState<SessionType>(session.type);
  const [duration, setDuration] = useState(String(session.duration));
  const [saving, setSaving] = useState(false);

  const dayLabel: DayLabel = dayLabelSelect === "single" ? "" : (dayLabelSelect as DayLabel);

  async function handleSave() {
    if (!date || !duration) return;
    setSaving(true);
    try {
      await updateSession({ ...session, date, dayLabel, type, duration: parseInt(duration, 10) });
      onSaved();
    } catch (e) {
      alert(`Error al actualizar sesión: ${e}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Editar sesión</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="es-date">Fecha *</Label>
              <Input id="es-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="es-label">Momento del día</Label>
              <Select value={dayLabelSelect} onValueChange={setDayLabelSelect}>
                <SelectTrigger id="es-label"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Dia (único)</SelectItem>
                  <SelectItem value="M">Dia M (Mañana)</SelectItem>
                  <SelectItem value="T">Dia T (Tarde)</SelectItem>
                  <SelectItem value="M-T">Dia M-T (Mañana-Tarde)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="es-type">Tipo de sesión *</Label>
            <Select value={type} onValueChange={(v) => setType(v as SessionType)}>
              <SelectTrigger id="es-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="es-duration">Duración (minutos) *</Label>
            <Input
              id="es-duration"
              type="number"
              min={1}
              max={240}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" onClick={onClose}>Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={!date || !duration || saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────


function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      {children}
    </div>
  );
}

function MetricCard({ label, value, hint, tone }: {
  label: string; value: string; hint?: string; tone?: "optimo" | "moderado" | "riesgo";
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-1" style={tone ? { color: statusColor(tone) } : undefined}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}
