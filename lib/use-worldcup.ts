"use client";

import { useEffect, useRef, useState } from "react";
import { SOURCE_URL, type Match, type WorldCupData } from "@/lib/worldcup";

const REFRESH_MS = 3 * 60 * 1000; // el feed se actualiza varias veces al día; 3 min es de sobra

/**
 * Datos en vivo: parte del fixture pre-renderizado en build y lo refresca
 * desde el navegador (raw.githubusercontent.com permite CORS) al montar,
 * al volver a la pestaña y cada pocos minutos. Clave para GitHub Pages,
 * donde no hay servidor que revalide.
 */
export function useWorldCup(initial: Match[]): Match[] {
  const [matches, setMatches] = useState(initial);
  const etag = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await fetch(SOURCE_URL, {
          cache: "no-store",
          headers: etag.current ? { "If-None-Match": etag.current } : undefined,
        });
        if (res.status === 304 || !res.ok || cancelled) return;
        etag.current = res.headers.get("etag");
        const data: WorldCupData = await res.json();
        if (!cancelled && Array.isArray(data.matches)) {
          setMatches(data.matches);
        }
      } catch {
        // Sin red u offline: nos quedamos con lo último que tengamos.
      }
    };

    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return matches;
}
