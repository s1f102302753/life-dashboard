"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { ProgressRing } from "@/components/progress-ring";
import { SectionCard } from "@/components/section-card";
import { getDashboardData } from "@/lib/api";
import type { DashboardData } from "@/types/dashboard";

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function translateCondition(condition: string) {
  if (condition === "Sunny") return "晴";
  if (condition === "Cloudy") return "薄曇";
  if (condition === "Rain") return "雨";
  return condition;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function mealLabel(value: string) {
  if (value === "Breakfast") return "朝";
  if (value === "Lunch") return "昼";
  if (value === "Dinner") return "夜";
  return value;
}

export function DashboardScreen() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setErrorMessage(null);
        const data = await getDashboardData();
        setDashboardData(data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      }
    };

    void loadDashboard();
  }, []);

  if (errorMessage) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-[32px] bg-peach px-5 pb-8 pt-5 text-ink shadow-soft sm:px-6">
          <p className="text-sm text-ink/60">Data Error</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">情報の取得に失敗しました</h1>
          <p className="mt-3 text-sm leading-6 text-ink/70">{errorMessage}</p>
        </div>
      </main>
    );
  }

  if (!dashboardData) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-[32px] bg-moss px-5 pb-10 pt-5 text-white shadow-soft sm:px-6">
          <p className="text-sm text-white/70">Loading</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">ダッシュボードを取得中</h1>
        </div>
      </main>
    );
  }

  const recentLogs = [...dashboardData.cookingLogs].slice(-3).reverse();
  const loggedCount = recentLogs.filter((log) => log.status === "logged").length;
  const latestLog = recentLogs[0];
  const completedMeals = recentLogs.filter((log) => log.status === "logged");
  const rainSlot = dashboardData.weather.timeline.find((item) => item.condition === "Rain");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[32px] bg-moss px-5 pb-6 pt-5 text-white shadow-soft sm:px-6 lg:px-7">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-6 bottom-3 h-20 w-20 rounded-full bg-gold/20 blur-2xl" />
        <div className="relative">
          <p className="text-sm text-white/70">{formatDateLabel(dashboardData.date)}</p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold leading-tight">
                生活をひとつに
                <br />
                まとめる
              </h1>
              <p className="mt-2 text-sm leading-6 text-white/75">
                今日やることだけを先に見て、入力は在庫と記録に集約します。
              </p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                まずは食事記録と期限の近い在庫だけを確認。
              </p>
            </div>
            <div className="rounded-full bg-white/15 px-3 py-1 text-sm">
              {dashboardData.location}
            </div>
          </div>
        </div>
      </div>

      <div className="-mt-5 grid gap-4 lg:grid-cols-[1.15fr,0.85fr] lg:items-start">
        <SectionCard
          eyebrow="Daily Snapshot"
          title="今日のコンディション"
          description="スマホで 5 秒以内に把握できる情報量に絞っています。"
        >
          <div className="space-y-3">
            <ProgressRing value={Math.min(100, Math.round((loggedCount / 3) * 100))} label="三食の記録状況" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-leaf p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-moss/60">Cook</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{loggedCount}/3</p>
                <p className="mt-1 text-sm text-ink/60">直近三食の記録</p>
              </div>
              <div className="rounded-3xl bg-peach p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Weather</p>
                <p className="mt-2 text-2xl font-semibold text-ink">
                  {dashboardData.weather.current_temperature}°
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  {rainSlot ? `${rainSlot.hour}ごろに雨の可能性` : dashboardData.weather.summary}
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Last Log</p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {latestLog ? formatUpdatedAt(latestLog.updated_at) : "--:--"}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Next Meal</p>
                <p className="mt-2 text-sm font-semibold text-ink">{dashboardData.plannerHighlight.title}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Rain Start</p>
                <p className="mt-2 text-sm font-semibold text-ink">{rainSlot?.hour ?? "なし"}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard
            eyebrow="AI Focus"
            title="今日やること"
            description="AI が今日の入力状況から、次の 1 手だけを選びます。"
          >
            <div className="space-y-3">
              <div className="rounded-[28px] bg-canvas p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Focus</p>
                <p className="mt-2 text-xl font-semibold text-ink">{dashboardData.dailyFocus.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/65">
                  {dashboardData.dailyFocus.reason}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Pantry</p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {dashboardData.pantrySummary.total_items} 件
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Expiring Soon</p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {dashboardData.pantrySummary.expiring_soon_count} 件
                  </p>
                </div>
              </div>
              {dashboardData.pantrySummary.expiring_soon_names.length > 0 ? (
                <p className="rounded-2xl bg-white px-4 py-3 text-sm text-ink/65">
                  先に使う: {dashboardData.pantrySummary.expiring_soon_names.join(" / ")}
                </p>
              ) : (
                <p className="rounded-2xl bg-white px-4 py-3 text-sm text-ink/65">
                  期限が近い在庫はありません。
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-1">
                <Link
                  href="/pantry"
                  className="block rounded-full bg-ink px-4 py-3 text-center text-sm font-medium text-white"
                >
                  食材を記録する
                </Link>
                <p className="text-xs text-ink/45">
                  AI提案: {dashboardData.dailyFocus.action_label} / {dashboardData.dailyFocus.generated_by === "openai" ? "AI" : "ルールベース"}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Cooking"
            title="自炊記録"
            description="メインは直近三食だけを表示し、入力や編集は詳細画面に分けます。"
          >
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <article key={log.id} className="rounded-3xl bg-canvas p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{log.menu}</p>
                      <p className="mt-1 text-xs text-ink/55">
                        {mealLabel(log.meal)} / {log.cooked_on}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-moss">
                      {log.status === "logged" ? "記録済み" : "未完了"}
                    </span>
                  </div>
                </article>
              ))}
              {latestLog ? (
                <p className="text-sm text-ink/60">
                  最新の記録: {latestLog.menu}
                  {latestLog.note ? ` / ${latestLog.note}` : ""}
                </p>
              ) : null}
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-ink/60">
                完了 {completedMeals.length} 件 / 最終更新 {latestLog ? formatUpdatedAt(latestLog.updated_at) : "--:--"}
              </div>
              <Link
                href="/cooking"
                className="block w-full rounded-full bg-ink px-4 py-3 text-center text-sm font-medium text-white"
              >
                記録を追加・見直す
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="mt-5 lg:mt-6">
        <BottomNav />
      </div>
    </main>
  );
}
