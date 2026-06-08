import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { callUps, sessionsOf, recordsOf, ua, avg, players } from "@/lib/mock-data";
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Convocatorias() {
  useEffect(() => {
    document.title = "Convocatorias · SE-FS Load";
  }, []);

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
          <NuevaConvocatoriaDialog />
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
                to={`/convocatorias/${c.id}`}
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

function NuevaConvocatoriaDialog() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const togglePlayer = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90">
          + Nueva convocatoria
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva convocatoria</DialogTitle>
          <DialogDescription>
            Define los datos de la concentración y selecciona los jugadores
            convocados.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="nc-name">Nombre</Label>
            <Input
              id="nc-name"
              placeholder="Ej. Ventana Mundial — Junio 26"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nc-start">Fecha inicio</Label>
              <Input id="nc-start" type="date" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nc-end">Fecha fin</Label>
              <Input id="nc-end" type="date" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nc-location">Sede</Label>
              <Input id="nc-location" placeholder="Ej. CAR Las Rozas" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nc-type">Tipo</Label>
              <Select>
                <SelectTrigger id="nc-type">
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oficial">Competición oficial</SelectItem>
                  <SelectItem value="amistoso">Amistosos</SelectItem>
                  <SelectItem value="preparacion">Preparación</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nc-notes">Observaciones</Label>
            <Textarea
              id="nc-notes"
              placeholder="Notas internas, objetivos de la concentración..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Jugadores convocados</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {selected.length} / {players.length}
              </span>
            </div>
            <div className="rounded-md border divide-y max-h-56 overflow-y-auto">
              {players.map((p) => (
                <label
                  key={p.id}
                  htmlFor={`nc-p-${p.id}`}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                >
                  <Checkbox
                    id={`nc-p-${p.id}`}
                    checked={selected.includes(p.id)}
                    onCheckedChange={() => togglePlayer(p.id)}
                  />
                  <span className="w-7 text-xs text-muted-foreground tabular-nums">
                    {p.number}
                  </span>
                  <span className="flex-1 text-sm">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.position}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button type="button">Crear convocatoria</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
