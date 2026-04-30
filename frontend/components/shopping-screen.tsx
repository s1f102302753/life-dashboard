"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { SectionCard } from "@/components/section-card";
import { getRecipes, getShoppingPlan } from "@/lib/api";
import type { Recipe, ShoppingPlan } from "@/types/dashboard";

function parseRecipeIds(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);
}

export function ShoppingScreen() {
  const searchParams = useSearchParams();
  const initialRecipeIds = parseRecipeIds(searchParams?.get("recipeIds") ?? null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<number[]>(initialRecipeIds);
  const [shoppingPlan, setShoppingPlan] = useState<ShoppingPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        setErrorMessage(null);
        const data = await getRecipes();
        setRecipes(data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      }
    };

    void loadRecipes();
  }, []);

  useEffect(() => {
    if (selectedRecipeIds.length === 0) return;

    const loadPlan = async () => {
      try {
        setErrorMessage(null);
        const data = await getShoppingPlan(selectedRecipeIds);
        setShoppingPlan(data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      }
    };

    void loadPlan();
  }, [selectedRecipeIds.join(",")]);

  const toggleRecipe = (recipeId: number) => {
    setSelectedRecipeIds((current) =>
      current.includes(recipeId) ? current.filter((item) => item !== recipeId) : [...current, recipeId]
    );
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      <div className="rounded-[32px] bg-emerald-100 px-5 pb-6 pt-5 text-ink shadow-soft sm:px-6 lg:px-7">
        <p className="text-sm text-ink/60">Shopping</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight">買い物リストを作る</h1>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              作りたい料理を選ぶと、足りない食材をまとめて出します。
            </p>
          </div>
          <Link href="/suggestions" className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-ink">
            提案へ戻る
          </Link>
        </div>
      </div>

      <div className="-mt-5 grid gap-4 lg:grid-cols-[0.9fr,1.1fr]">
        <SectionCard
          eyebrow="Select Recipes"
          title="作りたい料理"
          description="複数選ぶと、不足食材を統合して一覧化します。"
        >
          <div className="space-y-3">
            {recipes.map((recipe) => (
              <label key={recipe.id} className="flex items-start gap-3 rounded-2xl bg-canvas px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedRecipeIds.includes(recipe.id)}
                  onChange={() => toggleRecipe(recipe.id)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-semibold text-ink">{recipe.name}</p>
                  <p className="mt-1 text-sm text-ink/60">{recipe.summary}</p>
                </div>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Need To Buy"
          title="不足食材"
          description="買い足し候補は在庫との差分から自動で計算します。"
        >
          <div className="space-y-3">
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            {shoppingPlan?.items.length ? (
              shoppingPlan.items.map((item) => (
                <article key={`${item.ingredient_id}-${item.unit}`} className="rounded-3xl bg-canvas p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.name}</p>
                      <p className="mt-1 text-xs text-ink/55">
                        推奨購入量 {item.suggested_purchase_quantity} {item.unit}
                      </p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-moss">
                      不足 {item.quantity}
                      {item.unit}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-ink/60">使う料理: {item.recipes.join(" / ")}</p>
                </article>
              ))
            ) : (
              <p className="rounded-2xl bg-canvas px-4 py-6 text-center text-sm text-ink/55">
                レシピを選ぶと不足食材が表示されます。
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 lg:mt-6">
        <BottomNav />
      </div>
    </main>
  );
}
