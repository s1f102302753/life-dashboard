import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { PantryScreen } from "./pantry-screen";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pantry"
}));

vi.mock("@/lib/api", () => ({
  getPantryItems: vi.fn().mockResolvedValue([
    {
      id: 1,
      ingredient_id: 1,
      name: "Egg",
      category: "Protein",
      quantity: 4,
      unit: "piece",
      storage: "Fridge",
      purchased_on: "2026-03-25",
      expires_on: "2026-03-27",
      note: "",
      updated_at: "2026-03-25T00:00:00+09:00"
    }
  ]),
  getPantryInsights: vi.fn().mockResolvedValue({
    summary: "期限順に整理しています。",
    use_soon: ["Egg"],
    stock_ok: ["Salt"],
    watchlist: ["Chicken"],
    generated_by: "fallback"
  }),
  getSuggestions: vi.fn().mockResolvedValue([
    {
      recipe_id: 1,
      name: "親子丼",
      meal: "Dinner",
      meal_context: "Dinner",
      summary: "卵と鶏肉を使う定番メニューです。",
      cook_time_minutes: 15,
      servings: 2,
      score: 0.9,
      can_cook_now: true,
      available_items: ["Egg", "Chicken"],
      missing_items: [],
      buy_count: 0,
      agent_message: "在庫優先で作りやすい候補です。"
    }
  ]),
  importReceiptPantryItems: vi.fn().mockResolvedValue({
    parsedItems: [],
    warnings: []
  }),
  createPantryItem: vi.fn(),
  deletePantryItem: vi.fn()
}));

describe("PantryScreen", () => {
  it("renders pantry heading and seeded item", async () => {
    render(<PantryScreen />);

    await waitFor(() => {
      expect(screen.getByText("在庫一覧")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Egg").length).toBeGreaterThan(0);
    expect(screen.getByText("今日の在庫判断")).toBeInTheDocument();
    expect(screen.getByText("在庫から料理案を出す")).toBeInTheDocument();
    expect(screen.getByText("レシートを撮影して登録")).toBeInTheDocument();
  });
});
