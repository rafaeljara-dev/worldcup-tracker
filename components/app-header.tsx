/** Cabecera fija estilo Apple Sports. */
export function AppHeader() {
  return (
    <header className="header-enter flex flex-col items-center gap-1 pt-10 pb-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
        FIFA
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        World Cup 2026
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Canadá · México · Estados Unidos
      </p>
    </header>
  );
}
