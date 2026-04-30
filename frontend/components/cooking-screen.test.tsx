import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { CookingScreen } from "./cooking-screen";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/cooking"
}));

vi.mock("@/lib/api", () => ({
  createCookingLog: vi.fn(),
  updateCookingLog: vi.fn(),
  deleteCookingLog: vi.fn(),
  getCookingAssist: vi.fn().mockResolvedValue({
    menu_summary: "Pasta の下書きです。",
    suggested_calories: 500,
    note_hint: "具材を記録する。",
    next_tip: "量を残すと比較しやすい。",
    generated_by: "fallback"
  }),
  getCookingLogsWithFilters: vi.fn().mockResolvedValue([
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
  ])
}));

describe("CookingScreen", () => {
  it("renders filters and history", async () => {
    render(<CookingScreen />);

    await waitFor(() => {
      expect(screen.getByText("履歴")).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText("メニュー名やメモで検索")).toBeInTheDocument();
    expect(screen.getByText("削除")).toBeInTheDocument();
    expect(screen.getByText("AIで下書きを補助する")).toBeInTheDocument();
  });
});
