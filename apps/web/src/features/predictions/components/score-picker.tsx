"use client";

type ScorePickerProps = {
  value: number;
  onChange: (v: number) => void;
};

export const ScorePicker = ({ value, onChange }: ScorePickerProps) => {
  return (
    <div className="flex items-center bg-gray-50 border border-[var(--color-border)] rounded-xl p-0.5 shadow-sm">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200/60 hover:text-[var(--color-text-primary)] active:scale-90 transition-all text-xs font-bold text-[var(--color-text-secondary)] border-0 bg-transparent cursor-pointer"
      >
        −
      </button>
      <span className="w-8 text-center font-mono text-base font-black text-[var(--color-text-primary)] tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(15, value + 1))}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200/60 hover:text-[var(--color-text-primary)] active:scale-90 transition-all text-xs font-bold text-[var(--color-text-secondary)] border-0 bg-transparent cursor-pointer"
      >
        +
      </button>
    </div>
  );
};
