// Formateo de fechas/horas del fixture. Las fechas vienen como "2026-06-11"
// y las horas como "13:00 UTC-6" (hora local de la sede).

import type { Match } from "@/lib/worldcup";
import { kickoffUtc } from "@/lib/match-status";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** "2026-06-11" -> { weekday: "Jue", short: "11 jun", full: "Jueves 11 jun" } */
export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  // Construimos en UTC para evitar corrimientos por zona horaria.
  const date = new Date(Date.UTC(y, m - 1, d));
  const wd = WEEKDAYS[date.getUTCDay()];
  const mon = MONTHS[m - 1];
  return {
    weekday: wd,
    short: `${d} ${mon}`,
    label: `${wd} ${d} ${mon}`,
  };
}

/** 13, 0 -> "1:00 PM" */
function amPm(h: number, m: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "13:00 UTC-6" -> "1:00 PM" (hora local de la sede). */
export function formatTime(time: string): string {
  const [hh, mm] = (time.split(" ")[0] ?? "").split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return time;
  return amPm(hh, mm);
}

/**
 * Hora del kickoff en la zona horaria del visitante, en AM/PM.
 * `nextDay` avisa que para el visitante el partido cae un día después
 * de la fecha listada (que es la de la sede).
 *
 * Solo en cliente: en el build no se conoce la zona del visitante, así
 * que el llamador debe esperar a montar (mismo patrón que `now`).
 */
export function visitorTime(
  m: Match,
): { time: string; nextDay: boolean } | null {
  const ts = kickoffUtc(m);
  if (ts === null) return null;
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { time: amPm(d.getHours(), d.getMinutes()), nextDay: localIso > m.date };
}
