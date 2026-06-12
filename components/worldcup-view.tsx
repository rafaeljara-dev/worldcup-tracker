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
import {
  STAGES,
  buildGroups,
  knockoutMatches,
  type Match,
} from "@/lib/worldcup";

const KNOCKOUT_STAGES = ["R32", "R16", "QF", "SF", "F"] as const;

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

  const groups = useMemo(() => buildGroups(matches), [matches]);
  const gsMatches = useMemo(() => matches.filter((m) => m.group), [matches]);
  const knockout = useMemo(
    () => ({
      R32: knockoutMatches(matches, "R32"),
      R16: knockoutMatches(matches, "R16"),
      QF: knockoutMatches(matches, "QF"),
      SF: knockoutMatches(matches, "SF"),
      F: knockoutMatches(matches, "F"),
    }),
    [matches],
  );

  return (
    <Tabs defaultValue="CAL" className="w-full">
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
        {STAGES.map((s) => (
          <TabsTrigger key={s.key} value={s.key} className={TRIGGER_CLASS}>
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>

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
    </Tabs>
  );
}

function KnockoutGrid({
  matches,
  now,
}: {
  matches: Match[];
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
