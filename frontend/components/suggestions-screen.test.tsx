import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { SuggestionsScreen } from "./suggestions-screen";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/suggestions"
}));

vi.mock("@/lib/api", () => ({
  getSuggestions: vi.fn().mockResolvedValue([
    {
      recipe_id: 1,
      name: "親子丼",
      meal: "Dinner",
      meal_context: "Dinner",
      summary: "summary",
      cook_time_minutes: 20,
      servings: 2,
      score: 0.9,
      can_cook_now: true,
      available_items: ["Egg", "Chicken breast"],
      missing_items: [],
      buy_count: 0,
      agent_message: "在庫起点で良い候補です。"
    }
  ])
}));

describe("SuggestionsScreen", () => {
  it("renders suggestion card", async () => {
    render(<SuggestionsScreen />);

    await waitFor(() => {
      expect(screen.getByText("会話で献立を決める")).toBeInTheDocument();
    });

    expect(screen.getByText("親子丼")).toBeInTheDocument();
  });
});
