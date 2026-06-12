// En GitHub Pages la app vive bajo /worldcup-tracker (project page).
// NEXT_PUBLIC_BASE_PATH se define en el workflow de deploy; en dev queda vacío.
// Next solo prefija automáticamente sus propias rutas — los assets referenciados
// a mano (banderas, iconos del manifest, swUrl) necesitan este helper.

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
