"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { getWeatherData } from "@/lib/api";
import type { WeatherData } from "@/types/dashboard";

function translateCondition(condition: string) {
  if (condition === "Sunny") return "晴";
  if (condition === "Cloudy") return "薄曇";
  if (condition === "Rain") return "雨";
  return condition;
}

export function WeatherScreen() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        setErrorMessage(null);
        const data = await getWeatherData();
        setWeather(data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      }
    };

    void loadWeather();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      <div className="rounded-[32px] bg-peach px-5 pb-6 pt-5 text-ink shadow-soft sm:px-6 lg:px-7">
        <p className="text-sm text-ink/60">Weather Detail</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight">天気の詳細</h1>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              時間帯ごとの変化を見て、買い物や洗濯の判断に使います。
            </p>
          </div>
          <Link href="/" className="rounded-full bg-white/60 px-3 py-2 text-sm font-medium">
            戻る
          </Link>
        </div>
      </div>

      <div className="-mt-5 space-y-4">
        <section className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-soft sm:p-6">
          {errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : weather ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-ink/55">現在地</p>
                  <p className="mt-1 text-xl font-semibold text-ink">{weather.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-semibold text-ink">
                    {weather.current_temperature}°
                  </p>
                  <p className="text-sm text-ink/55">体感 {weather.feels_like}°</p>
                </div>
              </div>
              <p className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-sm text-ink/70">
                {weather.summary}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {weather.timeline.map((item) => (
                  <div
                    key={item.hour}
                    className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3 sm:flex-col sm:items-start sm:gap-2"
                  >
                    <p className="text-sm font-medium text-ink">{item.hour}</p>
                    <p className="text-sm text-moss">{translateCondition(item.condition)}</p>
                    <p className="text-sm font-medium text-ink">{item.temperature}°</p>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <p className="text-sm font-semibold text-ink">日別見通し</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {weather.daily_forecast.map((item) => (
                    <div key={item.date} className="rounded-2xl bg-canvas px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink/45">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-moss">
                        {translateCondition(item.condition)}
                      </p>
                      <p className="mt-1 text-sm text-ink/60">
                        最高 {item.high}° / 最低 {item.low}°
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink/60">読み込み中...</p>
          )}
        </section>
      </div>

      <div className="mt-5 lg:mt-6">
        <BottomNav />
      </div>
    </main>
  );
}
