"use client";

import { useEffect, useMemo, useState } from "react";
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
import { STAGES, type Match } from "@/lib/worldcup";
import { analyzeGroups } from "@/lib/qualification";
import { resolveBracket, type KnockoutStage, type ResolvedMatch } from "@/lib/bracket";

const KNOCKOUT_STAGES: KnockoutStage[] = ["R32", "R16", "QF", "SF", "F"];

const TRIGGER_CLASS =
  "z-10 flex-1 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors duration-200 after:hidden data-active:!bg-transparent data-active:text-primary-foreground";

export function WorldCupView({ initialMatches }: { initialMatches: Match[] }) {
  // Fixture vivo: pre-render del build + refresh client-side (clave en GitHub Pages).
  const matches = useWorldCup(initialMatches);

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

  const scenarios = useMemo(() => analyzeGroups(matches), [matches]);
  const bracket = useMemo(() => resolveBracket(matches), [matches]);
  const gsMatches = useMemo(() => matches.filter((m) => m.group), [matches]);

  // Letras de grupo cuyo 3.º proyecta entrar en los 8 mejores terceros.
  const thirdsInTop8 = useMemo(
    () =>
      new Set(
        bracket.thirds.filter((t) => t.qualifies).map((t) => `Group ${t.letter}`),
      ),
    [bracket],
  );

  return (
    <Tabs defaultValue="CAL" className="w-full">
      <TabsList
        variant="line"
        className="sticky top-2 z-20 mx-auto flex w-full max-w-md justify-between rounded-full border border-white/10 bg-card/70 px-1.5 py-1 backdrop-blur-md"
      >
        {/* Pill que se desliza hasta la pestaña activa */}
        <TabsIndicator className="z-0 rounded-full bg-primary shadow-[0_2px_12px_-2px] shadow-primary/50" />
        <TabsTrigger value="CAL" aria-label="Calendario" className={TRIGGER_CLASS}>
          <CalendarDays className="size-3.5" />
        </TabsTrigger>
        {STAGES.map((s) => (
          <TabsTrigger key={s.key} value={s.key} className={TRIGGER_CLASS}>
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Calendario: la vista principal */}
      <TabsContent value="CAL" className="tab-panel mt-6">
        <ScheduleRail matches={gsMatches} now={now} className="mx-auto max-w-2xl" />
      </TabsContent>

      {/* Fase de grupos: tablas con escenarios de clasificación */}
      <TabsContent value="GS" className="tab-panel mt-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {scenarios.map((g, i) => (
            <div
              key={g.name}
              className="stagger-item"
              style={{ "--i": i } as React.CSSProperties}
            >
              <GroupTable scenario={g} thirdInTop8={thirdsInTop8.has(g.name)} />
            </div>
          ))}
        </div>
      </TabsContent>

      {/* Eliminatorias por fase (placeholders resueltos por el motor) */}
      {KNOCKOUT_STAGES.map((stage) => (
        <TabsContent key={stage} value={stage} className="tab-panel mt-6">
          <KnockoutGrid matches={bracket.byStage[stage]} now={now} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function KnockoutGrid({
  matches,
  now,
}: {
  matches: ResolvedMatch[];
  now: number | null;
}) {
  if (!matches?.length) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Sin partidos en esta fase todavía.
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((m, i) => (
        <div
          key={m.num ?? i}
          className="stagger-item"
          style={{ "--i": i } as React.CSSProperties}
        >
          <MatchCard rm={m} now={now} />
        </div>
      ))}
    </div>
  );
}
