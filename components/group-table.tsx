import type { Group } from "@/lib/worldcup";
import { TeamLabel } from "@/components/team-row";
import { cn } from "@/lib/utils";

const COLS = ["GP", "W", "D", "L", "GD", "PTS"] as const;

/** Tabla de posiciones de un grupo, estilo Apple Sports. */
export function GroupTable({ group }: { group: Group }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-card/70 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
        <h3 className="text-sm font-semibold tracking-wide text-foreground">
          {group.name}
        </h3>
        <div className="grid grid-cols-6 gap-0 text-[11px] font-medium text-muted-foreground">
          {COLS.map((c) => (
            <span key={c} className="w-7 text-center tabular-nums">
              {c}
            </span>
          ))}
        </div>
      </div>

      <ul>
        {group.rows.map((row, i) => {
          const qualifies = i < 2; // top 2 avanzan directo
          return (
            <li
              key={row.team}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 transition-colors",
                "border-t border-white/5 hover:bg-white/[0.03]",
              )}
            >
              <span
                className={cn(
                  "w-4 shrink-0 text-center text-xs font-semibold tabular-nums",
                  qualifies ? "text-primary" : "text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <TeamLabel team={row.team} truncate className="flex-1" />
              <div className="grid grid-cols-6 gap-0 text-[13px] tabular-nums">
                <Stat>{row.played}</Stat>
                <Stat>{row.won}</Stat>
                <Stat>{row.drawn}</Stat>
                <Stat>{row.lost}</Stat>
                <Stat>{row.gd > 0 ? `+${row.gd}` : row.gd}</Stat>
                <Stat className="font-semibold text-foreground">{row.points}</Stat>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("w-7 text-center text-muted-foreground", className)}>
      {children}
    </span>
  );
}
