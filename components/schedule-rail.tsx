"use client";

import { useEffect, useRef, useState } from "react";
import type { Match } from "@/lib/worldcup";
import { groupStageByDate } from "@/lib/worldcup";
import { matchStatus, type MatchStatus } from "@/lib/match-status";
import { formatDate, formatTime, visitorTime } from "@/lib/format";
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
  // Hora en la zona del visitante; hasta montar (status null) cae a la
  // hora de la sede para no romper la hidratación.
  const local = status === null ? null : visitorTime(match);

  return (
    <li className="flex items-center gap-2 py-2">
      <span className="w-16 shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
        {status === "live" ? (
          <span className="flex items-center gap-1 font-bold text-success">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            Live
          </span>
        ) : (
          <>
            {local?.time ?? formatTime(match.time)}
            {local?.nextDay && (
              <span className="block text-[9px] text-muted-foreground/60">
                +1 día
              </span>
            )}
          </>
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

  // La caja del calendario tiene scroll propio; su alto se calcula para que
  // el fondo siempre caiga dentro del viewport. Un offset fijo (antes 13rem)
  // subestimaba la cabecera real y empujaba el último día fuera de pantalla;
  // como la caja usa overscroll-contain el scroll no encadenaba al documento
  // y ese final quedaba inalcanzable. Medimos la posición real de la caja y
  // recalculamos en cada cambio de viewport (incluida la barra de URL móvil).
  const [maxH, setMaxH] = useState<number | null>(null);
  useEffect(() => {
    const box = scrollBoxRef.current;
    if (!box) return;
    const measure = () => {
      // Offset absoluto del tope de la caja en el documento (estable ante el
      // scroll, ya que getBoundingClientRect es relativo al viewport).
      const top = box.getBoundingClientRect().top + window.scrollY;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      // 64px de respiro inferior = el pb-16 del <main>, para que la card
      // entera quepa y no quede scroll del documento que pelee con la caja.
      setMaxH(Math.max(220, Math.round(vh - top - 64)));
    };
    measure();
    // La fuente puede cambiar el alto de la cabecera al cargar.
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  // Posiciona el día de hoy DENTRO del contenedor con scroll propio.
  // Nada de scrollIntoView: ese también scrollea la página y la app
  // abría con el header fuera de pantalla.
  const scrollToToday = () => {
    const box = scrollBoxRef.current;
    if (!box) return;
    const target = () => {
      const section = todayRef.current;
      if (!section) return null;
      return (
        section.getBoundingClientRect().top -
        box.getBoundingClientRect().top +
        box.scrollTop
      );
    };
    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? "auto"
      : "smooth";
    const top = target();
    if (top === null) return;
    box.scrollTo({ top, behavior });
    // content-visibility materializa alturas reales durante el scroll, así
    // que el destino puede moverse: corrige una vez al terminar la animación.
    box.addEventListener(
      "scrollend",
      () => {
        const t = target();
        if (t !== null && Math.abs(box.scrollTop - t) > 1) {
          box.scrollTo({ top: t, behavior });
        }
      },
      { once: true },
    );
  };

  const hasToday = today !== null && days.some(({ date }) => date === today);

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/8 bg-card/60 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">
          Calendario · Fase de grupos
        </h3>
        {hasToday && (
          <button
            type="button"
            onClick={scrollToToday}
            className="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-bold text-success transition-colors hover:bg-success/25"
          >
            Hoy
          </button>
        )}
      </div>
      <div
        ref={scrollBoxRef}
        style={maxH !== null ? { maxHeight: maxH } : undefined}
        className="no-scrollbar max-h-[calc(100dvh-13rem)] overflow-y-auto overscroll-contain px-4 pb-4"
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
