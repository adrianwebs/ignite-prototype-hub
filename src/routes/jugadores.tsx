import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { players } from "@/lib/mock-data";

export const Route = createFileRoute("/jugadores")({
  head: () => ({ meta: [{ title: "Jugadores · SE-FS Load" }] }),
  component: () => (
    <AppLayout>
      <div className="px-8 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Jugadores</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plantilla actual de la Selección.
        </p>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {players.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card p-4 flex items-center gap-3">
              <div className="size-10 rounded-full bg-accent grid place-items-center font-semibold">
                {p.number}
              </div>
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.position}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  ),
});
