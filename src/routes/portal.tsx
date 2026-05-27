import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  players,
  callUps,
  sessionsOf,
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
  ReferenceLine,
} from "recharts";
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  LogOut,
  Activity,
  Flame,
  Trophy,
  Dumbbell,
} from "lucide-react";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Portal del Jugador · SE-FS Load" },
      {
        name: "description",
        content:
          "Portal de auto-reporte de RPE y fatiga para jugadores de la Selección Española de Fútbol Sala.",
      },
    ],
  }),
  component: PortalPage,
});

type Submission = {
  sessionId: string;
  playerId: string;
  rpe: number;
  fatigue: number;
  at: number;
};

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function PortalPage() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const player = players.find((p) => p.id === playerId) ?? null;
  const currentCallUp = callUps.find((c) => c.status === "En curso") ?? callUps[0];
  const sess = useMemo(
    () => sessionsOf(currentCallUp.id),
    [currentCallUp.id],
  );

  if (!player) {
    return (
      <PhoneFrame>
        <LoginScreen onSelect={setPlayerId} />
      </PhoneFrame>
    );
  }

  const activeSession = sess.find((s) => s.id === activeSessionId);
  if (activeSession) {
    return (
      <PhoneFrame>
        <ReportScreen
          player={player}
          session={activeSession}
          onCancel={() => setActiveSessionId(null)}
          onSubmit={(rpe, fatigue) => {
            setSubmissions((prev) => [
              ...prev.filter(
                (s) =>
                  !(s.sessionId === activeSession.id && s.playerId === player.id),
              ),
              {
                sessionId: activeSession.id,
                playerId: player.id,
                rpe,
                fatigue,
                at: Date.now(),
              },
            ]);
            setActiveSessionId(null);
          }}
        />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <HomeScreen
        player={player}
        callUp={currentCallUp}
        sessions={sess}
        submissions={submissions}
        onLogout={() => setPlayerId(null)}
        onSelectSession={(id) => setActiveSessionId(id)}
      />
    </PhoneFrame>
  );
}

/* ---------------- Phone shell ---------------- */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[color:var(--sidebar)] via-background to-[color:var(--sidebar-accent)] flex flex-col items-center justify-center py-8 px-4">
      <Link
        to="/"
        className="mb-4 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ChevronLeft className="size-3" /> Volver al panel técnico
      </Link>
      <div className="relative w-full max-w-[420px] rounded-[2.5rem] border-[10px] border-[color:var(--sidebar)] bg-background shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[color:var(--sidebar)] rounded-b-2xl z-20" />
        <div className="h-[760px] overflow-y-auto">{children}</div>
      </div>
      <div className="mt-4 text-[11px] text-muted-foreground">
        Portal del Jugador · Vista móvil simulada
      </div>
    </div>
  );
}

/* ---------------- Login ---------------- */
function LoginScreen({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="pt-12 pb-8 px-6 min-h-full flex flex-col">
      <div className="text-center mb-8">
        <div className="mx-auto size-16 rounded-2xl bg-primary text-primary-foreground grid place-items-center font-bold text-2xl shadow-lg">
          SE
        </div>
        <h1 className="mt-4 text-xl font-semibold">Portal del Jugador</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Selecciona tu perfil para acceder
        </p>
      </div>

      <div className="space-y-2 flex-1">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary/60 hover:bg-accent/30 transition-colors text-left"
          >
            <div className="size-10 rounded-full bg-accent text-accent-foreground grid place-items-center font-bold">
              {p.number}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{p.name}</div>
              <div className="text-[11px] text-muted-foreground">{p.position}</div>
            </div>
            <ChevronLeft className="size-4 text-muted-foreground rotate-180" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Home ---------------- */
function HomeScreen({
  player,
  callUp,
  sessions,
  submissions,
  onLogout,
  onSelectSession,
}: {
  player: (typeof players)[number];
  callUp: (typeof callUps)[number];
  sessions: ReturnType<typeof sessionsOf>;
  submissions: Submission[];
  onLogout: () => void;
  onSelectSession: (id: string) => void;
}) {
  const today = sessions[Math.min(2, sessions.length - 1)]?.date;
  const todaySessions = sessions.filter((s) => s.date === today);
  const pastSessions = sessions.filter((s) => s.date < (today ?? ""));

  const isSubmitted = (sid: string) =>
    submissions.some((s) => s.sessionId === sid && s.playerId === player.id) ||
    // pretend past sessions are already submitted via mock data
    pastSessions.some((p) => p.id === sid);

  // personal history (mock + new submissions)
  const history = pastSessions.map((s) => {
    const sub = submissions.find(
      (x) => x.sessionId === s.id && x.playerId === player.id,
    );
    const baseRec = records.find(
      (r) => r.sessionId === s.id && r.playerId === player.id,
    );
    const rpe = sub?.rpe ?? baseRec?.rpe ?? 0;
    const fat = sub?.fatigue ?? baseRec?.fatigue ?? 0;
    return {
      id: s.id,
      label: s.label.slice(0, 8),
      date: s.date,
      rpe,
      fatiga: fat,
      ua: rpe * s.duration,
    };
  });

  const rpeAvg = avg(history.map((h) => h.rpe));
  const fatAvg = avg(history.map((h) => h.fatiga));
  const uaTot = history.reduce((a, b) => a + b.ua, 0);
  const status = loadStatus(Math.max(0, ...history.map((h) => h.ua)));

  return (
    <div className="pb-6">
      {/* header */}
      <div className="bg-[color:var(--sidebar)] text-[color:var(--sidebar-foreground)] px-5 pt-10 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">
              {player.number}
            </div>
            <div>
              <div className="text-xs opacity-70">Hola,</div>
              <div className="text-base font-semibold">{player.name}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="size-9 rounded-lg bg-white/10 hover:bg-white/20 grid place-items-center"
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
        </div>
        <div className="mt-5 rounded-xl bg-white/10 p-3">
          <div className="flex items-center gap-2 text-[11px] opacity-80">
            <Trophy className="size-3.5" /> Concentración activa
          </div>
          <div className="text-sm font-medium mt-0.5">{callUp.name}</div>
          <div className="text-[11px] opacity-70 mt-0.5">{callUp.location}</div>
        </div>
      </div>

      <div className="px-5 -mt-3 space-y-5">
        {/* pending today */}
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Sesiones de hoy</h2>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {today}
            </span>
          </div>
          {todaySessions.length === 0 && (
            <div className="text-xs text-muted-foreground py-4 text-center">
              No hay sesiones programadas para hoy.
            </div>
          )}
          <div className="space-y-2">
            {todaySessions.map((s) => {
              const done = isSubmitted(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => !done && onSelectSession(s.id)}
                  disabled={done}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                    done
                      ? "bg-[color:var(--success)]/10 border-[color:var(--success)]/30"
                      : "bg-background hover:border-primary/60"
                  }`}
                >
                  <div
                    className={`size-10 rounded-lg grid place-items-center ${
                      s.type === "PARTIDO"
                        ? "bg-primary/15 text-primary"
                        : s.type === "LIBRE"
                          ? "bg-muted text-muted-foreground"
                          : "bg-accent/40 text-accent-foreground"
                    }`}
                  >
                    {s.type === "PARTIDO" ? (
                      <Trophy className="size-5" />
                    ) : (
                      <Dumbbell className="size-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" /> {s.duration} min · {s.type}
                    </div>
                  </div>
                  {done ? (
                    <CheckCircle2 className="size-5 text-[color:var(--success)]" />
                  ) : (
                    <span className="text-[11px] font-medium text-primary">
                      Reportar →
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* stats */}
        <section className="grid grid-cols-3 gap-2">
          <Stat label="RPE medio" value={rpeAvg.toFixed(1)} icon={<Activity className="size-3.5" />} />
          <Stat label="Fatiga" value={fatAvg.toFixed(1)} icon={<Flame className="size-3.5" />} />
          <Stat
            label="UA máx"
            value={Math.max(0, ...history.map((h) => h.ua)).toString()}
            tone={status}
          />
        </section>

        {/* trend */}
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-1">Tu evolución</h2>
          <p className="text-[11px] text-muted-foreground mb-3">
            RPE y fatiga en las últimas sesiones
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={history} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="rpe" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="fatiga" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* load bars */}
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-1">Tu carga (UA)</h2>
          <p className="text-[11px] text-muted-foreground mb-3">
            Total acumulado: {Math.round(uaTot).toLocaleString()} UA
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={history} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={400} stroke="var(--warning)" strokeDasharray="4 4" />
              <ReferenceLine y={600} stroke="var(--danger)" strokeDasharray="4 4" />
              <Bar dataKey="ua" radius={[4, 4, 0, 0]}>
                {history.map((d) => (
                  <Cell key={d.id} fill={statusColor(loadStatus(d.ua))} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* history list */}
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Historial reciente</h2>
          <div className="space-y-2">
            {history
              .slice()
              .reverse()
              .slice(0, 5)
              .map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between text-xs py-1.5 border-b last:border-0"
                >
                  <div>
                    <div className="font-medium">{h.label}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      {h.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span>RPE {h.rpe}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>Fat {h.fatiga}</span>
                    <span
                      className="px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: `color-mix(in oklab, ${statusColor(loadStatus(h.ua))} 18%, transparent)`,
                        color: statusColor(loadStatus(h.ua)),
                      }}
                    >
                      {h.ua} UA
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "optimo" | "moderado" | "riesgo";
}) {
  const color = tone ? statusColor(tone) : undefined;
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums mt-0.5" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

/* ---------------- Report form ---------------- */
function ReportScreen({
  player,
  session,
  onCancel,
  onSubmit,
}: {
  player: (typeof players)[number];
  session: ReturnType<typeof sessionsOf>[number];
  onCancel: () => void;
  onSubmit: (rpe: number, fatigue: number) => void;
}) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [fatigue, setFatigue] = useState<number | null>(null);
  const canSubmit = rpe !== null && fatigue !== null;
  const uaPreview = rpe ? ua(rpe, session.duration) : 0;
  const status = loadStatus(uaPreview);

  return (
    <div className="pb-6">
      <div className="bg-[color:var(--sidebar)] text-[color:var(--sidebar-foreground)] px-5 pt-10 pb-5 rounded-b-3xl">
        <button
          onClick={onCancel}
          className="text-xs opacity-80 hover:opacity-100 inline-flex items-center gap-1"
        >
          <ChevronLeft className="size-3" /> Volver
        </button>
        <div className="mt-3">
          <div className="text-[11px] opacity-70">Reportando · {player.name}</div>
          <div className="text-lg font-semibold">{session.label}</div>
          <div className="text-[11px] opacity-70 mt-0.5">
            {session.date} · {session.duration} min · {session.type}
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-6">
        <Scale
          title="¿Cómo de intensa fue la sesión?"
          subtitle="RPE — Escala de esfuerzo percibido (1–10)"
          minLabel="Muy ligera"
          maxLabel="Máxima"
          value={rpe}
          onChange={setRpe}
        />
        <Scale
          title="¿Cómo te sientes ahora?"
          subtitle="Nivel de fatiga (1–10)"
          minLabel="Fresco"
          maxLabel="Agotado"
          value={fatigue}
          onChange={setFatigue}
        />

        {canSubmit && (
          <div
            className="rounded-xl border p-3 text-xs flex items-center justify-between"
            style={{
              borderColor: statusColor(status),
              background: `color-mix(in oklab, ${statusColor(status)} 12%, transparent)`,
            }}
          >
            <span>Carga estimada</span>
            <span className="font-semibold tabular-nums" style={{ color: statusColor(status) }}>
              {uaPreview} UA
            </span>
          </div>
        )}

        <button
          disabled={!canSubmit}
          onClick={() => canSubmit && onSubmit(rpe!, fatigue!)}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          Enviar reporte
        </button>
        <p className="text-[10px] text-center text-muted-foreground">
          Tu respuesta se sincroniza con el cuerpo técnico al instante.
        </p>
      </div>
    </div>
  );
}

function Scale({
  title,
  subtitle,
  minLabel,
  maxLabel,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  minLabel: string;
  maxLabel: string;
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[11px] text-muted-foreground mb-3">{subtitle}</div>
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = value === n;
          const tone =
            n <= 3
              ? "var(--success)"
              : n <= 6
                ? "var(--warning)"
                : "var(--danger)";
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className="aspect-square rounded-lg text-sm font-semibold tabular-nums border transition-all"
              style={
                active
                  ? {
                      background: tone,
                      borderColor: tone,
                      color: "var(--background)",
                      transform: "scale(1.05)",
                    }
                  : {
                      borderColor: "var(--border)",
                      color: "var(--muted-foreground)",
                    }
              }
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
