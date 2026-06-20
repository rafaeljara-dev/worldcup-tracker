# World Cup 2026 · Tracker

App personal (hobby) para ver grupos, eliminatorias y calendario del Mundial 2026, con estética estilo **Apple Sports** (dark navy) e instalable como **PWA**.

**Live:** https://rafaeljara-dev.github.io/worldcup-tracker/

## Stack

- **Next.js 16.2** (App Router, Turbopack, `output: "export"`) + **React 19**
- **Tailwind v4** + **shadcn/ui** (preset base-nova, Base UI)
- **Serwist** para PWA (`@serwist/turbopack`, compatible con Turbopack)
- Datos: [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) — público, sin API key
- Hosting: **GitHub Pages** (gratis) vía GitHub Actions

## Datos: cómo se actualizan

openfootball actualiza el JSON varias veces al día (no es live al segundo). El marcador
viene como `score: { ht, ft, et, p }` + `goals1`/`goals2` con los goleadores.

La app se mantiene fresca por dos vías:

1. **Cliente**: `useWorldCup` re-fetchea el JSON al abrir, al volver a la pestaña y cada
   3 min (raw.githubusercontent.com permite CORS), recalculando standings al vuelo.
2. **Build**: el workflow corre cada 6 h (cron) y en cada push, así el HTML pre-renderizado
   también sale con datos recientes.

## Cómo correr

```bash
pnpm install
pnpm dev          # desarrollo (el SW de Serwist va deshabilitado en dev)
```

Para probar la PWA (service worker activo) hay que usar el build de producción:

```bash
pnpm build        # genera out/ (static export)
npx serve out     # o cualquier server estático
```

## Estructura

| Ruta | Qué hace |
|------|----------|
| `lib/worldcup.ts` | Tipos, parser de marcadores (ft/et/penales), standings, agrupación de rondas |
| `lib/use-worldcup.ts` | Hook de refresh client-side del fixture |
| `lib/match-status.ts` | Estado del partido (próximo / en juego / final) desde la hora de la sede |
| `lib/teams.ts` | Mapa equipo → bandera (ISO) y nombre FIFA |
| `lib/base-path.ts` | Prefijo `/worldcup-tracker` para GitHub Pages |
| `components/` | `worldcup-view` (tabs), `group-table`, `match-card`, `schedule-rail`, `team-row`, `app-header` |
| `app/sw.ts` + `app/[path]/route.ts` | Service worker compilado por esbuild, servido en la raíz (Pages no manda `Service-Worker-Allowed`) |
| `app/manifest.ts` | Web App Manifest (`/manifest.webmanifest`) |
| `public/flags/` | 48 banderas circulares SVG (~92 KB total) de [circle-flags](https://github.com/HatScripts/circle-flags) |
| `public/icons/` | Iconos PWA (192, 512, maskable) generados desde `icon.svg` |
| `.github/workflows/deploy.yml` | Build estático + deploy a Pages (push, cron 6 h, manual) |

## Deploy

GitHub Pages (project page) bajo `/worldcup-tracker`. El workflow exporta con
`NEXT_PUBLIC_BASE_PATH=/worldcup-tracker` y publica `out/` con `actions/deploy-pages`.

## Licencia y uso

Proyecto **personal y sin fines de lucro** (hobby). **No** está afiliado a la FIFA
ni a ninguna organización oficial; las marcas, nombres y escudos de las selecciones
pertenecen a sus respectivos dueños.

- **Código**: [PolyForm Noncommercial License 1.0.0](LICENSE.md). Eres libre de
  **usarlo, estudiarlo, modificarlo y compartirlo con fines no comerciales**
  (personal, educativo, investigación). **No se permite el uso comercial ni con
  fines de lucro.**
- **Datos**: de [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json),
  dedicados al **dominio público (CC0-1.0)** — libres sin restricciones. Se citan
  por cortesía (CC0 no exige atribución).
