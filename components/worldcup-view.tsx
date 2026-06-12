"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsIndicator,
} from "@/components/ui/tabs";
import { GroupTable } from "@/components/group-table";
import { MatchCard } from "@/components/match-card";
import { ScheduleRail } from "@/components/schedule-rail";
import { useWorldCup } from "@/lib/use-worldcup";
import {
  STAGES,
  buildGroups,
  knockoutMatches,
  type Match,
} from "@/lib/worldcup";

const KNOCKOUT_STAGES = ["R32", "R16", "QF"] as const;

// SF y F se compactan en una sola pestaña final que muestra ambas rondas
// (o "Esperando resultados" mientras el fixture no llegue ahí).
const VISIBLE_STAGES = STAGES.filter((s) => s.key !== "SF" && s.key !== "F");
const FINALS_TAB = { key: "FIN", label: "Finales" };

// Orden visual de las pestañas, para navegar con swipe.
const TAB_ORDER: string[] = [
  "CAL",
  ...VISIBLE_STAGES.map((s) => s.key),
  FINALS_TAB.key,
];

// Umbrales del swipe: cuánto hay que arrastrar para cambiar de pestaña al
// soltar, y cuánto recorrido decide si el gesto es horizontal o vertical.
const SWIPE_MIN_PX = 56;
const AXIS_SLOP_PX = 12;

const TRIGGER_CLASS =
  "z-10 flex-1 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors duration-200 after:hidden data-active:!bg-transparent data-active:text-primary-foreground";

export function WorldCupView({ initialMatches }: { initialMatches: Match[] }) {
  // Fixture vivo: pre-render del build + refresh client-side (clave en GitHub Pages).
  const matches = useWorldCup(initialMatches);

  // Pestaña controlada: además de los triggers, se navega con swipe.
  const [tab, setTab] = useState("CAL");

  // Swipe con arrastre: el panel sigue al dedo (transform directo al DOM,
  // sin re-renders). Al soltar: pasa a la pestaña vecina si recorrió el
  // umbral, o regresa animado a su lugar si no. El eje se decide una sola
  // vez por gesto para no pelear con el scroll vertical del calendario.
  const panelsRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; axis: "h" | "v" | null } | null>(
    null,
  );

  const onTouchStart = (e: React.TouchEvent) => {
    drag.current =
      e.touches.length === 1
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null }
        : null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const d = drag.current;
    const el = panelsRef.current;
    if (!d || !el) return;
    const dx = e.touches[0].clientX - d.x;
    const dy = e.touches[0].clientY - d.y;
    if (
      d.axis === null &&
      (Math.abs(dx) > AXIS_SLOP_PX || Math.abs(dy) > AXIS_SLOP_PX)
    ) {
      d.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (d.axis !== "h") return;
    const i = TAB_ORDER.indexOf(tab);
    const hasNeighbor = dx < 0 ? i < TAB_ORDER.length - 1 : i > 0;
    el.style.transition = "none";
    // Con resistencia cuando no hay pestaña hacia ese lado.
    el.style.transform = `translateX(${hasNeighbor ? dx : dx / 3}px)`;
  };

  const resetDrag = (el: HTMLDivElement) => {
    el.style.transition = "";
    el.style.transform = "";
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const d = drag.current;
    drag.current = null;
    const el = panelsRef.current;
    if (!d || !el || d.axis !== "h") return;
    const dx = e.changedTouches[0].clientX - d.x;
    const next = TAB_ORDER[TAB_ORDER.indexOf(tab) + (dx < 0 ? 1 : -1)];
    if (Math.abs(dx) >= SWIPE_MIN_PX && next) {
      // El panel nuevo entra con su animación direccional (CSS).
      resetDrag(el);
      setTab(next);
    } else if (Math.abs(dx) < 2) {
      resetDrag(el);
    } else {
      // No alcanzó: regresa suave a su lugar.
      el.style.transition = "transform 0.3s cubic-bezier(0.25, 1, 0.4, 1)";
      el.style.transform = "translateX(0px)";
      el.addEventListener("transitionend", () => resetDrag(el), {
        once: true,
      });
    }
  };

  const onTouchCancel = () => {
    drag.current = null;
    if (panelsRef.current) resetDrag(panelsRef.current);
  };

  // Reloj para badges "En juego": null hasta montar para no romper la hidratación.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // La app es una sola vista con scroll interno propio: no tiene sentido que
  // el navegador restaure el scroll del documento de la sesión anterior
  // (en PWA standalone relanzaba con el header fuera de pantalla).
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  const groups = useMemo(() => buildGroups(matches), [matches]);
  const gsMatches = useMemo(() => matches.filter((m) => m.group), [matches]);
  const knockout = useMemo(
    () => ({
      R32: knockoutMatches(matches, "R32"),
      R16: knockoutMatches(matches, "R16"),
      QF: knockoutMatches(matches, "QF"),
      // La pestaña final junta semifinales y final.
      FIN: [
        ...knockoutMatches(matches, "SF"),
        ...knockoutMatches(matches, "F"),
      ],
    }),
    [matches],
  );

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        if (typeof v === "string") setTab(v);
      }}
      className="w-full"
    >
      <TabsList
        variant="line"
        className="sticky top-2 z-20 mx-auto flex w-full max-w-md justify-between rounded-full border border-white/10 bg-card/70 px-1.5 py-1 backdrop-blur-md"
      >
        {/* Pill que se desliza hasta la pestaña activa */}
        <TabsIndicator className="z-0 rounded-full bg-primary shadow-[0_2px_12px_-2px] shadow-primary/50" />
        <TabsTrigger
          value="CAL"
          aria-label="Calendario"
          className={TRIGGER_CLASS}
        >
          <CalendarDays className="size-3.5" />
        </TabsTrigger>
        {VISIBLE_STAGES.map((s) => (
          <TabsTrigger key={s.key} value={s.key} className={TRIGGER_CLASS}>
            {s.label}
          </TabsTrigger>
        ))}
        <TabsTrigger value={FINALS_TAB.key} className={TRIGGER_CLASS}>
          {FINALS_TAB.label}
        </TabsTrigger>
      </TabsList>

      {/* Los panels viven en este wrapper, que sigue al dedo durante el
          swipe. touch-pan-y deja el scroll vertical en manos del navegador. */}
      <div
        ref={panelsRef}
        className="touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        {/* Calendario: la vista principal */}
        <TabsContent value="CAL" className="tab-panel mt-6">
          <ScheduleRail
            matches={gsMatches}
            now={now}
            className="mx-auto max-w-2xl"
          />
        </TabsContent>

        {/* Fase de grupos: solo las tablas */}
        <TabsContent value="GS" className="tab-panel mt-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map((g, i) => (
              <div
                key={g.name}
                className="stagger-item"
                style={{ "--i": i } as React.CSSProperties}
              >
                <GroupTable group={g} />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Eliminatorias */}
        {KNOCKOUT_STAGES.map((stage) => (
          <TabsContent key={stage} value={stage} className="tab-panel mt-6">
            <KnockoutGrid matches={knockout[stage]} now={now} />
          </TabsContent>
        ))}

        {/* Semifinales y final: una sola pestaña al cierre del torneo */}
        <TabsContent value={FINALS_TAB.key} className="tab-panel mt-6">
          <KnockoutGrid
            matches={knockout.FIN}
            now={now}
            emptyMessage="Esperando resultados…"
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}

function KnockoutGrid({
  matches,
  now,
  emptyMessage = "Sin partidos en esta fase todavía.",
}: {
  matches: Match[];
  now: number | null;
  emptyMessage?: string;
}) {
  if (!matches?.length) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((m, i) => (
        <div
          key={m.num ?? `${m.team1}-${m.team2}-${i}`}
          className="stagger-item"
          style={{ "--i": i } as React.CSSProperties}
        >
          <MatchCard match={m} now={now} />
        </div>
      ))}
    </div>
  );
}
