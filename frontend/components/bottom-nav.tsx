"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

const items = [
  { label: "Home", href: "/" as Route },
  { label: "Pantry", href: "/pantry" as Route },
  { label: "Meals", href: "/cooking" as Route }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-4 z-10 mx-auto grid w-full max-w-xl grid-cols-3 rounded-full border border-white/70 bg-white/90 px-3 py-2 shadow-soft backdrop-blur">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`flex min-w-16 flex-col items-center rounded-full px-3 py-2 text-xs font-medium transition ${
            pathname === item.href ? "bg-moss text-white" : "text-ink/60"
          }`}
        >
          <span className="mb-1 h-1.5 w-1.5 rounded-full bg-current" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
