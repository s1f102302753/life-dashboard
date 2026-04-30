"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { SectionCard } from "@/components/section-card";
import { getSuggestions } from "@/lib/api";
import type { MealContext, Suggestion, SuggestionMode } from "@/types/dashboard";

const mealOptions: Array<{ label: string; value: MealContext }> = [
  { label: "朝", value: "Breakfast" },
  { label: "昼", value: "Lunch" },
  { label: "夜", value: "Dinner" }
];

function mealLabel(value: MealContext): string {
  if (value === "Breakfast") return "朝";
  if (value === "Lunch") return "昼";
  return "夜";
}

function buildInitialPrompt(mode: SuggestionMode, mealContext: MealContext, query: string): string {
  const base =
    mode === "pantry"
      ? `在庫を優先して、${mealLabel(mealContext)}向けの献立を考えて。`
      : `最近の自炊記録を見て、${mealLabel(mealContext)}のバランスが良くなる献立を考えて。`;

  if (!query.trim()) {
    return base;
  }

  return `${base} 気になる条件は「${query.trim()}」です。`;
}

function buildFollowupMessage(suggestion: Suggestion): string {
  const available = suggestion.available_items.slice(0, 2).join(" / ");
  const missing = suggestion.missing_items.slice(0, 2).map((item) => item.name).join(" / ");

  if (suggestion.can_cook_now) {
    return available
      ? `よし、${available} を使って ${suggestion.name} にする。${suggestion.cook_time_minutes}分くらいで始めたい。`
      : `よし、${suggestion.name} にする。${suggestion.cook_time_minutes}分くらいで作り始めたい。`;
  }

  return missing
    ? `${suggestion.name} を候補にする。足りない ${missing} を買い物リストに回したい。`
    : `${suggestion.name} を候補にする。不足分を買い物側で整理したい。`;
}

export function SuggestionsScreen() {
  const [mode, setMode] = useState<SuggestionMode>("pantry");
  const [mealContext, setMealContext] = useState<MealContext>("Dinner");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSuggestions = async () => {
    try {
      setErrorMessage(null);
      const data = await getSuggestions({ mode, mealContext, query });
      setSuggestions(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  useEffect(() => {
    void loadSuggestions();
  }, [mode, mealContext]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      <div className="rounded-[32px] bg-sky-100 px-5 pb-6 pt-5 text-ink shadow-soft sm:px-6 lg:px-7">
        <p className="text-sm text-ink/60">Meal Planner</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight">献立エージェント</h1>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              在庫からも、直近の自炊記録の偏りからも候補を出します。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSuggestions()}
            className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-ink"
          >
            再提案する
          </button>
        </div>
      </div>

      <div className="-mt-5 space-y-4">
        <SectionCard
          eyebrow="Mode"
          title="どこから決めるか"
          description="在庫優先か、最近の自炊記録からバランス補正するかを切り替えます。"
        >
          <div className="grid gap-3 sm:grid-cols-[0.42fr,0.58fr]">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("pantry")}
                  className={`rounded-full px-4 py-3 text-sm font-medium ${
                    mode === "pantry" ? "bg-moss text-white" : "bg-canvas text-ink"
                  }`}
                >
                  在庫から提案
                </button>
                <button
                  type="button"
                  onClick={() => setMode("balance")}
                  className={`rounded-full px-4 py-3 text-sm font-medium ${
                    mode === "balance" ? "bg-moss text-white" : "bg-canvas text-ink"
                  }`}
                >
                  記録から整える
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {mealOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMealContext(item.value)}
                    className={`rounded-full px-4 py-3 text-sm font-medium ${
                      mealContext === item.value ? "bg-ink text-white" : "bg-canvas text-ink"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  mode === "pantry"
                    ? "例: 卵、豆腐、パスタ"
                    : "任意: 軽め、汁物、たんぱく質を増やす など"
                }
                className="w-full rounded-2xl border border-ink/10 bg-canvas px-3 py-3 text-sm text-ink"
              />
              <button
                type="button"
                onClick={() => void loadSuggestions()}
                className="rounded-full bg-ink px-4 py-3 text-sm font-medium text-white"
              >
                提案
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Chat Planner"
          title="会話で献立を決める"
          description="エージェントが会話形式で候補を説明し、そのまま記録や買い物へ進めます。"
        >
          <div className="space-y-4">
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-[28px] rounded-br-lg bg-ink px-4 py-3 text-sm leading-6 text-white">
                {buildInitialPrompt(mode, mealContext, query)}
              </div>
            </div>
            {suggestions.map((suggestion) => (
              <article key={suggestion.recipe_id} className="space-y-2">
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-[28px] rounded-bl-lg bg-canvas px-4 py-4 text-sm text-ink shadow-soft">
                    <p className="text-xs uppercase tracking-[0.16em] text-moss/70">Agent</p>
                    <p className="mt-2 text-sm text-ink/55">{suggestion.meal}</p>
                    <h3 className="mt-1 text-xl font-semibold text-ink">{suggestion.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/65">{suggestion.summary}</p>
                    <p className="mt-2 text-sm leading-6 text-moss">{suggestion.agent_message}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Available</p>
                        <p className="mt-2 text-sm text-ink/65">
                          {suggestion.available_items.length > 0 ? suggestion.available_items.join(" / ") : "在庫情報を増やしてください"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Missing</p>
                        <p className="mt-2 text-sm text-ink/65">
                          {suggestion.missing_items.length > 0
                            ? suggestion.missing_items.map((item) => `${item.name} ${item.quantity}${item.unit}`).join(" / ")
                            : "不足なし"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-[28px] rounded-br-lg bg-white px-4 py-3 text-sm text-ink shadow-soft">
                    {buildFollowupMessage(suggestion)}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link
                    href={{
                      pathname: "/cooking",
                      query: {
                        menu: suggestion.name,
                        meal: suggestion.meal,
                        note: suggestion.agent_message,
                        calories: ""
                      }
                    }}
                    className="block rounded-full bg-ink px-4 py-3 text-center text-sm font-medium text-white"
                  >
                    この料理を記録する
                  </Link>
                  <Link
                    href={{
                      pathname: "/shopping",
                      query: {
                        recipeIds: String(suggestion.recipe_id)
                      }
                    }}
                    className="block rounded-full border border-ink/10 bg-white px-4 py-3 text-center text-sm font-medium text-ink"
                  >
                    買い物候補を見る
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 lg:mt-6">
        <BottomNav />
      </div>
    </main>
  );
}
