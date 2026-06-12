import {
  finalScore,
  penalties,
  winnerIndex,
  type Goal,
  type Match,
} from "@/lib/worldcup";
import { matchStatus } from "@/lib/match-status";
import { TeamLabel } from "@/components/team-row";
import { formatDate, formatTime, visitorTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

/** Tarjeta de un partido eliminatorio: dos equipos, marcador o "–", fecha y sede. */
export function MatchCard({
  match,
  now,
}: {
  match: Match;
  now: number | null;
}) {
  const score = finalScore(match);
  const pens = penalties(match);
  const winner = winnerIndex(match);
  const status = now === null ? null : matchStatus(match, now);
  const { label } = formatDate(match.date);
  // Hora en la zona del visitante; hasta montar cae a la hora de la sede
  // para no romper la hidratación.
  const local = now === null ? null : visitorTime(match);

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-white/8 bg-card/70 p-4 backdrop-blur-sm transition-[background-color,transform] duration-200 hover:bg-white/[0.03] active:scale-[0.99]">
      <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
        <span className="tabular-nums">
          {label} · {local?.time ?? formatTime(match.time)}
          {local?.nextDay && " (+1 día)"}
        </span>
        <span className="flex items-center gap-1.5">
          {status === "live" && <LiveBadge />}
          {status === "played" && (
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
              Final
            </span>
          )}
          {match.num ? (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px]">
              #{match.num}
            </span>
          ) : null}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <TeamRow
          team={match.team1}
          score={score?.[0]}
          goals={match.goals1}
          dim={winner === 1}
        />
        <TeamRow
          team={match.team2}
          score={score?.[1]}
          goals={match.goals2}
          dim={winner === 0}
        />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-muted-foreground/80">
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{match.ground}</span>
        </span>
        {pens && (
          <span className="shrink-0 font-semibold tabular-nums text-foreground/80">
            Pen {pens[0]}–{pens[1]}
          </span>
        )}
      </div>
    </div>
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

function TeamRow({
  team,
  score,
  goals,
  dim,
}: {
  team: string;
  score?: number;
  goals?: Goal[];
  dim?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", dim && "opacity-55")}>
      <div className="flex items-center justify-between gap-2">
        <TeamLabel team={team} flagSize={26} truncate />
        <span className="w-6 text-right text-base font-semibold tabular-nums">
          {typeof score === "number" ? (
            score
          ) : (
            <span className="text-muted-foreground/50">–</span>
          )}
        </span>
      </div>
      {goals && goals.length > 0 && (
        <p className="pl-9 text-[10px] leading-snug text-muted-foreground">
          {goals.map((g) => `${g.name} ${g.minute}'`).join(" · ")}
        </p>
      )}
    </div>
  );
}
