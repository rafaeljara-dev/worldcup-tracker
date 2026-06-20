// Motor de escenarios de clasificación de la fase de grupos.
//
// Apego a las reglas FIFA 2026:
//  - Clasifican a la ronda de 32: 1.º y 2.º de cada grupo (24) + los 8 mejores
//    terceros (de 12 grupos).
//  - El "outlook" de cada equipo (clasificado / eliminado / en disputa) se calcula
//    por certeza matemática: se enumeran TODOS los resultados posibles de los
//    partidos que le quedan al grupo y se mira el rango de posiciones alcanzable.
//    Como el top-2 no depende de la diferencia de goles cuando se razona sobre
//    PUNTOS (basta contar cuántos rivales pueden igualar o superar), el resultado
//    es exacto y conservador (nunca afirma de más).
//  - El ranking de terceros usa puntos → diferencia → goles a favor (criterio FIFA),
//    con la letra de grupo como desempate estable en vez del sorteo.

import {
  buildGroups,
  groupTeams,
  matchesByGroup,
  type Group,
  type Match,
  type StandingRow,
} from "@/lib/worldcup";

export type Outlook = "secured" | "eliminated" | "contention";

export interface TeamScenario {
  team: string;
  /** Posición proyectada con los resultados actuales (1..4). */
  rank: number;
  outlook: Outlook;
  /** Etiqueta breve de situación o de qué necesita en su próximo partido. */
  note: string;
}

export interface GroupScenario {
  name: string;
  rows: StandingRow[];
  done: boolean;
  byTeam: Map<string, TeamScenario>;
}

interface RemMatch {
  a: string;
  b: string;
}

const score = (m: Match) => m.score?.ft;

/** Puntos actuales por equipo (solo partidos con marcador). */
function basePoints(teams: string[], gms: Match[]): Map<string, number> {
  const pts = new Map(teams.map((t) => [t, 0]));
  for (const m of gms) {
    const ft = score(m);
    if (!ft) continue;
    const [s1, s2] = ft;
    if (s1 > s2) pts.set(m.team1, (pts.get(m.team1) ?? 0) + 3);
    else if (s1 < s2) pts.set(m.team2, (pts.get(m.team2) ?? 0) + 3);
    else {
      pts.set(m.team1, (pts.get(m.team1) ?? 0) + 1);
      pts.set(m.team2, (pts.get(m.team2) ?? 0) + 1);
    }
  }
  return pts;
}

/** Aplica una combinación de resultados a los puntos base. outcome: 0=gana a, 1=empate, 2=gana b. */
function pointsFor(
  base: Map<string, number>,
  rem: RemMatch[],
  outcomes: number[],
): Map<string, number> {
  const pts = new Map(base);
  for (let i = 0; i < rem.length; i++) {
    const { a, b } = rem[i];
    const o = outcomes[i];
    if (o === 0) pts.set(a, (pts.get(a) ?? 0) + 3);
    else if (o === 2) pts.set(b, (pts.get(b) ?? 0) + 3);
    else {
      pts.set(a, (pts.get(a) ?? 0) + 1);
      pts.set(b, (pts.get(b) ?? 0) + 1);
    }
  }
  return pts;
}

/**
 * Rango de posiciones que el equipo puede ocupar sobre TODOS los escenarios de
 * resultados restantes. best = los empates de puntos caen a su favor; worst = en
 * su contra. Razona solo con puntos, así que el límite es seguro:
 *  - worst ≤ 2  ⟹  jamás puede haber 2 rivales con ≥ puntos  ⟹  top-2 asegurado.
 *  - best ≥ 3   ⟹  siempre hay ≥ 2 rivales por encima         ⟹  fuera de top-2.
 */
function rankBounds(
  team: string,
  teams: string[],
  base: Map<string, number>,
  rem: RemMatch[],
): { best: number; worst: number } {
  const others = teams.filter((t) => t !== team);
  const total = 3 ** rem.length;
  let best = 99;
  let worst = 1;
  const outcomes = new Array(rem.length).fill(0);
  for (let n = 0; n < total; n++) {
    let x = n;
    for (let i = 0; i < rem.length; i++) {
      outcomes[i] = x % 3;
      x = (x / 3) | 0;
    }
    const pts = pointsFor(base, rem, outcomes);
    const mine = pts.get(team) ?? 0;
    let over = 0;
    let equal = 0;
    for (const o of others) {
      const p = pts.get(o) ?? 0;
      if (p > mine) over++;
      else if (p === mine) equal++;
    }
    best = Math.min(best, 1 + over);
    worst = Math.max(worst, 1 + over + equal);
  }
  return { best, worst };
}

/** Próximo partido pendiente del equipo (el más cercano por fecha/hora). */
function nextMatch(team: string, gms: Match[]): Match | null {
  const pend = gms
    .filter((m) => !score(m) && (m.team1 === team || m.team2 === team))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return pend[0] ?? null;
}

/** "secured" si top-2 garantizado, "eliminated" si 4.º garantizado, si no "contention". */
function outlookOf(best: number, worst: number): Outlook {
  if (worst <= 2) return "secured";
  if (best >= 4) return "eliminated";
  return "contention";
}

/** Etiqueta de qué necesita el equipo en su próximo partido (solo si está en disputa). */
function contentionNote(
  team: string,
  teams: string[],
  base: Map<string, number>,
  rem: RemMatch[],
  next: Match | null,
  canThird: boolean,
): string {
  if (!next) return canThird ? "Pelea por 3.º" : "En disputa";

  const rest = rem.filter(
    (r) => !((r.a === next.team1 && r.b === next.team2)),
  );
  const fix = (outcome: number) => {
    // Suma el resultado fijado del próximo partido y evalúa el resto.
    const adj = new Map(base);
    const { team1, team2 } = next;
    if (outcome === 0) adj.set(team1, (adj.get(team1) ?? 0) + 3);
    else if (outcome === 2) adj.set(team2, (adj.get(team2) ?? 0) + 3);
    else {
      adj.set(team1, (adj.get(team1) ?? 0) + 1);
      adj.set(team2, (adj.get(team2) ?? 0) + 1);
    }
    return rankBounds(team, teams, adj, rest);
  };

  const teamIsHome = next.team1 === team;
  const win = fix(teamIsHome ? 0 : 2);
  const draw = fix(1);
  const lose = fix(teamIsHome ? 2 : 0);

  if (draw.worst <= 2) return "Le basta empatar";
  if (win.worst <= 2) return "Gana y pasa";
  // "Debe ganar" va antes que "Gana y espera": si perder elimina, esa es la
  // advertencia relevante aunque ganar también deje viva la opción de top-2.
  if (lose.best >= 4) return "Debe ganar";
  if (win.best <= 2) return "Gana y espera";
  return canThird ? "Pelea por 3.º" : "En disputa";
}

/** Analiza los 12 grupos: tabla proyectada + escenario por equipo. */
export function analyzeGroups(
  matches: Match[],
  groups: Group[] = buildGroups(matches),
): GroupScenario[] {
  const byGroup = matchesByGroup(matches);

  return groups.map((g) => {
    const gms = byGroup.get(g.name) ?? [];
    const teams = groupTeams(gms);
    const base = basePoints(teams, gms);
    const rem: RemMatch[] = gms
      .filter((m) => !score(m))
      .map((m) => ({ a: m.team1, b: m.team2 }));
    const done = rem.length === 0;

    const byTeam = new Map<string, TeamScenario>();
    g.rows.forEach((row, i) => {
      // Con el grupo cerrado la posición es definitiva (la diferencia de goles ya
      // desempató); en vivo se usa la cota por puntos, conservadora y segura.
      const { best, worst } = done
        ? { best: i + 1, worst: i + 1 }
        : rankBounds(row.team, teams, base, rem);
      const outlook = outlookOf(best, worst);
      let note: string;
      if (outlook === "secured") note = "Clasificado";
      else if (outlook === "eliminated") note = "Eliminado";
      else
        note = contentionNote(
          row.team,
          teams,
          base,
          rem,
          nextMatch(row.team, gms),
          best <= 3,
        );
      byTeam.set(row.team, { team: row.team, rank: i + 1, outlook, note });
    });

    return { name: g.name, rows: g.rows, done, byTeam };
  });
}

export interface ThirdPlace {
  group: string; // "Group A"
  letter: string; // "A"
  row: StandingRow;
  rank: number; // 1..12 entre los terceros
  qualifies: boolean; // entre los 8 mejores (proyección)
}

/** Letra del grupo: "Group A" → "A". */
export function groupLetter(name: string): string {
  return name.replace(/^Group\s+/i, "").trim();
}

/**
 * Rankea los 12 terceros por el criterio FIFA (puntos → GD → GF), con la letra
 * de grupo como desempate estable. Marca los 8 mejores como clasificados.
 */
export function rankThirdPlaces(groups: Group[]): ThirdPlace[] {
  const thirds = groups
    .filter((g) => g.rows.length >= 3)
    .map((g) => ({
      group: g.name,
      letter: groupLetter(g.name),
      row: g.rows[2],
    }));

  thirds.sort(
    (a, b) =>
      b.row.points - a.row.points ||
      b.row.gd - a.row.gd ||
      b.row.gf - a.row.gf ||
      a.letter.localeCompare(b.letter),
  );

  return thirds.map((t, i) => ({
    ...t,
    rank: i + 1,
    // Solo proyectamos como clasificado a un tercero que ya jugó: al inicio
    // (todos en 0-0-0) el orden sería un desempate alfabético sin sentido.
    qualifies: i < 8 && t.row.played > 0,
  }));
}
