// Capa de datos: consume el fixture público de openfootball (sin API key).
// https://github.com/openfootball/worldcup.json
// Se actualiza varias veces al día (manual, no live al segundo).

export const SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

/**
 * Marcador tal cual lo publica openfootball:
 * - ht: medio tiempo · ft: 90 minutos · et: acumulado tras 120' · p: tanda de penales
 * (formato verificado contra los JSON de 2022 y 2026)
 */
export interface Score {
  ht?: [number, number];
  ft?: [number, number];
  et?: [number, number];
  p?: [number, number];
}

export interface Goal {
  name: string;
  minute: string;
}

/** Partido tal cual viene del JSON. */
export interface Match {
  round: string;
  num?: number;
  date: string; // "2026-06-11"
  time: string; // "13:00 UTC-6"
  team1: string;
  team2: string;
  group?: string; // "Group A" (solo fase de grupos)
  ground: string;
  score?: Score;
  goals1?: Goal[];
  goals2?: Goal[];
}

export interface WorldCupData {
  name: string;
  matches: Match[];
}

/** Fila de la tabla de un grupo. */
export interface StandingRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // goles a favor
  ga: number; // goles en contra
  gd: number; // diferencia
  points: number;
}

export interface Group {
  name: string; // "Group A"
  rows: StandingRow[];
}

// Etapas del torneo en el orden de las pestañas (estilo Apple Sports).
export const STAGES = [
  { key: "GS", label: "GS", title: "Group Stage" },
  { key: "R32", label: "R32", title: "Round of 32" },
  { key: "R16", label: "R16", title: "Round of 16" },
  { key: "QF", label: "QF", title: "Quarterfinals" },
  { key: "SF", label: "SF", title: "Semifinals" },
  { key: "F", label: "F", title: "Final" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

// Mapea cada etapa a los nombres de ronda de openfootball que le corresponden.
// (2026 usa singular "Quarter-final"; 2022 usaba plural — aceptamos ambos.)
const STAGE_ROUNDS: Record<Exclude<StageKey, "GS">, string[]> = {
  R32: ["Round of 32"],
  R16: ["Round of 16"],
  QF: ["Quarter-final", "Quarter-finals"],
  SF: ["Semi-final", "Semi-finals"],
  F: ["Final", "Match for third place", "Third place play-off"],
};

/**
 * Marcador "principal" a mostrar: acumulado de 120' si hubo prórroga, si no el de 90'.
 * null si el partido no se ha jugado.
 */
export function finalScore(m: Match): [number, number] | null {
  return m.score?.et ?? m.score?.ft ?? null;
}

/** Tanda de penales, si la hubo. */
export function penalties(m: Match): [number, number] | null {
  return m.score?.p ?? null;
}

/** Índice del ganador (0 = team1, 1 = team2) o null si empate/no jugado. */
export function winnerIndex(m: Match): 0 | 1 | null {
  const pens = penalties(m);
  if (pens) return pens[0] > pens[1] ? 0 : 1;
  const score = finalScore(m);
  if (!score || score[0] === score[1]) return null;
  return score[0] > score[1] ? 0 : 1;
}

/** Descarga el fixture (en build para el HTML inicial; el cliente refresca después). */
export async function getWorldCup(): Promise<WorldCupData> {
  const res = await fetch(SOURCE_URL, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`No se pudo cargar el fixture (${res.status})`);
  }
  return res.json();
}

/** Resultado mínimo (real o hipotético) que alimenta el cálculo de tabla. */
export interface MiniResult {
  team1: string;
  team2: string;
  s1: number;
  s2: number;
}

function emptyRow(team: string): StandingRow {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
  };
}

/** Equipos de un grupo en orden de aparición (= siembra del sorteo, desempate final). */
export function groupTeams(groupMatches: Match[]): string[] {
  const seen: string[] = [];
  for (const m of groupMatches) {
    if (!seen.includes(m.team1)) seen.push(m.team1);
    if (!seen.includes(m.team2)) seen.push(m.team2);
  }
  return seen;
}

/** Partidos de fase de grupos indexados por grupo ("Group A" → [...]). */
export function matchesByGroup(matches: Match[]): Map<string, Match[]> {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    if (!m.group) continue;
    const arr = map.get(m.group);
    if (arr) arr.push(m);
    else map.set(m.group, [m]);
  }
  return map;
}

/**
 * Tabla de un grupo a partir de una lista de resultados (reales o simulados),
 * con el orden de desempate oficial FIFA:
 *   1) puntos · 2) diferencia de goles · 3) goles a favor
 *   4) puntos entre los empatados · 5) GD entre ellos · 6) GF entre ellos
 *   7) siembra del sorteo (orden de `teams`).
 * `teams` fija qué equipos hay y su siembra; `results` solo los partidos con marcador.
 */
export function computeStandings(
  teams: string[],
  results: MiniResult[],
): StandingRow[] {
  const seed = new Map(teams.map((t, i) => [t, i]));
  const rows = new Map(teams.map((t) => [t, emptyRow(t)]));

  for (const r of results) {
    const a = rows.get(r.team1);
    const b = rows.get(r.team2);
    if (!a || !b) continue; // partido de un equipo ajeno al grupo
    a.played++;
    b.played++;
    a.gf += r.s1;
    a.ga += r.s2;
    b.gf += r.s2;
    b.ga += r.s1;
    if (r.s1 > r.s2) {
      a.won++;
      b.lost++;
      a.points += 3;
    } else if (r.s1 < r.s2) {
      b.won++;
      a.lost++;
      b.points += 3;
    } else {
      a.drawn++;
      b.drawn++;
      a.points++;
      b.points++;
    }
  }
  for (const row of rows.values()) row.gd = row.gf - row.ga;

  const list = [...rows.values()];
  // Criterios globales + siembra como desempate provisional.
  list.sort(
    (x, y) =>
      y.points - x.points ||
      y.gd - x.gd ||
      y.gf - x.gf ||
      seed.get(x.team)! - seed.get(y.team)!,
  );

  // Re-desempate por enfrentamiento directo entre los igualados en (pts, gd, gf).
  // Recursivo: la regla FIFA repite los criterios sobre el subconjunto que sigue
  // empatado. Solo recursa si el grupo de empatados es un subconjunto estricto
  // (si abarca a todos, el H2H no aporta nada nuevo y manda la siembra).
  for (let i = 0; i < list.length; ) {
    let j = i + 1;
    while (
      j < list.length &&
      list[j].points === list[i].points &&
      list[j].gd === list[i].gd &&
      list[j].gf === list[i].gf
    )
      j++;
    if (j - i > 1 && j - i < list.length) {
      const tied = list.slice(i, j).map((r) => r.team);
      const set = new Set(tied);
      const mini = computeStandings(
        tied,
        results.filter((r) => set.has(r.team1) && set.has(r.team2)),
      );
      const rank = new Map(mini.map((r, k) => [r.team, k]));
      const ordered = list
        .slice(i, j)
        .sort((x, y) => rank.get(x.team)! - rank.get(y.team)!);
      for (let k = 0; k < ordered.length; k++) list[i + k] = ordered[k];
    }
    i = j;
  }

  return list;
}

/** Agrupa la fase de grupos y calcula los standings (marcador de 90'). */
export function buildGroups(matches: Match[]): Group[] {
  const byGroup = matchesByGroup(matches);
  return [...byGroup.keys()].sort().map((name) => {
    const gms = byGroup.get(name)!;
    const results: MiniResult[] = [];
    for (const m of gms) {
      const ft = m.score?.ft;
      if (ft) results.push({ team1: m.team1, team2: m.team2, s1: ft[0], s2: ft[1] });
    }
    return { name, rows: computeStandings(groupTeams(gms), results) };
  });
}

/** Devuelve los partidos de una etapa eliminatoria, ordenados por número/fecha. */
export function knockoutMatches(
  matches: Match[],
  stage: Exclude<StageKey, "GS">,
): Match[] {
  const rounds = STAGE_ROUNDS[stage];
  return matches
    .filter((m) => rounds.includes(m.round))
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.date.localeCompare(b.date));
}

/** Partidos de fase de grupos agrupados por fecha (para la columna de calendario). */
export function groupStageByDate(
  matches: Match[],
): { date: string; matches: Match[] }[] {
  const byDate = new Map<string, Match[]>();
  for (const m of matches) {
    if (!m.group) continue;
    (byDate.get(m.date) ?? byDate.set(m.date, []).get(m.date)!).push(m);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, ms]) => ({
      date,
      matches: ms.sort((a, b) => a.time.localeCompare(b.time)),
    }));
}
