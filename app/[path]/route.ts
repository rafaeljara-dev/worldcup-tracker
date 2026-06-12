import { createSerwistRoute } from "@serwist/turbopack";

// Compila app/sw.ts con esbuild y lo sirve por una route handler,
// independiente del bundler (Turbopack no corre plugins de webpack).
//
// Vive en app/[path] (raíz, no /serwist) a propósito: GitHub Pages sirve
// archivos estáticos sin el header Service-Worker-Allowed, así que el SW
// solo puede controlar el scope del directorio donde vive. En la raíz,
// /sw.js controla todo el sitio.
const route = createSerwistRoute({
  swSrc: "app/sw.ts",
  // esbuild nativo: el wasm falla en Windows con rutas absolutas.
  useNativeEsbuild: true,
});

// IMPORTANTE: estos exports deben ser literales estáticos (Next los parsea en compilación).
export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = false;

export const generateStaticParams = route.generateStaticParams;
export const GET = route.GET;
