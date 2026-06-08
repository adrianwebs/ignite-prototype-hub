import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Activity,
  TrendingUp,
  CalendarDays,
  Settings,
  Bell,
  Smartphone,
} from "lucide-react";
import { ReactNode } from "react";

const nav = [
  { to: "/", label: "Convocatorias", icon: CalendarDays },
  { to: "/jugadores", label: "Jugadores", icon: Users },
  { to: "/portal", label: "Portal Jugador", icon: Smartphone },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
];


export function AppLayout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
            SE
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">SE-FS Load</div>
            <div className="text-[11px] text-muted-foreground">
              Control de Carga
            </div>
          </div>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {nav.map((n) => {
            const active =
              n.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                }`}
              >
                <Icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border text-[11px] text-muted-foreground">
          v1.0 · MVP
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center justify-between px-6 bg-background/70 backdrop-blur sticky top-0 z-10">
          <div className="text-sm text-muted-foreground">
            Selección Española de Fútbol Sala · Cuerpo Técnico
          </div>
          <div className="flex items-center gap-3">
            <button className="size-8 rounded-md hover:bg-accent grid place-items-center text-muted-foreground">
              <Bell className="size-4" />
            </button>
            <div className="size-8 rounded-full bg-accent grid place-items-center text-xs font-medium">
              PF
            </div>
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

export const Icons = { LayoutDashboard, Activity, TrendingUp };
