// Enlace "Añadir a Google Calendar" para un partido.
// Genera la URL de plantilla de evento (action=TEMPLATE) con título + banderas,
// horario real del kickoff (en UTC) y la sede como ubicación.

import { TEAM_FLAGS, displayName } from "@/lib/teams";
import { kickoffUtc } from "@/lib/match-status";
import type { Match } from "@/lib/worldcup";

// Banderas con subdivisión (Inglaterra/Escocia) no salen de un código ISO de 2
// letras: usan secuencias de etiqueta sobre la bandera negra.
const SPECIAL_FLAG: Record<string, string> = {
  "gb-eng": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  "gb-sct": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
};

/** Emoji de bandera del equipo, o "" si es un placeholder (sin bandera). */
export function flagEmoji(team: string): string {
  const code = TEAM_FLAGS[team];
  if (!code) return "";
  if (SPECIAL_FLAG[code]) return SPECIAL_FLAG[code];
  if (code.length !== 2) return "";
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// "Round of 32" → "Octavos…" para el detalle del evento.
const STAGE_TITLES: Record<string, string> = {
  "Round of 32": "Ronda de 32",
  "Round of 16": "Octavos de final",
  "Quarter-final": "Cuartos de final",
  "Quarter-finals": "Cuartos de final",
  "Semi-final": "Semifinal",
  "Semi-finals": "Semifinal",
  Final: "Final",
  "Match for third place": "Tercer puesto",
  "Third place play-off": "Tercer puesto",
};

/** YYYYMMDDTHHMMSSZ (formato UTC que espera Google Calendar). */
function fmtUtc(ts: number): string {
  return new Date(ts).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const MATCH_HOURS = 2; // 90' + descanso; suficiente para un recordatorio

/**
 * URL de Google Calendar para agendar el partido. `name1`/`name2` pueden ser
 * el equipo real o un placeholder ("Ganador #74"); las banderas solo aparecen
 * cuando el equipo está definido.
 */
export function googleCalendarUrl(
  match: Match,
  name1: string,
  name2: string,
): string {
  const f1 = flagEmoji(name1);
  const f2 = flagEmoji(name2);
  const title = [f1, displayName(name1), "vs", displayName(name2), f2]
    .filter(Boolean)
    .join(" ");

  const stage = STAGE_TITLES[match.round] ?? match.round;
  const details = [
    `Mundial 2026 · ${stage}`,
    match.num ? `Partido #${match.num}` : "",
    match.ground,
  ]
    .filter(Boolean)
    .join("\n");

  const enc = encodeURIComponent;
  let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(
    title,
  )}`;
  const kickoff = kickoffUtc(match);
  if (kickoff !== null) {
    url += `&dates=${fmtUtc(kickoff)}/${fmtUtc(kickoff + MATCH_HOURS * 3600_000)}`;
  }
  if (match.ground) url += `&location=${enc(match.ground)}`;
  url += `&details=${enc(details)}`;
  return url;
}
