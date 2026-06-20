import type { GroupScenario, TeamScenario } from "@/lib/qualification";
import { flagSrc, shortName } from "@/lib/teams";
import { cn } from "@/lib/utils";

const COLS = ["GP", "W", "D", "L", "GD", "PTS"] as const;

type Tone = "secured" | "playoff" | "info" | "muted" | "eliminated" | "none";

/** Estado a mostrar bajo cada equipo según su escenario de clasificación. */
function rowStatus(
  ts: TeamScenario,
  i: number,
  thirdInTop8: boolean,
  started: boolean,
): { text: string; tone: Tone } {
  if (ts.outlook === "secured") return { text: "Clasificado", tone: "secured" };
  if (ts.outlook === "eliminated") return { text: "Eliminado", tone: "eliminated" };
  // 3.º: lo relevante es si entra en los 8 mejores terceros.
  if (i === 2) {
    if (started && thirdInTop8) return { text: "Mejor 3.º", tone: "playoff" };
    // 3.º fuera del corte proyectado de mejores terceros: nota en tono neutro
    // (no la zona dorada), coherente con que el bracket no le da plaza.
    return started ? { text: ts.note, tone: "muted" } : { text: "", tone: "none" };
  }
  return started ? { text: ts.note, tone: "info" } : { text: "", tone: "none" };
}

const TONE_CLASS: Record<Tone, string> = {
  secured: "text-success",
  playoff: "text-chart-4",
  info: "text-chart-4/90",
  muted: "text-muted-foreground",
  eliminated: "text-muted-foreground/55",
  none: "",
};

/** Tabla de posiciones de un grupo con zonas de clasificación y escenarios. */
export function GroupTable({
  scenario,
  thirdInTop8,
}: {
  scenario: GroupScenario;
  thirdInTop8: boolean;
}) {
  const started = scenario.rows.some((r) => r.played > 0);

  return (
    <div className="group-card overflow-hidden rounded-2xl border border-white/8 bg-card/70 backdrop-blur-sm">
      <div className="flex items-baseline justify-between gap-2 px-3 pt-3.5 pb-2">
        <h3 className="truncate text-[15px] font-semibold tracking-wide text-foreground">
          {scenario.name}
        </h3>
        <div className="gt-head flex shrink-0 font-medium whitespace-nowrap text-muted-foreground">
          {COLS.map((c) => (
            <span key={c} className="gt-col text-center tabular-nums">
              {c}
            </span>
          ))}
        </div>
      </div>

      <ul>
        {scenario.rows.map((row, i) => {
          const ts = scenario.byTeam.get(row.team);
          const status = ts
            ? rowStatus(ts, i, thirdInTop8, started)
            : { text: "", tone: "none" as Tone };
          // Banda de zona: top-2 (directo) azul · 3.º (mejor tercero) dorado.
          const zone =
            i < 2
              ? "bg-primary"
              : i === 2 && thirdInTop8
                ? "bg-chart-4"
                : "bg-transparent";
          const posColor =
            i < 2
              ? "text-primary"
              : i === 2 && thirdInTop8
                ? "text-chart-4"
                : "text-muted-foreground";
          const src = flagSrc(row.team);

          return (
            <li
              key={row.team}
              className="relative border-t border-white/10 px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-1.5 bottom-1.5 left-0 w-1 rounded-full",
                  zone,
                )}
              />
              {/* Línea principal: número, bandera y nombre alineados y
                  centrados entre sí; las cifras del grupo a la derecha. */}
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "gt-pos w-4 shrink-0 text-center font-semibold tabular-nums",
                    posColor,
                  )}
                >
                  {i + 1}
                </span>
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt=""
                    width={24}
                    height={24}
                    loading="lazy"
                    className="gt-flag shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <span className="gt-flag shrink-0 rounded-full bg-white/10 ring-1 ring-white/10" />
                )}
                <span className="gt-name min-w-0 flex-1 truncate font-medium text-foreground">
                  {shortName(row.team)}
                </span>
                <div className="gt-stat flex shrink-0 tabular-nums">
                  <Stat>{row.played}</Stat>
                  <Stat>{row.won}</Stat>
                  <Stat>{row.drawn}</Stat>
                  <Stat>{row.lost}</Stat>
                  <Stat>{row.gd > 0 ? `+${row.gd}` : row.gd}</Stat>
                  <Stat className="font-semibold text-foreground">
                    {row.points}
                  </Stat>
                </div>
              </div>

              {/* Nota compacta, alineada solo bajo el nombre (espaciadores del
                  ancho del número y de la bandera). */}
              {status.text && (
                <div className="mt-0.5 flex items-center gap-2.5">
                  <span className="w-4 shrink-0" aria-hidden />
                  <span className="gt-flag shrink-0" aria-hidden />
                  <span
                    className={cn(
                      "gt-note truncate font-medium leading-tight",
                      TONE_CLASS[status.tone],
                    )}
                  >
                    {status.text}
                  </span>
                </div>
              )}
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
    <span className={cn("gt-col text-center text-muted-foreground", className)}>
      {children}
    </span>
  );
}
