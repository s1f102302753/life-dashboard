import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { DashboardScreen } from "./dashboard-screen";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

vi.mock("@/lib/api", () => ({
  getDashboardData: vi.fn().mockResolvedValue({
    date: "2026-03-23",
    location: "Tokyo",
    weather: {
      location: "Tokyo",
      current_temperature: 20,
      feels_like: 18,
      summary: "Afternoon rain expected",
      timeline: [
        { hour: "09:00", condition: "Sunny", temperature: 20 },
        { hour: "15:00", condition: "Rain", temperature: 22 }
      ],
      daily_forecast: [
        { date: "2026-03-23", label: "Today", high: 23, low: 18, condition: "Rain" }
      ]
    },
    cookingLogs: [
      {
        id: 1,
        meal: "Dinner",
        menu: "Pasta",
        calories: 500,
        status: "logged",
        cooked_on: "2026-03-23",
        note: "memo",
        photo_url: "",
        updated_at: "2026-03-23T10:30:00+09:00"
      }
    ],
    quickActions: [],
    pantrySummary: {
      total_items: 8,
      expiring_soon_count: 2,
      expiring_soon_names: ["Egg", "Chicken breast"]
    },
    plannerHighlight: {
      title: "親子丼",
      message: "在庫起点で良い候補です。",
      buy_count: 0
    },
    dailyFocus: {
      title: "期限が近い在庫を使う",
      reason: "Egg を先に使うべきです。",
      action_label: "在庫を確認する",
      action_path: "/pantry",
      generated_by: "fallback"
    }
  })
}));

describe("DashboardScreen", () => {
  it("renders summary links after loading", async () => {
    render(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText("記録を追加・見直す")).toBeInTheDocument();
    });

    expect(screen.getByText("食材を記録する")).toBeInTheDocument();
    expect(screen.getByText("Rain Start")).toBeInTheDocument();
  });
});
