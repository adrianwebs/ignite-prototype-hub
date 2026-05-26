import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes · SE-FS Load" }] }),
  component: () => (
    <AppLayout>
      <div className="px-8 py-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configuración de umbrales y alertas.
        </p>

        <div className="mt-6 rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-medium">Umbrales de carga (UA por sesión)</h3>
          {[
            { label: "Óptimo", desc: "UA por debajo de…", value: 400, tone: "var(--success)" },
            { label: "Moderado", desc: "UA entre óptimo y…", value: 600, tone: "var(--warning)" },
            { label: "Riesgo", desc: "UA por encima de…", value: 600, tone: "var(--danger)" },
          ].map((t) => (
            <div key={t.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: t.tone }} />
                <div>
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </div>
              </div>
              <input
                type="number"
                defaultValue={t.value}
                className="w-24 px-2 py-1 rounded-md border bg-background text-sm text-right tabular-nums"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border bg-card p-5">
          <h3 className="text-sm font-medium">Integraciones</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Conecta Google Sheets para sincronizar los formularios de los jugadores.
          </p>
          <button className="mt-3 text-sm px-3 py-2 rounded-md border hover:bg-accent">
            Conectar Google Sheets
          </button>
        </div>
      </div>
    </AppLayout>
  ),
});
