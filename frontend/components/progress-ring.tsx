import React from "react";

type ProgressRingProps = {
  value: number;
  label: string;
};

export function ProgressRing({ value, label }: ProgressRingProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  const angle = safeValue * 3.6;

  return (
    <div className="flex items-center gap-4 rounded-3xl bg-canvas px-4 py-3">
      <div
        className="grid h-16 w-16 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#3f6b57 ${angle}deg, rgba(63, 107, 87, 0.14) ${angle}deg)`
        }}
      >
        <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-semibold text-ink">
          {safeValue}%
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink/55">今日の達成度</p>
      </div>
    </div>
  );
}
