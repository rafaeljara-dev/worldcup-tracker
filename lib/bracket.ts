// Motor de resolución del cuadro eliminatorio.
//
// El feed de openfootball publica las llaves con marcadores de posición:
//   "1A" / "2B"          → 1.º del Grupo A · 2.º del Grupo B
//   "3A/B/C/D/F"         → uno de los mejores terceros (de esos grupos)
//   "W74" / "L101"       → ganador / perdedor del partido #74 / #101
// y los reemplaza por el equipo real cuando se define.
//
// Este motor resuelve esos tokens por su cuenta:
//   - 1X / 2X: desde la tabla del grupo (proyección si el grupo sigue vivo,
//     confirmado cuando termina o cuando el feed ya trae el equipo real).
//   - 3X: con el ranking de mejores terceros + una asignación que respeta los
//     grupos candidatos que declara cada llave (matching bipartito).
//   - W## / L##: propagando recursivamente el ganador/perdedor de cada partido;
//     si ese partido aún no se jugó, la llave queda "por definir".
//
// Cuando el feed ya trae el nombre real de un equipo, ese SIEMPRE manda
// (status "confirmed"): la confirmación es automática, sin tocar código.

import { isRealTeam } from "@/lib/teams";
import {
  buildGroups,
  knockoutMatches,
  matchesByGroup,
  winnerIndex,
  type Group,
  type Match,
} from "@/lib/worldcup";
import { rankThirdPlaces, type ThirdPlace } from "@/lib/qualification";

export type SlotStatus = "confirmed" | "projected" | "pending";

export interface ResolvedSlot {
  /** Token original del feed ("1A", "W74", "Mexico"…). */
  token: string;
  /** Nombre canónico del equipo resuelto, o null si todavía no se puede determinar. */
  team: string | null;
  status: SlotStatus;
  /** Texto a mostrar cuando `team` es null ("Ganador #74", "1.º Grupo A"…). */
  label: string;
  /** Letra del grupo de origen (para 1X / 2X / 3X), útil para la UI. */
  fromGroup?: string;
}

export interface ResolvedMatch {
  match: Match;
  num: number | undefined;
  team1: ResolvedSlot;
  team2: ResolvedSlot;
  /** Índice del ganador si el partido ya se jugó (0 = team1, 1 = team2). */
  winnerIdx: 0 | 1 | null;
}

export type KnockoutStage = "R32" | "R16" | "QF" | "SF" | "F";
const KO_STAGES: KnockoutStage[] = ["R32", "R16", "QF", "SF", "F"];

export interface Bracket {
  byStage: Record<KnockoutStage, ResolvedMatch[]>;
  byNum: Map<number, ResolvedMatch>;
  thirds: ThirdPlace[];
}

const GROUP_TOKEN = /^([12])([A-L])$/;
const WIN_TOKEN = /^W(\d+)$/;
const LOSE_TOKEN = /^L(\d+)$/;

function isThirdToken(token: string): boolean {
  return /^3[A-L](\/[A-L])+$/.test(token) || /^3[A-L]$/.test(token);
}

/** "3A/B/C/D/F" → ["A","B","C","D","F"]. */
function thirdCandidates(token: string): string[] {
  return token
    .slice(1)
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Asigna a cada llave de tercero (por nº de partido) la letra de uno de los
 * mejores terceros, respetando los grupos candidatos de cada llave. Matching
 * bipartito (algoritmo de Kuhn) → biyección completa cuando es posible; las
 * llaves que queden sin pareja se muestran como "Mejor 3.º" genérico.
 */
function assignThirds(
  slots: { num: number; cands: string[] }[],
  qualified: Set<string>,
  rankOf: Map<string, number>,
): Map<number, string> {
  // Candidatos de cada llave que de hecho clasificaron, mejor tercero primero.
  const order = slots
    .map((s) => ({
      num: s.num,
      cands: s.cands
        .filter((l) => qualified.has(l))
        .sort((a, b) => (rankOf.get(a) ?? 99) - (rankOf.get(b) ?? 99)),
    }))
    .sort((a, b) => a.num - b.num);

  const candsByNum = new Map(order.map((s) => [s.num, s.cands]));
  const slotOfLetter = new Map<string, number>(); // letra → nº de llave emparejada

  const augment = (num: number, seen: Set<string>): boolean => {
    for (const letter of candsByNum.get(num) ?? []) {
      if (seen.has(letter)) continue;
      seen.add(letter);
      const occupant = slotOfLetter.get(letter);
      if (occupant === undefined || augment(occupant, seen)) {
        slotOfLetter.set(letter, num);
        return true;
      }
    }
    return false;
  };

  for (const s of order) augment(s.num, new Set());

  const result = new Map<number, string>();
  for (const [letter, num] of slotOfLetter) result.set(num, letter);
  return result;
}

export function resolveBracket(
  matches: Match[],
  groups: Group[] = buildGroups(matches),
): Bracket {
  const groupByLetter = new Map<string, Group>(
    groups.map((g) => [g.name.replace(/^Group\s+/i, "").trim(), g]),
  );

  const gmByGroup = matchesByGroup(matches);
  const groupDone = new Map<string, boolean>();
  for (const [name, gms] of gmByGroup) {
    const letter = name.replace(/^Group\s+/i, "").trim();
    groupDone.set(letter, gms.every((m) => m.score?.ft));
  }

  const thirds = rankThirdPlaces(groups);
  const qualified = new Set(thirds.filter((t) => t.qualifies).map((t) => t.letter));
  const rankOf = new Map(thirds.map((t) => [t.letter, t.rank]));

  const koByNum = new Map<number, Match>();
  for (const stage of KO_STAGES) {
    for (const m of knockoutMatches(matches, stage)) {
      if (m.num != null) koByNum.set(m.num, m);
    }
  }

  // Llaves de R32 que reciben un tercero, con sus grupos candidatos.
  const thirdSlots: { num: number; cands: string[] }[] = [];
  for (const m of knockoutMatches(matches, "R32")) {
    if (m.num == null) continue;
    for (const tok of [m.team1, m.team2]) {
      if (isThirdToken(tok)) thirdSlots.push({ num: m.num, cands: thirdCandidates(tok) });
    }
  }
  const thirdAssign = assignThirds(thirdSlots, qualified, rankOf);

  const matchCache = new Map<number, ResolvedMatch>();
  const outcomeCache = new Map<string, ResolvedSlot>();

  const pending = (token: string, label: string): ResolvedSlot => ({
    token,
    team: null,
    status: "pending",
    label,
  });

  function resolveToken(token: string, matchNum: number | undefined): ResolvedSlot {
    if (isRealTeam(token)) {
      return { token, team: token, status: "confirmed", label: token };
    }

    const g = GROUP_TOKEN.exec(token);
    if (g) {
      const pos = Number(g[1]);
      const letter = g[2];
      const row = groupByLetter.get(letter)?.rows[pos - 1];
      const label = `${pos === 1 ? "1.º" : "2.º"} Grupo ${letter}`;
      if (!row) return { ...pending(token, label), fromGroup: letter };
      return {
        token,
        team: row.team,
        status: groupDone.get(letter) ? "confirmed" : "projected",
        label,
        fromGroup: letter,
      };
    }

    if (isThirdToken(token)) {
      const letter = matchNum != null ? thirdAssign.get(matchNum) : undefined;
      if (letter) {
        const row = groupByLetter.get(letter)?.rows[2];
        return {
          token,
          team: row?.team ?? null,
          status: "projected",
          label: `3.º Grupo ${letter}`,
          fromGroup: letter,
        };
      }
      return { token, team: null, status: "projected", label: "Mejor 3.º" };
    }

    const w = WIN_TOKEN.exec(token);
    if (w) return resolveOutcome(Number(w[1]), "W");
    const l = LOSE_TOKEN.exec(token);
    if (l) return resolveOutcome(Number(l[1]), "L");

    return pending(token, token);
  }

  function resolveOutcome(num: number, kind: "W" | "L"): ResolvedSlot {
    const key = `${kind}${num}`;
    const cached = outcomeCache.get(key);
    if (cached) return cached;

    const label = kind === "W" ? `Ganador #${num}` : `Perdedor #${num}`;
    let result = pending(key, label);

    const resolved = resolveMatchNum(num);
    if (resolved && resolved.winnerIdx !== null) {
      const winner = resolved.winnerIdx === 0 ? resolved.team1 : resolved.team2;
      const loser = resolved.winnerIdx === 0 ? resolved.team2 : resolved.team1;
      const chosen = kind === "W" ? winner : loser;
      if (chosen.team) {
        result = {
          token: key,
          team: chosen.team,
          status: "confirmed",
          label: chosen.team,
          fromGroup: chosen.fromGroup,
        };
      }
    }

    outcomeCache.set(key, result);
    return result;
  }

  function resolveMatchNum(num: number): ResolvedMatch | null {
    const cached = matchCache.get(num);
    if (cached) return cached;
    const m = koByNum.get(num);
    if (!m) return null;
    const resolved = resolveMatch(m);
    matchCache.set(num, resolved);
    return resolved;
  }

  function resolveMatch(m: Match): ResolvedMatch {
    return {
      match: m,
      num: m.num,
      team1: resolveToken(m.team1, m.num),
      team2: resolveToken(m.team2, m.num),
      winnerIdx: winnerIndex(m),
    };
  }

  const byStage = {} as Record<KnockoutStage, ResolvedMatch[]>;
  for (const stage of KO_STAGES) {
    byStage[stage] = knockoutMatches(matches, stage).map((m) =>
      m.num != null ? resolveMatchNum(m.num)! : resolveMatch(m),
    );
  }

  return { byStage, byNum: matchCache, thirds };
}
