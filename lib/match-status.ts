import type { Match } from "@/lib/worldcup";

export type MatchStatus = "upcoming" | "live" | "played";

/**
 * Timestamp UTC del kickoff. La hora viene como "13:00 UTC-6"
 * (hora local de la sede + offset), la fecha como "2026-06-11".
 */
export function kickoffUtc(m: Match): number | null {
  const dateParts = m.date.split("-").map(Number);
  const timeMatch = m.time.match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})/);
  if (dateParts.length !== 3 || !timeMatch) return null;
  const [y, mo, d] = dateParts;
  const hh = Number(timeMatch[1]);
  const mm = Number(timeMatch[2]);
  const offset = Number(timeMatch[3]);
  // 13:00 en UTC-6 → 19:00 UTC
  return Date.UTC(y, mo - 1, d, hh - offset, mm);
}

// Ventana generosa de partido: 90' + descanso + posible prórroga y penales.
const MATCH_WINDOW_MS = 2.75 * 60 * 60 * 1000;

/**
 * Estado aproximado: "played" si openfootball ya publicó el marcador final;
 * "live" si ahora cae dentro de la ventana del partido (el feed no es live,
 * así que mientras tanto no hay marcador parcial); "upcoming" si no ha empezado.
 */
export function matchStatus(m: Match, now: number): MatchStatus {
  if (m.score?.ft) return "played";
  const kickoff = kickoffUtc(m);
  if (kickoff !== null && now >= kickoff && now <= kickoff + MATCH_WINDOW_MS) {
    return "live";
  }
  return "upcoming";
}
