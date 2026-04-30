"use client";

import React from "react";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { SectionCard } from "@/components/section-card";
import { Toast } from "@/components/toast";
import {
  createPantryItem,
  deletePantryItem,
  getPantryInsights,
  getPantryItems,
  getSuggestions,
  importReceiptPantryItems
} from "@/lib/api";
import type {
  MealContext,
  PantryInsights,
  PantryItem,
  PantryItemInput,
  ReceiptParsedItem,
  Suggestion
} from "@/types/dashboard";

function createInitialFormState(): PantryItemInput {
  return {
    name: "",
    category: "Vegetable",
    quantity: "1",
    unit: "piece",
    storage: "Fridge",
    purchasedOn: new Date().toISOString().slice(0, 10),
    expiresOn: "",
    note: ""
  };
}

export function PantryScreen() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [insights, setInsights] = useState<PantryInsights | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [mealContext, setMealContext] = useState<MealContext>("Dinner");
  const [formState, setFormState] = useState<PantryItemInput>(createInitialFormState());
  const [query, setQuery] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState("");
  const [receiptItems, setReceiptItems] = useState<ReceiptParsedItem[]>([]);
  const [receiptWarnings, setReceiptWarnings] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const loadItems = async () => {
    try {
      setErrorMessage(null);
      const data = await getPantryItems({ query });
      setItems(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const loadInsights = async () => {
    try {
      const data = await getPantryInsights();
      setInsights(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const loadSuggestions = async () => {
    try {
      const data = await getSuggestions({ mode: "pantry", mealContext });
      setSuggestions(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  useEffect(() => {
    void loadItems();
  }, [query]);

  useEffect(() => {
    void loadInsights();
  }, []);

  useEffect(() => {
    void loadSuggestions();
  }, [mealContext]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeoutId = window.setTimeout(() => setToastMessage(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await createPantryItem(formState);
      setToastMessage("在庫を追加しました");
      setFormState(createInitialFormState());
      void loadItems();
      void loadInsights();
      void loadSuggestions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePantryItem(id);
      setToastMessage("在庫を削除しました");
      void loadItems();
      void loadInsights();
      void loadSuggestions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const handleReceiptChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      setReceiptFile(null);
      setReceiptPreviewUrl("");
      return;
    }

    setReceiptFile(file);
    setReceiptPreviewUrl(URL.createObjectURL(file));
  };

  const handleReceiptImport = async () => {
    if (!receiptFile) {
      setErrorMessage("レシート画像を選択してください");
      return;
    }

    try {
      setErrorMessage(null);
      const result = await importReceiptPantryItems(receiptFile);
      setReceiptItems(result.parsedItems);
      setReceiptWarnings(result.warnings);
      if (result.parsedItems.length === 0) {
        setToastMessage("抽出候補がありません。手動登録へ切り替えてください");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const handleReceiptItemChange = (
    index: number,
    field: keyof ReceiptParsedItem,
    value: string
  ) => {
    setReceiptItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: field === "quantity" ? Number(value) : value
            }
          : item
      )
    );
  };

  const handleReceiptRegister = async () => {
    try {
      for (const item of receiptItems) {
        await createPantryItem({
          name: item.name,
          category: item.category,
          quantity: String(item.quantity),
          unit: item.unit,
          storage: item.storage,
          purchasedOn: new Date().toISOString().slice(0, 10),
          expiresOn: "",
          note: item.note
        });
      }

      setReceiptItems([]);
      setReceiptWarnings([]);
      setReceiptFile(null);
      setReceiptPreviewUrl("");
      setToastMessage("レシートから食材を登録しました");
      void loadItems();
      void loadInsights();
      void loadSuggestions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const expiringSoon = items.filter((item) => item.expires_on).slice(0, 4);
  const compactFieldClass =
    "w-full rounded-xl border border-ink/10 bg-canvas px-2.5 py-2 text-xs text-ink sm:rounded-2xl sm:px-3 sm:py-3 sm:text-sm";
  const compactButtonClass =
    "w-full rounded-xl px-3 py-2.5 text-sm font-medium sm:rounded-full sm:px-4 sm:py-3";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      {toastMessage ? <Toast message={toastMessage} /> : null}
      <div className="rounded-[28px] bg-amber-100 px-4 pb-4 pt-4 text-ink shadow-soft sm:rounded-[32px] sm:px-6 sm:pb-6 sm:pt-5 lg:px-7">
        <p className="text-xs text-ink/60 sm:text-sm">Pantry</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">在庫を管理する</h1>
            <p className="mt-1 text-xs leading-5 text-ink/70 sm:mt-2 sm:text-sm sm:leading-6">
              手動登録に加えて、レシート撮影からの取り込みと在庫起点の料理案をまとめます。
            </p>
          </div>
          <div className="self-start rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium sm:px-3 sm:py-2 sm:text-sm">在庫から献立へ</div>
        </div>
      </div>

      <div className="-mt-5 grid gap-4 lg:grid-cols-[0.85fr,1.15fr]">
        <SectionCard
          eyebrow="Add Stock"
          title="食材を追加"
          description="必須項目を少なくして、すぐ登録できる形にしています。"
        >
          <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
            <input
              type="text"
              placeholder="食材名"
              value={formState.name}
              onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              className={compactFieldClass}
              required
            />
            <div className="grid grid-cols-[0.9fr,1.1fr] gap-2 sm:grid-cols-2 sm:gap-3">
              <input
                type="number"
                min="0"
                step="0.1"
                value={formState.quantity}
                onChange={(event) => setFormState((current) => ({ ...current, quantity: event.target.value }))}
                className={compactFieldClass}
                required
              />
              <input
                type="text"
                value={formState.unit}
                onChange={(event) => setFormState((current) => ({ ...current, unit: event.target.value }))}
                className={compactFieldClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <select
                value={formState.storage}
                onChange={(event) => setFormState((current) => ({ ...current, storage: event.target.value }))}
                className={compactFieldClass}
              >
                <option value="Fridge">冷蔵</option>
                <option value="Freezer">冷凍</option>
                <option value="Pantry">常温</option>
              </select>
              <input
                type="date"
                value={formState.expiresOn}
                onChange={(event) => setFormState((current) => ({ ...current, expiresOn: event.target.value }))}
                className={compactFieldClass}
              />
            </div>
            <textarea
              rows={1}
              value={formState.note}
              onChange={(event) => setFormState((current) => ({ ...current, note: event.target.value }))}
              className={`${compactFieldClass} min-h-0 resize-none`}
              placeholder="メモ"
            />
            {errorMessage ? <p className="text-xs text-red-600 sm:text-sm">{errorMessage}</p> : null}
            <button className={`${compactButtonClass} bg-ink text-white`}>
              在庫を登録する
            </button>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Receipt Capture"
          title="レシートを撮影して登録"
          description="スマホのカメラや画像選択から、食材名と数量の候補を抽出します。"
        >
          <div className="space-y-2.5 sm:space-y-3">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleReceiptChange}
              className="block w-full rounded-xl border border-dashed border-ink/15 bg-canvas px-2.5 py-2 text-xs text-ink sm:rounded-2xl sm:px-3 sm:py-3 sm:text-sm"
            />
            {receiptPreviewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-ink/10 bg-canvas">
                <img src={receiptPreviewUrl} alt="レシートプレビュー" className="w-full object-cover" />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void handleReceiptImport()}
              className={`${compactButtonClass} bg-moss text-white`}
            >
              レシートを解析する
            </button>
            {receiptWarnings.map((warning) => (
              <p key={warning} className="rounded-xl bg-peach px-3 py-2 text-xs text-ink/70 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
                {warning}
              </p>
            ))}
            {receiptItems.length > 0 ? (
              <div className="space-y-2.5 sm:space-y-3">
                {receiptItems.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="rounded-2xl bg-canvas p-3 sm:rounded-3xl sm:p-4">
                    <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(event) => handleReceiptItemChange(index, "name", event.target.value)}
                        className="w-full rounded-xl border border-ink/10 bg-white px-2.5 py-2 text-xs text-ink sm:rounded-2xl sm:px-3 sm:py-3 sm:text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.quantity}
                        onChange={(event) => handleReceiptItemChange(index, "quantity", event.target.value)}
                        className="w-full rounded-xl border border-ink/10 bg-white px-2.5 py-2 text-xs text-ink sm:rounded-2xl sm:px-3 sm:py-3 sm:text-sm"
                      />
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(event) => handleReceiptItemChange(index, "unit", event.target.value)}
                        className="w-full rounded-xl border border-ink/10 bg-white px-2.5 py-2 text-xs text-ink sm:rounded-2xl sm:px-3 sm:py-3 sm:text-sm"
                      />
                      <select
                        value={item.storage}
                        onChange={(event) => handleReceiptItemChange(index, "storage", event.target.value)}
                        className="w-full rounded-xl border border-ink/10 bg-white px-2.5 py-2 text-xs text-ink sm:rounded-2xl sm:px-3 sm:py-3 sm:text-sm"
                      >
                        <option value="Fridge">冷蔵</option>
                        <option value="Freezer">冷凍</option>
                        <option value="Pantry">常温</option>
                      </select>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => void handleReceiptRegister()}
                  className={`${compactButtonClass} bg-ink text-white`}
                >
                  抽出候補をまとめて登録する
                </button>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="AI Sort"
          title="今日の在庫判断"
          description="AI は在庫を変更せず、見る順番だけを提案します。"
        >
          <div className="space-y-2.5 sm:space-y-3">
            <p className="rounded-xl bg-canvas px-3 py-2 text-xs text-ink/70 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
              {insights?.summary ?? "在庫の判断材料を読み込み中..."}
            </p>
            <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="rounded-xl bg-canvas p-3 sm:rounded-2xl sm:p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Use Soon</p>
                <p className="mt-1.5 text-xs text-ink/70 sm:mt-2 sm:text-sm">
                  {insights?.use_soon.length ? insights.use_soon.join(" / ") : "なし"}
                </p>
              </div>
              <div className="rounded-xl bg-canvas p-3 sm:rounded-2xl sm:p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Stock OK</p>
                <p className="mt-1.5 text-xs text-ink/70 sm:mt-2 sm:text-sm">
                  {insights?.stock_ok.length ? insights.stock_ok.join(" / ") : "なし"}
                </p>
              </div>
              <div className="rounded-xl bg-canvas p-3 sm:rounded-2xl sm:p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Watch</p>
                <p className="mt-1.5 text-xs text-ink/70 sm:mt-2 sm:text-sm">
                  {insights?.watchlist.length ? insights.watchlist.join(" / ") : "なし"}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Pantry Recipes"
          title="在庫から料理案を出す"
          description="今ある食材を優先して、次の一食候補をすぐ選べるようにします。"
        >
          <div className="space-y-2.5 sm:space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "朝", value: "Breakfast" as MealContext },
                { label: "昼", value: "Lunch" as MealContext },
                { label: "夜", value: "Dinner" as MealContext }
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMealContext(item.value)}
                  className={`rounded-xl px-3 py-2 text-xs font-medium sm:rounded-full sm:px-4 sm:py-3 sm:text-sm ${
                    mealContext === item.value ? "bg-ink text-white" : "bg-canvas text-ink"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="space-y-2.5 sm:space-y-3">
              {suggestions.map((suggestion) => (
                <article key={suggestion.recipe_id} className="rounded-2xl bg-canvas p-3 sm:rounded-3xl sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{suggestion.name}</p>
                      <p className="mt-1 text-xs text-ink/55">
                        {suggestion.cook_time_minutes} 分 / 不足 {suggestion.buy_count} 件
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-moss">
                      {suggestion.can_cook_now ? "今すぐ作れる" : "少し不足"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-ink/65">{suggestion.agent_message}</p>
                  <p className="mt-2 text-sm text-ink/60">
                    在庫あり: {suggestion.available_items.length > 0 ? suggestion.available_items.join(" / ") : "登録を増やしてください"}
                  </p>
                  <p className="mt-2 text-sm text-ink/60">
                    不足: {suggestion.missing_items.length > 0
                      ? suggestion.missing_items.map((item) => `${item.name} ${item.quantity}${item.unit}`).join(" / ")
                      : "なし"}
                  </p>
                  <Link
                    href="/cooking"
                    className="mt-3 block rounded-xl bg-ink px-3 py-2.5 text-center text-sm font-medium text-white sm:rounded-full sm:px-4 sm:py-3"
                  >
                    この候補で記録画面へ
                  </Link>
                </article>
              ))}
              {suggestions.length === 0 ? (
                <p className="rounded-xl bg-canvas px-3 py-4 text-center text-xs text-ink/55 sm:rounded-2xl sm:px-4 sm:py-6 sm:text-sm">
                  候補を準備中です。
                </p>
              ) : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Current Stock"
          title="在庫一覧"
          description="期限が近いものを先に見て、不要ならすぐ削除します。"
        >
          <div className="space-y-2.5 sm:space-y-3">
            <input
              type="text"
              placeholder="食材名で検索"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={compactFieldClass}
            />
            {expiringSoon.length > 0 ? (
              <div className="rounded-xl bg-peach px-3 py-2 text-xs text-ink/70 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
                期限が近い食材: {expiringSoon.map((item) => item.name).join(" / ")}
              </div>
            ) : null}
            <div className="space-y-2.5 sm:space-y-3">
              {items.map((item) => (
                <article key={item.id} className="rounded-2xl bg-canvas p-3 sm:rounded-3xl sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.name}</p>
                      <p className="mt-1 text-xs text-ink/55">
                        {item.quantity} {item.unit} / {item.storage}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 sm:rounded-full sm:px-3"
                    >
                      削除
                    </button>
                  </div>
                  {item.expires_on ? (
                    <p className="mt-3 text-sm text-ink/65">期限: {item.expires_on}</p>
                  ) : null}
                  {item.note ? <p className="mt-2 text-sm text-ink/60">{item.note}</p> : null}
                </article>
              ))}
              {items.length === 0 ? (
                <p className="rounded-xl bg-canvas px-3 py-4 text-center text-xs text-ink/55 sm:rounded-2xl sm:px-4 sm:py-6 sm:text-sm">
                  条件に合う在庫がありません。
                </p>
              ) : null}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 lg:mt-6">
        <BottomNav />
      </div>
    </main>
  );
}
