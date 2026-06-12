import type { Match } from "@/lib/worldcup";
import { groupStageByDate } from "@/lib/worldcup";
import { matchStatus, type MatchStatus } from "@/lib/match-status";
import { formatDate, formatTime } from "@/lib/format";
import { displayName, flagSrc } from "@/lib/teams";
import { cn } from "@/lib/utils";

/** Mini bandera o disco placeholder para filas compactas del calendario. */
function MiniFlag({ team }: { team: string }) {
  const src = flagSrc(team);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={18}
      height={18}
      loading="lazy"
      className="size-[18px] shrink-0 rounded-full ring-1 ring-white/10"
    />
  ) : (
    <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-white/10 text-[8px] font-semibold text-muted-foreground ring-1 ring-white/10">
      ?
    </span>
  );
}

function ScheduleRow({
  match,
  status,
}: {
  match: Match;
  status: MatchStatus | null;
}) {
  const ft = match.score?.ft;

  return (
    <li className="flex items-center gap-2 py-2">
      <span className="w-11 shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
        {status === "live" ? (
          <span className="flex items-center gap-1 font-bold text-success">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            Live
          </span>
        ) : (
          formatTime(match.time)
        )}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <MiniFlag team={match.team1} />
        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/90">
          {displayName(match.team1)}
        </span>
      </div>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          ft
            ? "rounded-md bg-white/8 px-1.5 py-0.5 text-[12px] font-bold text-foreground"
            : "text-[10px] text-muted-foreground/60",
        )}
      >
        {ft ? `${ft[0]}–${ft[1]}` : "vs"}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        <span className="min-w-0 flex-1 truncate text-right text-[13px] text-foreground/90">
          {displayName(match.team2)}
        </span>
        <MiniFlag team={match.team2} />
      </div>
    </li>
  );
}

/** Calendario de la fase de grupos, agrupado por día. */
export function ScheduleRail({
  matches,
  now,
  className,
}: {
  matches: Match[];
  now: number | null;
  className?: string;
}) {
  const days = groupStageByDate(matches);

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/8 bg-card/60 backdrop-blur-sm",
        className,
      )}
    >
      <h3 className="px-4 pt-4 pb-2 text-sm font-semibold text-foreground">
        Calendario · Fase de grupos
      </h3>
      <div className="px-4 pb-4">
        {days.map(({ date, matches: dayMatches }) => {
          const { label } = formatDate(date);
          return (
            <section
              key={date}
              className="schedule-day border-t border-white/5 first:border-t-0"
            >
              <p className="sticky top-12 z-10 -mx-4 bg-card/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-primary/90 backdrop-blur">
                {label}
              </p>
              <ul className="divide-y divide-white/5">
                {dayMatches.map((m, i) => (
                  <ScheduleRow
                    key={`${m.team1}-${m.team2}-${i}`}
                    match={m}
                    status={now === null ? null : matchStatus(m, now)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
