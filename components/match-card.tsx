import { finalScore, penalties, type Goal } from "@/lib/worldcup";
import type { ResolvedMatch, ResolvedSlot } from "@/lib/bracket";
import { matchStatus } from "@/lib/match-status";
import { displayName, flagRectSrc } from "@/lib/teams";
import { googleCalendarUrl } from "@/lib/calendar";
import { formatDate, formatTime, visitorTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CalendarPlus, MapPin } from "lucide-react";

/**
 * Tarjeta de un partido eliminatorio en formato "versus" (un equipo a cada lado).
 * La sede va abajo a la izquierda y, enfrente, un botón que abre Google Calendar
 * con el evento pre-llenado (la tarjeta entera ya no es un enlace).
 */
export function MatchCard({
  rm,
  now,
}: {
  rm: ResolvedMatch;
  now: number | null;
}) {
  const { match } = rm;
  const score = finalScore(match);
  const pens = penalties(match);
  const winner = rm.winnerIdx;
  const status = now === null ? null : matchStatus(match, now);
  const { label } = formatDate(match.date);
  // Hora en la zona del visitante; hasta montar cae a la hora de la sede
  // para no romper la hidratación.
  const local = now === null ? null : visitorTime(match);

  const projected =
    rm.team1.status === "projected" || rm.team2.status === "projected";
  const undefinedSlot =
    rm.team1.status === "pending" || rm.team2.status === "pending";

  const name1 = rm.team1.team ?? rm.team1.label;
  const name2 = rm.team2.team ?? rm.team2.label;
  const calUrl = googleCalendarUrl(match, name1, name2);
  const hasGoals = Boolean(match.goals1?.length || match.goals2?.length);

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-white/8 bg-card/70 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span className="tabular-nums">
          {label} · {local?.time ?? formatTime(match.time)}
          {local?.nextDay && " (+1 día)"}
        </span>
        <span className="flex items-center gap-1.5">
          {status === "live" && <LiveBadge />}
          {status === "played" && (
            <Chip className="bg-white/8 text-foreground/80">Final</Chip>
          )}
          {status !== "played" && status !== "live" && undefinedSlot && (
            <Chip className="bg-white/5 text-muted-foreground">Por definir</Chip>
          )}
          {status !== "played" &&
            status !== "live" &&
            !undefinedSlot &&
            projected && (
              <Chip className="bg-chart-4/15 text-chart-4">Proyección</Chip>
            )}
          {match.num ? (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px]">
              #{match.num}
            </span>
          ) : null}
        </span>
      </div>

      <div className="flex items-stretch justify-between gap-2 py-1">
        <TeamSide slot={rm.team1} dim={winner === 1} />
        <ScoreCenter score={score} pens={pens} />
        <TeamSide slot={rm.team2} dim={winner === 0} />
      </div>

      {hasGoals && (
        <div className="flex justify-between gap-3 text-[10px] leading-snug text-muted-foreground">
          <Scorers goals={match.goals1} align="left" />
          <Scorers goals={match.goals2} align="right" />
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{match.ground}</span>
        </span>
        <a
          href={calUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Agendar ${displayName(name1)} vs ${displayName(name2)} en Google Calendar`}
          title="Añadir a Google Calendar"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-[background-color,transform] hover:bg-primary/25 active:scale-95"
        >
          <CalendarPlus className="size-[18px]" />
        </a>
      </div>
    </div>
  );
}

function Scorers({ goals, align }: { goals?: Goal[]; align: "left" | "right" }) {
  if (!goals?.length) return <span className="flex-1" />;
  return (
    <ul className={cn("flex-1 space-y-0.5", align === "right" && "text-right")}>
      {goals.map((g, i) => (
        <li key={`${g.name}-${g.minute}-${i}`} className="truncate">
          {g.name} {g.minute}&rsquo;
        </li>
      ))}
    </ul>
  );
}

function ScoreCenter({
  score,
  pens,
}: {
  score: [number, number] | null;
  pens: [number, number] | null;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 px-1">
      {score ? (
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {score[0]}
          <span className="px-1.5 text-muted-foreground/50">–</span>
          {score[1]}
        </span>
      ) : (
        <span className="text-base font-semibold tracking-wide text-muted-foreground/70">
          VS
        </span>
      )}
      {pens && (
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
          pen {pens[0]}–{pens[1]}
        </span>
      )}
    </div>
  );
}

function TeamSide({ slot, dim }: { slot: ResolvedSlot; dim?: boolean }) {
  const src = slot.team ? flagRectSrc(slot.team) : null;
  const name = slot.team ? displayName(slot.team) : slot.label;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-2 text-center transition-opacity",
        dim && "opacity-50",
      )}
    >
      <div className="relative">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            width={40}
            height={30}
            loading="lazy"
            className="h-[30px] w-10 rounded-sm object-cover ring-1 ring-white/10"
          />
        ) : (
          <span className="flex h-[30px] w-10 items-center justify-center rounded-sm bg-white/10 text-sm font-semibold text-muted-foreground ring-1 ring-white/10">
            ?
          </span>
        )}
        {slot.status === "projected" && slot.team && (
          <span
            className="absolute -top-1 -right-1 size-2.5 rounded-full bg-chart-4 ring-2 ring-card"
            title="Equipo proyectado"
          />
        )}
      </div>
      <span
        className={cn(
          "line-clamp-2 text-[15px] leading-tight",
          slot.team
            ? "font-semibold text-foreground"
            : "italic text-muted-foreground",
        )}
      >
        {name}
      </span>
    </div>
  );
}

function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
      <span className="size-1.5 animate-pulse rounded-full bg-success" />
      En juego
    </span>
  );
}
