import { withBase } from "@/lib/base-path";

// Mapeo de equipos del Mundial 2026 -> código de bandera (circle-flags en /public/flags)
// y nombre para mostrar (algunos difieren del nombre de openfootball, ej. "South Korea" -> "Korea Republic").

export const TEAM_FLAGS: Record<string, string> = {
  Algeria: "dz",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgium: "be",
  "Bosnia & Herzegovina": "ba",
  Brazil: "br",
  Canada: "ca",
  "Cape Verde": "cv",
  Colombia: "co",
  Croatia: "hr",
  "Curaçao": "cw",
  "Czech Republic": "cz",
  "DR Congo": "cd",
  Ecuador: "ec",
  Egypt: "eg",
  England: "gb-eng",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  Haiti: "ht",
  Iran: "ir",
  Iraq: "iq",
  "Ivory Coast": "ci",
  Japan: "jp",
  Jordan: "jo",
  Mexico: "mx",
  Morocco: "ma",
  Netherlands: "nl",
  "New Zealand": "nz",
  Norway: "no",
  Panama: "pa",
  Paraguay: "py",
  Portugal: "pt",
  Qatar: "qa",
  "Saudi Arabia": "sa",
  Scotland: "gb-sct",
  Senegal: "sn",
  "South Africa": "za",
  "South Korea": "kr",
  Spain: "es",
  Sweden: "se",
  Switzerland: "ch",
  Tunisia: "tn",
  Turkey: "tr",
  USA: "us",
  Uruguay: "uy",
  Uzbekistan: "uz",
};

// Nombres "bonitos" para la UI (estilo FIFA / Apple Sports).
const DISPLAY_NAMES: Record<string, string> = {
  "South Korea": "Korea Republic",
  "Czech Republic": "Czechia",
  "Bosnia & Herzegovina": "Bosnia & Herzegovina",
  USA: "United States",
};

/** ¿Es un equipo real ya definido (no un placeholder tipo "1A", "W73", "3A/B/C")? */
export function isRealTeam(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(TEAM_FLAGS, name);
}

/** Ruta al SVG circular de la bandera, o null si es un placeholder. */
export function flagSrc(name: string): string | null {
  const code = TEAM_FLAGS[name];
  return code ? withBase(`/flags/${code}.svg`) : null;
}

/** Ruta al SVG rectangular (4:3) de la bandera, o null si es un placeholder. */
export function flagRectSrc(name: string): string | null {
  const code = TEAM_FLAGS[name];
  return code ? withBase(`/flags-rect/${code}.svg`) : null;
}

/** Nombre a mostrar (mapea a la variante FIFA si aplica). */
export function displayName(name: string): string {
  return DISPLAY_NAMES[name] ?? name;
}

// Nombres cortos para celdas estrechas (tabla de grupos): evitan saltos de línea.
const SHORT_NAMES: Record<string, string> = {
  "Bosnia & Herzegovina": "Bosnia",
  USA: "USA",
  "South Korea": "Korea",
  "Saudi Arabia": "S. Arabia",
  "South Africa": "S. Africa",
  "New Zealand": "N. Zealand",
};

/** Nombre corto para celdas estrechas; cae en displayName si no hay versión corta. */
export function shortName(name: string): string {
  return SHORT_NAMES[name] ?? displayName(name);
}
