import type {
  CookingLog,
  CookingLogInput,
  DashboardData,
  PantryItem,
  PantryItemInput,
  ReceiptParsedItem,
  Recipe,
  MealContext,
  ShoppingPlan,
  Suggestion,
  SuggestionMode,
  PantryInsights,
  CookingAssist,
  WeatherData
} from "@/types/dashboard";

const apiBaseUrl = process.env.NEXT_PUBLIC_DASHBOARD_API_BASE_URL ?? "/api/backend";

function buildApiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

export function resolveMediaUrl(path: string): string {
  if (!path) {
    return "";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return buildApiUrl(path);
}

function buildQuickActions(summary: string): string[] {
  return ["食材在庫を確認", "今日の献立を登録", summary.includes("rain") ? "洗濯タイミングを見る" : "買い物に行く"];
}

export async function getDashboardData(): Promise<DashboardData> {
  const response = await fetch(buildApiUrl("/dashboard"), {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard data: ${response.status}`);
  }

  const data = await response.json();

  return {
    date: data.date,
    location: data.location,
    weather: data.weather,
    cookingLogs: data.cooking_logs,
    quickActions: buildQuickActions(String(data.weather.summary).toLowerCase()),
    pantrySummary: data.pantry_summary,
    plannerHighlight: data.planner_highlight,
    dailyFocus: data.daily_focus
  };
}

export async function getCookingLogs(): Promise<CookingLog[]> {
  return getCookingLogsWithFilters();
}

export async function getCookingLogsWithFilters(filters?: {
  meal?: string;
  status?: string;
  cookedOn?: string;
  query?: string;
}): Promise<CookingLog[]> {
  const searchParams = new URLSearchParams();
  if (filters?.meal) searchParams.set("meal", filters.meal);
  if (filters?.status) searchParams.set("status", filters.status);
  if (filters?.cookedOn) searchParams.set("cooked_on", filters.cookedOn);
  if (filters?.query) searchParams.set("query", filters.query);

  const queryString = searchParams.toString();
  const filteredResponse = await fetch(
    buildApiUrl(`/cooking-logs${queryString ? `?${queryString}` : ""}`),
    { cache: "no-store" }
  );

  if (!filteredResponse.ok) {
    throw new Error(`Failed to fetch cooking logs: ${filteredResponse.status}`);
  }

  const data = await filteredResponse.json();
  return data.cooking_logs;
}

export async function deleteCookingLog(id: number): Promise<void> {
  const response = await fetch(buildApiUrl(`/cooking-logs/${id}`), {
    method: "DELETE",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to delete cooking log: ${response.status}`);
  }
}

export async function getWeatherData(): Promise<WeatherData> {
  const response = await fetch(buildApiUrl("/weather"), {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch weather data: ${response.status}`);
  }

  return response.json();
}

export async function createCookingLog(input: CookingLogInput): Promise<CookingLog> {
  const formData = buildCookingLogFormData(input);

  const response = await fetch(buildApiUrl("/cooking-logs"), {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Failed to create cooking log: ${response.status}`);
  }

  return response.json();
}

export async function updateCookingLog(id: number, input: CookingLogInput): Promise<CookingLog> {
  const formData = buildCookingLogFormData(input);

  const response = await fetch(buildApiUrl(`/cooking-logs/${id}`), {
    method: "PUT",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Failed to update cooking log: ${response.status}`);
  }

  return response.json();
}

export async function getPantryItems(filters?: {
  storage?: string;
  query?: string;
}): Promise<PantryItem[]> {
  const searchParams = new URLSearchParams();
  if (filters?.storage) searchParams.set("storage", filters.storage);
  if (filters?.query) searchParams.set("query", filters.query);
  const queryString = searchParams.toString();

  const response = await fetch(buildApiUrl(`/pantry-items${queryString ? `?${queryString}` : ""}`), {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch pantry items: ${response.status}`);
  }

  const data = await response.json();
  return data.pantry_items;
}

export async function createPantryItem(input: PantryItemInput): Promise<PantryItem> {
  const response = await fetch(buildApiUrl("/pantry-items"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: input.name,
      category: input.category,
      quantity: Number(input.quantity),
      unit: input.unit,
      storage: input.storage,
      purchased_on: input.purchasedOn,
      expires_on: input.expiresOn,
      note: input.note
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create pantry item: ${response.status}`);
  }

  return response.json();
}

export async function deletePantryItem(id: number): Promise<void> {
  const response = await fetch(buildApiUrl(`/pantry-items/${id}`), {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(`Failed to delete pantry item: ${response.status}`);
  }
}

export async function importReceiptPantryItems(receipt: File): Promise<{
  parsedItems: ReceiptParsedItem[];
  warnings: string[];
}> {
  const formData = new FormData();
  formData.append("receipt", receipt);

  const response = await fetch(buildApiUrl("/pantry-items/import-receipt"), {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Failed to import receipt: ${response.status}`);
  }

  const data = await response.json();
  return {
    parsedItems: data.parsed_items,
    warnings: data.warnings
  };
}

export async function getRecipes(query?: string): Promise<Recipe[]> {
  const queryString = query ? `?query=${encodeURIComponent(query)}` : "";
  const response = await fetch(buildApiUrl(`/recipes${queryString}`), {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch recipes: ${response.status}`);
  }

  const data = await response.json();
  return data.recipes;
}

export async function getSuggestions(input: {
  mode: SuggestionMode;
  mealContext?: MealContext;
  query?: string;
}): Promise<Suggestion[]> {
  const response = await fetch(buildApiUrl("/suggestions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      mode: input.mode,
      meal_context: input.mealContext,
      query: input.query
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch suggestions: ${response.status}`);
  }

  const data = await response.json();
  return data.suggestions;
}

export async function getShoppingPlan(recipeIds: number[]): Promise<ShoppingPlan> {
  const response = await fetch(buildApiUrl("/shopping-plan"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ recipe_ids: recipeIds }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch shopping plan: ${response.status}`);
  }

  return response.json();
}

export async function getPantryInsights(): Promise<PantryInsights> {
  const response = await fetch(buildApiUrl("/agent/pantry-insights"), {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch pantry insights: ${response.status}`);
  }

  return response.json();
}

export async function getCookingAssist(input: {
  meal: string;
  menu: string;
  note: string;
  cookedOn: string;
}): Promise<CookingAssist> {
  const response = await fetch(buildApiUrl("/agent/cooking-assist"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      meal: input.meal,
      menu: input.menu,
      note: input.note,
      cooked_on: input.cookedOn
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch cooking assist: ${response.status}`);
  }

  return response.json();
}

function buildCookingLogFormData(input: CookingLogInput): FormData {
  const formData = new FormData();
  formData.append("meal", input.meal);
  formData.append("menu", input.menu);
  formData.append("calories", input.calories);
  formData.append("status", input.status);
  formData.append("cooked_on", input.cookedOn);
  formData.append("note", input.note);
  if (input.photo) {
    formData.append("photo", input.photo);
  }
  return formData;
}
