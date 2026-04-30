export type CookingLog = {
  id: number;
  meal: string;
  menu: string;
  calories: number;
  status: string;
  cooked_on: string;
  note: string;
  photo_url: string;
  updated_at: string;
};

export type CookingLogInput = {
  meal: string;
  menu: string;
  calories: string;
  status: string;
  cookedOn: string;
  note: string;
  photo: File | null;
};

export type WeatherTimelineItem = {
  hour: string;
  temperature: number;
  condition: string;
};

export type DashboardData = {
  date: string;
  location: string;
  weather: WeatherData;
  cookingLogs: CookingLog[];
  quickActions: string[];
  pantrySummary: PantrySummary;
  plannerHighlight: PlannerHighlight;
  dailyFocus: DailyFocus;
};

export type WeatherData = {
  location: string;
  current_temperature: number;
  feels_like: number;
  summary: string;
  timeline: WeatherTimelineItem[];
  daily_forecast: Array<{
    date: string;
    label: string;
    high: number;
    low: number;
    condition: string;
  }>;
};

export type PantryItem = {
  id: number;
  ingredient_id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  storage: string;
  purchased_on: string;
  expires_on: string;
  note: string;
  updated_at: string;
};

export type PantryItemInput = {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  storage: string;
  purchasedOn: string;
  expiresOn: string;
  note: string;
};

export type ReceiptParsedItem = {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  storage: string;
  note: string;
};

export type RecipeIngredient = {
  ingredient_id: number;
  name: string;
  quantity: number;
  unit: string;
  is_optional: boolean;
};

export type Recipe = {
  id: number;
  name: string;
  meal: string;
  summary: string;
  cook_time_minutes: number;
  servings: number;
  tags: string[];
  instructions: string;
  ingredients: RecipeIngredient[];
};

export type Suggestion = {
  recipe_id: number;
  name: string;
  meal: string;
  meal_context: string;
  summary: string;
  cook_time_minutes: number;
  servings: number;
  score: number;
  can_cook_now: boolean;
  available_items: string[];
  missing_items: Array<{
    ingredient_id: number;
    name: string;
    quantity: number;
    unit: string;
  }>;
  buy_count: number;
  agent_message: string;
};

export type ShoppingPlan = {
  recipes: Array<{
    id: number;
    name: string;
  }>;
  items: Array<{
    ingredient_id: number;
    name: string;
    unit: string;
    quantity: number;
    recipes: string[];
    suggested_purchase_quantity: number;
  }>;
};

export type PantrySummary = {
  total_items: number;
  expiring_soon_count: number;
  expiring_soon_names: string[];
};

export type PlannerHighlight = {
  title: string;
  message: string;
  buy_count?: number;
};

export type DailyFocus = {
  title: string;
  reason: string;
  action_label: string;
  action_path: string;
  generated_by: string;
};

export type PantryInsights = {
  summary: string;
  use_soon: string[];
  stock_ok: string[];
  watchlist: string[];
  generated_by: string;
};

export type CookingAssist = {
  menu_summary: string;
  suggested_calories: number;
  note_hint: string;
  next_tip: string;
  generated_by: string;
};

export type SuggestionMode = "pantry" | "balance";
export type MealContext = "Breakfast" | "Lunch" | "Dinner";
