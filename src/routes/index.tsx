import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { callUps, sessionsOf, recordsOf, ua, avg } from "@/lib/mock-data";
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Convocatorias · SE-FS Load" },
      {
        name: "description",
        content:
          "Listado de convocatorias de la Selección Española de Fútbol Sala.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppLayout>
      <div className="px-8 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Convocatorias
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Selecciona una concentración para acceder a su dashboard de carga.
            </p>
          </div>
          <button className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90">
            + Nueva convocatoria
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {callUps.map((c) => {
            const sess = sessionsOf(c.id);
            const allUa = sess.flatMap((s) =>
              recordsOf(s.id).map((r) => ua(r.rpe, s.duration)),
            );
            const allRpe = sess.flatMap((s) =>
              recordsOf(s.id).map((r) => r.rpe),
            );
            return (
              <Link
                key={c.id}
                to="/convocatorias/$id"
                params={{ id: c.id }}
                className="rounded-lg border bg-card p-5 hover:border-primary/60 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      c.status === "En curso"
                        ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.status}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="mt-3 text-lg font-semibold">{c.name}</h3>
                <div className="mt-2 text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-3.5" />
                    {c.startDate} → {c.endDate}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3.5" /> {c.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-3.5" /> 12 jugadores · {sess.length}{" "}
                    sesiones
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">RPE medio</div>
                    <div className="text-base font-semibold tabular-nums">
                      {avg(allRpe).toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">UA total</div>
                    <div className="text-base font-semibold tabular-nums">
                      {Math.round(allUa.reduce((a, b) => a + b, 0)).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
