import React from "react";

type ToastProps = {
  message: string;
};

export function Toast({ message }: ToastProps) {
  return (
    <div className="fixed right-4 top-4 z-50 rounded-2xl border border-white/70 bg-ink px-4 py-3 text-sm font-medium text-white shadow-soft">
      {message}
    </div>
  );
}
