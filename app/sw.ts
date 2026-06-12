import { defaultCache } from "@serwist/turbopack/worker";
import { ExpirationPlugin, NetworkFirst, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

// Tipado del contexto global del service worker.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Fixture de openfootball: red primero (datos frescos), y si no hay
    // conexión sirve el último JSON visto hasta por 24 h. Va ANTES que la
    // regla genérica cross-origin de defaultCache (que expira en 1 h).
    {
      matcher: ({ url }) =>
        url.hostname === "raw.githubusercontent.com" &&
        url.pathname.includes("/openfootball/"),
      handler: new NetworkFirst({
        cacheName: "worldcup-data",
        networkTimeoutSeconds: 6,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
