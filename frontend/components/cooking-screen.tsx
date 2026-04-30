"use client";

import React from "react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { BottomNav } from "@/components/bottom-nav";
import {
  createCookingLog,
  deleteCookingLog,
  getCookingAssist,
  getCookingLogsWithFilters,
  updateCookingLog
} from "@/lib/api";
import { Toast } from "@/components/toast";
import type { CookingAssist, CookingLog, CookingLogInput } from "@/types/dashboard";

function createInitialFormState(): CookingLogInput {
  return {
    meal: "Dinner",
    menu: "",
    calories: "",
    status: "logged",
    cookedOn: new Date().toISOString().slice(0, 10),
    note: "",
    photo: null
  };
}

export function CookingScreen() {
  const [cookingLogs, setCookingLogs] = useState<CookingLog[]>([]);
  const [assist, setAssist] = useState<CookingAssist | null>(null);
  const [formState, setFormState] = useState<CookingLogInput>(createInitialFormState());
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssisting, setIsAssisting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [filters, setFilters] = useState({
    cookedOn: "",
    query: ""
  });

  const loadCookingLogs = async () => {
    try {
      setErrorMessage(null);
      const data = await getCookingLogsWithFilters(filters);
      setCookingLogs(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  useEffect(() => {
    void loadCookingLogs();
  }, [filters]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToastMessage(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const handleFieldChange = (
    field: keyof Omit<CookingLogInput, "photo">,
    value: string
  ) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      if (editingLogId) {
        await updateCookingLog(editingLogId, formState);
        setToastMessage("自炊記録を更新しました");
      } else {
        await createCookingLog(formState);
        setToastMessage("自炊記録を追加しました");
      }
      setFormState(createInitialFormState());
      setEditingLogId(null);
      setAssist(null);
      void loadCookingLogs();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (log: CookingLog) => {
    setEditingLogId(log.id);
    setFormState({
      meal: log.meal,
      menu: log.menu,
      calories: String(log.calories),
      status: log.status,
      cookedOn: log.cooked_on,
      note: log.note,
      photo: null
    });
  };

  const handleDelete = async (logId: number) => {
    try {
      await deleteCookingLog(logId);
      setToastMessage("自炊記録を削除しました");
      if (editingLogId === logId) {
        handleCancelEdit();
      }
      void loadCookingLogs();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setFormState(createInitialFormState());
    setAssist(null);
  };

  const handleAssist = async () => {
    try {
      setIsAssisting(true);
      setErrorMessage(null);
      const result = await getCookingAssist({
        meal: formState.meal,
        menu: formState.menu,
        note: formState.note,
        cookedOn: formState.cookedOn
      });
      setAssist(result);
      setFormState((current) => ({
        ...current,
        calories: current.calories || String(result.suggested_calories),
        note: current.note || result.note_hint
      }));
      setToastMessage("AI 下書きを反映しました");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsAssisting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      {toastMessage ? <Toast message={toastMessage} /> : null}
      <div className="rounded-[32px] bg-moss px-5 pb-6 pt-5 text-white shadow-soft sm:px-6 lg:px-7">
        <p className="text-sm text-white/70">Cooking Detail</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight">自炊記録の詳細</h1>
            <p className="mt-2 text-sm leading-6 text-white/75">
              クイック入力と履歴の見直しだけに絞っています。
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white/15 px-3 py-2 text-sm font-medium text-white"
          >
            戻る
          </Link>
        </div>
      </div>

      <div className="-mt-5 grid gap-4 lg:grid-cols-[0.95fr,1.05fr] lg:items-start">
        <section className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-soft">
          <h2 className="text-xl font-semibold text-ink">
            {editingLogId ? "記録を編集" : "記録を追加"}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm text-ink/70">
                <span>食事区分</span>
                <select
                  value={formState.meal}
                  onChange={(event) => handleFieldChange("meal", event.target.value)}
                  className="w-full rounded-2xl border border-ink/10 bg-canvas px-3 py-3 text-sm text-ink"
                >
                  <option value="Breakfast">朝食</option>
                  <option value="Lunch">昼食</option>
                  <option value="Dinner">夕食</option>
                  <option value="Snack">間食</option>
                </select>
              </label>
              <label className="space-y-1 text-sm text-ink/70">
                <span>日付</span>
                <input
                  type="date"
                  value={formState.cookedOn}
                  onChange={(event) => handleFieldChange("cookedOn", event.target.value)}
                  className="w-full rounded-2xl border border-ink/10 bg-canvas px-3 py-3 text-sm text-ink"
                />
              </label>
            </div>
            <label className="space-y-1 text-sm text-ink/70">
              <span>メニュー名</span>
              <input
                type="text"
                value={formState.menu}
                onChange={(event) => handleFieldChange("menu", event.target.value)}
                className="w-full rounded-2xl border border-ink/10 bg-canvas px-3 py-3 text-sm text-ink"
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm text-ink/70">
                <span>カロリー</span>
                <input
                  type="number"
                  min="0"
                  value={formState.calories}
                  onChange={(event) => handleFieldChange("calories", event.target.value)}
                  className="w-full rounded-2xl border border-ink/10 bg-canvas px-3 py-3 text-sm text-ink"
                  required
                />
              </label>
              <label className="space-y-1 text-sm text-ink/70">
                <span>状態</span>
                <select
                  value={formState.status}
                  onChange={(event) => handleFieldChange("status", event.target.value)}
                  className="w-full rounded-2xl border border-ink/10 bg-canvas px-3 py-3 text-sm text-ink"
                >
                  <option value="planned">予定</option>
                  <option value="preparing">準備中</option>
                  <option value="logged">記録済み</option>
                </select>
              </label>
            </div>
            <label className="space-y-1 text-sm text-ink/70">
              <span>メモ</span>
              <textarea
                rows={2}
                value={formState.note}
                onChange={(event) => handleFieldChange("note", event.target.value)}
                className="w-full rounded-2xl border border-ink/10 bg-canvas px-3 py-3 text-sm text-ink"
              />
            </label>
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            <button
              type="button"
              onClick={() => void handleAssist()}
              disabled={isAssisting || !formState.menu.trim()}
              className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-sm font-medium text-ink disabled:opacity-50"
            >
              {isAssisting ? "AI 作成中..." : "AIで下書きを補助する"}
            </button>
            {assist ? (
              <div className="rounded-2xl bg-canvas px-4 py-4 text-sm text-ink/70">
                <p className="font-medium text-ink">{assist.menu_summary}</p>
                <p className="mt-2">提案カロリー: {assist.suggested_calories} kcal</p>
                <p className="mt-2">メモ案: {assist.note_hint}</p>
                <p className="mt-2">次回の見直し: {assist.next_tip}</p>
              </div>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-ink px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSubmitting ? "保存中..." : editingLogId ? "更新する" : "追加する"}
            </button>
            {editingLogId ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-sm font-medium text-ink"
              >
                編集をキャンセル
              </button>
            ) : null}
          </form>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink">履歴</h2>
            <p className="text-sm text-ink/55">{cookingLogs.length} 件</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="メニュー名やメモで検索"
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              className="rounded-2xl border border-ink/10 bg-canvas px-3 py-3 text-sm text-ink"
            />
            <input
              type="date"
              value={filters.cookedOn}
              onChange={(event) => setFilters((current) => ({ ...current, cookedOn: event.target.value }))}
              className="rounded-2xl border border-ink/10 bg-canvas px-3 py-3 text-sm text-ink"
            />
          </div>
          <div className="mt-4 space-y-3">
            {cookingLogs
              .slice()
              .reverse()
              .map((log) => (
                <article key={log.id} className="rounded-3xl bg-canvas p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{log.menu}</p>
                      <p className="mt-1 text-xs text-ink/55">
                        {log.meal} / {log.cooked_on}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(log)}
                        className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-medium text-ink"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(log.id)}
                        className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-ink/65">{log.calories} kcal</p>
                  {log.note ? <p className="mt-2 text-sm text-ink/60">{log.note}</p> : null}
                </article>
              ))}
            {cookingLogs.length === 0 ? (
              <p className="rounded-2xl bg-canvas px-4 py-6 text-center text-sm text-ink/55">
                条件に合う自炊記録がありません。
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-5 lg:mt-6">
        <BottomNav />
      </div>
    </main>
  );
}
