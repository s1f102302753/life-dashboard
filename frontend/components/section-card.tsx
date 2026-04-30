import React from "react";
import type { ReactNode } from "react";

type SectionCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  children
}: SectionCardProps) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-soft backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-moss/70">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-ink/65">{description}</p>
      </div>
      {children}
    </section>
  );
}
