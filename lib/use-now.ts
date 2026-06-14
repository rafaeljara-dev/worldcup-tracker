import { useSyncExternalStore } from "react";

// Reloj compartido para los badges "En juego". Vive fuera de React como un
// store externo: así evitamos llamar setState dentro de un efecto (que
// dispara renders en cascada) y respetamos la hidratación devolviendo null
// en el servidor hasta que el cliente toma el control.
const INTERVAL_MS = 30_000;

let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Un solo intervalo para todos los suscriptores.
  if (timer === null) {
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, INTERVAL_MS);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

// getSnapshot devuelve el valor cacheado (estable entre ticks; devolver
// Date.now() en cada llamada provocaría un bucle de renders).
const getSnapshot = (): number | null => now;
const getServerSnapshot = (): number | null => null;

/** Ahora (ms), refrescado cada 30 s; null hasta montar (para la hidratación). */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
