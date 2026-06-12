"use client";

import { useEffect, useRef } from "react";
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

/** "2026-06-12" en hora local del usuario. */
function localIsoDate(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  const today = now === null ? null : localIsoDate(now);
  const todayRef = useRef<HTMLElement | null>(null);
  const scrollBoxRef = useRef<HTMLDivElement | null>(null);

  // Posiciona el día de hoy DENTRO del contenedor con scroll propio.
  // Nada de scrollIntoView: ese también scrollea la página y la app
  // abría con el header fuera de pantalla.
  useEffect(() => {
    const position = () => {
      const section = todayRef.current;
      const box = scrollBoxRef.current;
      if (!section || !box) return;
      box.scrollTop =
        section.getBoundingClientRect().top -
        box.getBoundingClientRect().top +
        box.scrollTop;
    };
    position();
    // Segundo pase: content-visibility materializa alturas reales al scrollear.
    const raf = requestAnimationFrame(position);
    return () => cancelAnimationFrame(raf);
  }, [today]);

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
      <div
        ref={scrollBoxRef}
        className="no-scrollbar max-h-[calc(100dvh-13rem)] overflow-y-auto px-4 pb-4"
      >
        {days.map(({ date, matches: dayMatches }) => {
          const { label } = formatDate(date);
          const isToday = date === today;
          return (
            <section
              key={date}
              ref={isToday ? todayRef : undefined}
              className="schedule-day border-t border-white/5 first:border-t-0"
            >
              <p className="sticky top-0 z-10 -mx-4 flex items-center gap-2 bg-card/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-primary/90 backdrop-blur">
                {label}
                {isToday && (
                  <span className="rounded-full bg-success/15 px-1.5 py-px text-[9px] font-bold text-success">
                    Hoy
                  </span>
                )}
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
