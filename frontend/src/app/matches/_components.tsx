import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import type { MatchTeam, StandingRow } from "./_types";

export const TeamLogo = ({ team }: { team: MatchTeam }) => {
  if (!team.logo) {
    return null;
  }

  return <img alt="" className="h-8 w-8 object-contain" loading="lazy" src={team.logo} />;
};

type RoundSelectProps = {
  disabled?: boolean;
  rounds?: string[];
  value: string;
  onChange: (value: string) => void;
};

export const RoundSelect = ({ disabled, rounds, value, onChange }: RoundSelectProps) => (
  <label className="panel grid gap-2 p-4 text-sm font-bold uppercase text-[var(--fv-muted)]">
    Round
    <select className="input normal-case" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Next and recent matches</option>
      {rounds?.map((roundName) => (
        <option key={roundName} value={roundName}>
          {roundName}
        </option>
      ))}
    </select>
  </label>
);

type StandingsPanelProps = {
  error?: unknown;
  isLoading?: boolean;
  limit?: number;
  rows?: StandingRow[];
  title?: string;
};

export const StandingsPanel = ({ error, isLoading, limit, rows, title = "Standings" }: StandingsPanelProps) => {
  const visibleRows = typeof limit === "number" ? rows?.slice(0, limit) : rows;

  return (
    <aside className="panel h-fit p-5">
      <h2 className="display-face text-3xl font-black">{title}</h2>
      {isLoading ? <LoadingBlock label="Loading standings" /> : null}
      {error ? <ErrorBlock message="Could not load standings." /> : null}
      <div className="mt-4 grid gap-2">
        {visibleRows?.length === 0 ? <p>No standings returned.</p> : null}
        {visibleRows?.map((row) => (
          <div className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-2 border-t border-[var(--fv-line)] pt-2 text-sm" key={row.team.id}>
            <span className="font-black">{row.rank}</span>
                <span className="flex items-center gap-2 font-bold">
                  <TeamLogo team={row.team} />
                  {row.team.name}
                </span>
            <span className="text-[var(--fv-muted)]">{row.played}</span>
            <span className="font-black">{row.points}</span>
          </div>
        ))}
      </div>
    </aside>
  );
};
