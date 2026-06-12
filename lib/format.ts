// Formateo de fechas/horas del fixture. Las fechas vienen como "2026-06-11"
// y las horas como "13:00 UTC-6" (hora local de la sede).

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

/** "13:00 UTC-6" -> "13:00" (la hora ya es local de la sede). */
export function formatTime(time: string): string {
  return time.split(" ")[0] ?? time;
}

/** Zona horaria de la sede, ej. "UTC-6". */
export function venueTz(time: string): string {
  return time.split(" ")[1] ?? "";
}
