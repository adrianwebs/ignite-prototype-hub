import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getLoadThresholds, saveLoadThresholds } from "@/lib/store";
import { toast } from "sonner";

export default function Ajustes() {
  const [optimo, setOptimo] = useState(400);
  const [moderado, setModerado] = useState(600);

  useEffect(() => {
    document.title = "Ajustes · SE-FS Load";
    const thresholds = getLoadThresholds();
    setOptimo(thresholds.optimo);
    setModerado(thresholds.moderado);
  }, []);

  const handleSave = () => {
    if (optimo <= 0 || moderado <= 0) {
      toast.error("Los umbrales deben ser mayores que cero.");
      return;
    }
    if (optimo >= moderado) {
      toast.error("El umbral óptimo debe ser menor que el moderado.");
      return;
    }
    saveLoadThresholds({ optimo, moderado });
    toast.success("Umbrales de carga guardados correctamente.");
  };

  return (
    <AppLayout>
      <div className="px-8 py-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">Configuración de umbrales y alertas.</p>

        <div className="mt-6 rounded-lg border bg-card p-5 space-y-5">
          <h3 className="text-sm font-medium">Umbrales de carga (UA por sesión)</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: "var(--success)" }} />
                <div>
                  <div className="text-sm font-medium">Óptimo</div>
                  <div className="text-xs text-muted-foreground">UA por debajo de…</div>
                </div>
              </div>
              <input
                type="number"
                value={optimo}
                onChange={(e) => setOptimo(parseInt(e.target.value, 10) || 0)}
                className="w-24 px-2 py-1 rounded-md border bg-background text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: "var(--warning)" }} />
                <div>
                  <div className="text-sm font-medium">Moderado</div>
                  <div className="text-xs text-muted-foreground">UA entre óptimo y…</div>
                </div>
              </div>
              <input
                type="number"
                value={moderado}
                onChange={(e) => setModerado(parseInt(e.target.value, 10) || 0)}
                className="w-24 px-2 py-1 rounded-md border bg-background text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between opacity-80">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: "var(--danger)" }} />
                <div>
                  <div className="text-sm font-medium">Riesgo</div>
                  <div className="text-xs text-muted-foreground">UA por encima de {moderado}</div>
                </div>
              </div>
              <div className="w-24 px-2 py-1 text-sm text-right tabular-nums text-muted-foreground bg-muted/20 border rounded-md select-none">
                &gt; {moderado}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t flex justify-end">
            <button
              onClick={handleSave}
              className="text-xs font-semibold px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-md shadow-sm transition-colors"
            >
              Guardar cambios
            </button>
          </div>
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
  );
}
