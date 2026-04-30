import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { WeatherScreen } from "./weather-screen";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/weather"
}));

vi.mock("@/lib/api", () => ({
  getWeatherData: vi.fn().mockResolvedValue({
    location: "Tokyo",
    current_temperature: 20,
    feels_like: 18,
    summary: "Afternoon rain expected",
    timeline: [{ hour: "09:00", condition: "Sunny", temperature: 20 }],
    daily_forecast: [{ date: "2026-03-23", label: "Today", high: 23, low: 18, condition: "Rain" }]
  })
}));

describe("WeatherScreen", () => {
  it("renders daily forecast section", async () => {
    render(<WeatherScreen />);

    await waitFor(() => {
      expect(screen.getByText("日別見通し")).toBeInTheDocument();
    });

    expect(screen.getByText("Today")).toBeInTheDocument();
  });
});
