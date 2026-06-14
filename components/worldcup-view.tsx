"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsIndicator,
} from "@/components/ui/tabs";
import { GroupTable } from "@/components/group-table";
import { MatchCard } from "@/components/match-card";
import { ScheduleRail } from "@/components/schedule-rail";
import { useNow } from "@/lib/use-now";
import { useWorldCup } from "@/lib/use-worldcup";
import {
  STAGES,
  buildGroups,
  knockoutMatches,
  type Match,
} from "@/lib/worldcup";
import { isRealTeam } from "@/lib/teams";
import { cn } from "@/lib/utils";

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

  // Swipe tipo pager: todas las secciones viven montadas, lado a lado, en
  // una pista horizontal, así la vecina ya se ve entrando mientras
  // arrastras. La pista sigue al dedo (transform directo al DOM, sin
  // re-renders) y al soltar anima hacia la vecina si recorrió el umbral o
  // regresa a su lugar si no. El eje del gesto se decide una sola vez por
  // toque para no pelear con el scroll vertical del calendario.
  const trackRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; axis: "h" | "v" | null } | null>(
    null,
  );

  const trackX = (i: number) => `translateX(${i * -100}%)`;

  const onTouchStart = (e: React.TouchEvent) => {
    drag.current =
      e.touches.length === 1
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null }
        : null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const d = drag.current;
    const el = trackRef.current;
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
    el.style.transform = `translateX(calc(${i * -100}% + ${
      hasNeighbor ? dx : dx / 3
    }px))`;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const d = drag.current;
    drag.current = null;
    const el = trackRef.current;
    if (!d || !el || d.axis !== "h") return;
    // De vuelta a la transición CSS de la pista para animar el destino.
    el.style.transition = "";
    const dx = e.changedTouches[0].clientX - d.x;
    const i = TAB_ORDER.indexOf(tab);
    const next = TAB_ORDER[i + (dx < 0 ? 1 : -1)];
    if (Math.abs(dx) >= SWIPE_MIN_PX && next) {
      // El re-render mueve la pista hasta la pestaña vecina.
      setTab(next);
    } else {
      // No alcanzó: regresa a su lugar.
      el.style.transform = trackX(i);
    }
  };

  const onTouchCancel = () => {
    drag.current = null;
    const el = trackRef.current;
    if (el) {
      el.style.transition = "";
      el.style.transform = trackX(TAB_ORDER.indexOf(tab));
    }
  };

  // Reloj para badges "En juego": null hasta montar para no romper la hidratación.
  const now = useNow();

  // La app es una sola vista con scroll interno propio: no tiene sentido que
  // el navegador restaure el scroll del documento de la sesión anterior
  // (en PWA standalone relanzaba con el header fuera de pantalla).
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  // Cada pestaña es su propia vista, así que al cambiar volvemos arriba. Sin
  // esto, al pasar de una pestaña larga (que scrollea el documento) a una
  // corta como el calendario, el scrollY del documento se queda atorado: la
  // página ya no es tan alta como para regresarlo y la vista corta aparece
  // empujada fuera de pantalla sin forma de reacomodarla.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const groups = useMemo(() => buildGroups(matches), [matches]);
  const gsMatches = useMemo(() => matches.filter((m) => m.group), [matches]);
  const knockout = useMemo(() => {
    // La pestaña final junta semifinales y final, pero hasta que se conozca
    // algún clasificado muestra solo el placeholder "Esperando resultados"
    // en vez de tarjetas crípticas tipo "W97 vs W98".
    const fin = [
      ...knockoutMatches(matches, "SF"),
      ...knockoutMatches(matches, "F"),
    ];
    const finKnown = fin.some(
      (m) => isRealTeam(m.team1) || isRealTeam(m.team2),
    );
    return {
      R32: knockoutMatches(matches, "R32"),
      R16: knockoutMatches(matches, "R16"),
      QF: knockoutMatches(matches, "QF"),
      FIN: finKnown ? fin : [],
    };
  }, [matches]);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        if (typeof v === "string") setTab(v);
      }}
      className="w-full"
    >
      {/* Barra de tabs flotante. El desvanecido detrás/encima difumina hacia
          el fondo el contenido que se desliza por detrás al hacer scroll. */}
      <div className="sticky top-0 z-30 pt-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+1.75rem)] bg-gradient-to-b from-background via-background/75 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_bottom,black,black_50%,transparent)]"
        />
        <TabsList
          variant="line"
          className="mx-auto flex w-full max-w-md justify-between rounded-full border border-white/10 bg-card/70 px-1.5 py-1 backdrop-blur-md"
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
      </div>

      {/* Pager: recorta la pista y deja el scroll vertical al navegador. */}
      <div
        className="mt-6 touch-pan-y overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        <div
          ref={trackRef}
          className="flex transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.4,1)] motion-reduce:transition-none"
          style={{ transform: trackX(TAB_ORDER.indexOf(tab)) }}
        >
          {/* Calendario: la vista principal */}
          <Slide active={tab === "CAL"}>
            <ScheduleRail
              matches={gsMatches}
              now={now}
              className="mx-auto max-w-2xl"
            />
          </Slide>

          {/* Fase de grupos: solo las tablas */}
          <Slide active={tab === "GS"}>
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
          </Slide>

          {/* Eliminatorias */}
          {KNOCKOUT_STAGES.map((stage) => (
            <Slide key={stage} active={tab === stage}>
              <KnockoutGrid matches={knockout[stage]} now={now} />
            </Slide>
          ))}

          {/* Semifinales y final: una sola pestaña al cierre del torneo */}
          <Slide active={tab === FINALS_TAB.key}>
            <KnockoutGrid
              matches={knockout.FIN}
              now={now}
              emptyMessage="Esperando resultados…"
            />
          </Slide>
        </div>
      </div>
    </Tabs>
  );
}

/**
 * Una sección de la pista del pager. Las inactivas quedan inertes (sin foco
 * ni interacción) y recortadas a un alto de viewport: solo se asoman durante
 * el arrastre y no estiran la página.
 */
function Slide({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      inert={!active || undefined}
      className={cn(
        "w-full min-w-0 shrink-0",
        !active && "max-h-dvh overflow-hidden",
      )}
    >
      {children}
    </div>
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
