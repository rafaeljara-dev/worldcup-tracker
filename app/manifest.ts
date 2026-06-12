import type { MetadataRoute } from "next";
import { withBase } from "@/lib/base-path";

// Requerido por output: "export" para rutas de metadata.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "World Cup 2026 · Resultados",
    short_name: "WC 2026",
    description:
      "Tablas de grupos, eliminatorias y calendario del Mundial 2026.",
    start_url: withBase("/"),
    scope: withBase("/"),
    display: "standalone",
    background_color: "#0b1020",
    theme_color: "#0b1020",
    orientation: "portrait-primary",
    categories: ["sports"],
    lang: "es",
    icons: [
      {
        src: withBase("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBase("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBase("/icons/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
