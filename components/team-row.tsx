import { cn } from "@/lib/utils";
import { displayName, flagSrc, isRealTeam } from "@/lib/teams";

interface TeamLabelProps {
  team: string;
  className?: string;
  flagSize?: number;
  /** Trunca el nombre con ellipsis (útil en celdas estrechas). */
  truncate?: boolean;
}

/** Bandera circular + nombre. Si es un placeholder (ej. "1A", "W73") muestra un disco neutro. */
export function TeamLabel({
  team,
  className,
  flagSize = 22,
  truncate,
}: TeamLabelProps) {
  const src = flagSrc(team);
  const real = isRealTeam(team);

  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {src ? (
        // SVG estático ya optimizado (~1-2KB); no necesita next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={flagSize}
          height={flagSize}
          loading="lazy"
          className="shrink-0 rounded-full ring-1 ring-white/10"
          style={{ width: flagSize, height: flagSize }}
        />
      ) : (
        <span
          aria-hidden
          className="flex shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-muted-foreground ring-1 ring-white/10"
          style={{ width: flagSize, height: flagSize }}
        >
          ?
        </span>
      )}
      <span
        className={cn(
          "min-w-0 text-sm",
          real ? "font-medium text-foreground" : "text-muted-foreground",
          truncate && "truncate",
        )}
        title={displayName(team)}
      >
        {displayName(team)}
      </span>
    </span>
  );
}
