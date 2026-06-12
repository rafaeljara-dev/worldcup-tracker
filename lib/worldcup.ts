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

/** Agrupa la fase de grupos y calcula los standings (con marcador de 90'). */
export function buildGroups(matches: Match[]): Group[] {
  const order: string[] = [];
  const map = new Map<string, Map<string, StandingRow>>();

  const ensureRow = (group: string, team: string) => {
    let g = map.get(group);
    if (!g) {
      g = new Map();
      map.set(group, g);
      order.push(group);
    }
    let row = g.get(team);
    if (!row) {
      row = {
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
      g.set(team, row);
    }
    return row;
  };

  for (const m of matches) {
    if (!m.group) continue;
    const r1 = ensureRow(m.group, m.team1);
    const r2 = ensureRow(m.group, m.team2);
    const score = m.score?.ft;
    if (!score) continue;

    const [s1, s2] = score;
    r1.played++;
    r2.played++;
    r1.gf += s1;
    r1.ga += s2;
    r2.gf += s2;
    r2.ga += s1;
    if (s1 > s2) {
      r1.won++;
      r2.lost++;
      r1.points += 3;
    } else if (s1 < s2) {
      r2.won++;
      r1.lost++;
      r2.points += 3;
    } else {
      r1.drawn++;
      r2.drawn++;
      r1.points++;
      r2.points++;
    }
  }

  return order.sort().map((name) => {
    const rows = [...map.get(name)!.values()];
    // Conserva orden de inserción como desempate final (= siembra del sorteo).
    const seed = new Map(rows.map((r, i) => [r.team, i]));
    rows.forEach((r) => (r.gd = r.gf - r.ga));
    rows.sort(
      (a, b) =>
        b.points - a.points ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        seed.get(a.team)! - seed.get(b.team)!,
    );
    return { name, rows };
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
