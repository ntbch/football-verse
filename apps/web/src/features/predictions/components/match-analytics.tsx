"use client";

import type { MatchCentreFixture } from "../types";

type MatchAnalyticsProps = {
  match: MatchCentreFixture;
};

export const MatchAnalytics = ({ match }: MatchAnalyticsProps) => {
  const ai = match.aiPrediction;
  if (!ai) return null;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-4 flex flex-col gap-4 shadow-sm mb-4">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
        Match Analytics & Insights
      </span>

      {/* Win / Draw / Loss Probability Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-text-primary)]">
          <span className="truncate max-w-[120px]">{match.homeTeam}: {ai.homePct}%</span>
          <span>Draw: {ai.drawPct}%</span>
          <span className="truncate max-w-[120px] text-right">{match.awayTeam}: {ai.awayPct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex w-full bg-gray-200/50">
          <div className="bg-[var(--color-accent)] h-full" style={{ width: `${ai.homePct}%` }} />
          <div className="bg-gray-300 h-full" style={{ width: `${ai.drawPct}%` }} />
          <div className="bg-gray-400 h-full" style={{ width: `${ai.awayPct}%` }} />
        </div>
      </div>

      {/* Form & H2H */}
      <div className="grid grid-cols-2 gap-6 text-xs border-t border-[var(--color-border)] pt-3">
        {/* Left: Form */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold uppercase text-[var(--color-text-secondary)]">Form (Last 5)</span>
          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold text-[var(--color-text-secondary)]">Home:</span>
              <div className="flex gap-0.5">
                {ai.homeForm?.map((f, i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold text-white ${
                      f === "W" ? "bg-green-500" : f === "D" ? "bg-gray-400" : "bg-red-500"
                    }`}
                  >
                    {f}
                  </span>
                )) || <span className="text-gray-400">—</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold text-[var(--color-text-secondary)]">Away:</span>
              <div className="flex gap-0.5">
                {ai.awayForm?.map((f, i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold text-white ${
                      f === "W" ? "bg-green-500" : f === "D" ? "bg-gray-400" : "bg-red-500"
                    }`}
                  >
                    {f}
                  </span>
                )) || <span className="text-gray-400">—</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Prediction */}
        <div className="flex flex-col gap-2 justify-center border-l border-[var(--color-border)] pl-4">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-[var(--color-text-secondary)]">AI Suggestion:</span>
            <span className="font-black text-[var(--color-accent)]">{ai.pickLabel || ai.pick}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-[var(--color-text-secondary)]">Confidence:</span>
            <span className="font-black text-[var(--color-text-primary)]">{ai.confidence}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
