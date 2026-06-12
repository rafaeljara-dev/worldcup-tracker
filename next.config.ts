import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

// En GitHub Pages (project page) la app vive bajo /worldcup-tracker.
// El workflow de deploy define NEXT_PUBLIC_BASE_PATH; en local queda vacío.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // GitHub Pages solo sirve archivos estáticos.
  output: "export",
  basePath: basePath || undefined,
  images: { unoptimized: true },
};

// withSerwist agrega esbuild a serverExternalPackages y prepara el build del SW.
export default withSerwist(nextConfig);
