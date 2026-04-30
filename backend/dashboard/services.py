from collections import defaultdict
from datetime import date, timedelta
from math import ceil

from django.utils import timezone

from dashboard.models import CookingLog, Ingredient, PantryItem, Recipe, RecipeIngredient

MEAL_ORDER = ["Breakfast", "Lunch", "Dinner"]
MEAL_LABELS = {
    "Breakfast": "朝",
    "Lunch": "昼",
    "Dinner": "夜",
}
PROFILE_KEYWORDS = {
    "protein": ["egg", "chicken", "salmon", "tofu", "cheese", "milk", "miso"],
    "vegetable": ["salad", "onion", "carrot", "cabbage", "spinach", "tomato", "potato", "soup"],
    "staple": ["rice", "pasta", "bowl", "bread", "noodle", "omelet", "gratin"],
}


def build_default_cooking_logs(target_date: date) -> list[dict]:
    return [
        {
            "id": 0,
            "meal": "Breakfast",
            "menu": "Salmon rice ball and miso soup",
            "calories": 420,
            "status": "logged",
            "cooked_on": target_date.isoformat(),
            "note": "朝の定番。味噌汁にねぎを追加。",
            "photo_url": "",
            "updated_at": f"{target_date.isoformat()}T08:00:00+09:00",
        },
        {
            "id": -1,
            "meal": "Lunch",
            "menu": "Chicken salad bowl",
            "calories": 560,
            "status": "preparing",
            "cooked_on": target_date.isoformat(),
            "note": "作り置きの鶏むね肉を活用。",
            "photo_url": "",
            "updated_at": f"{target_date.isoformat()}T12:00:00+09:00",
        },
    ]


def get_pantry_totals() -> dict[int, float]:
    totals: dict[int, float] = defaultdict(float)
    for item in PantryItem.objects.select_related("ingredient").all():
        totals[item.ingredient_id] += item.quantity
    return totals


def build_pantry_summary(target_date: date) -> dict:
    items = PantryItem.objects.select_related("ingredient").all()
    expiring_soon = [
        item
        for item in items
        if item.expires_on and item.expires_on <= target_date + timedelta(days=2)
    ]
    return {
        "total_items": items.count(),
        "expiring_soon_count": len(expiring_soon),
        "expiring_soon_names": [item.ingredient.name for item in expiring_soon[:3]],
    }


def resolve_meal_context(requested_meal: str | None = None) -> str:
    if requested_meal in MEAL_ORDER:
        return requested_meal

    current_hour = timezone.localtime().hour
    if current_hour < 11:
        return "Breakfast"
    if current_hour < 16:
        return "Lunch"
    return "Dinner"


def get_recent_cooking_logs(target_date: date) -> list[dict]:
    queryset = CookingLog.objects.filter(
        cooked_on__gte=target_date - timedelta(days=6)
    ).order_by("-cooked_on", "-updated_at")
    serialized = [
        {
            "meal": log.meal,
            "menu": log.menu,
            "calories": log.calories,
            "status": log.status,
            "cooked_on": log.cooked_on,
            "note": log.note,
        }
        for log in queryset
    ]
    if serialized:
        return serialized

    fallback = []
    for log in build_default_cooking_logs(target_date):
        fallback.append(
            {
                "meal": log["meal"],
                "menu": log["menu"],
                "calories": log["calories"],
                "status": log["status"],
                "cooked_on": target_date,
                "note": log["note"],
            }
        )
    return fallback


def derive_log_profile(menu: str, note: str) -> set[str]:
    text = f"{menu} {note}".lower()
    profile = set()
    for category, keywords in PROFILE_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            profile.add(category)
    return profile


def derive_recipe_profile(recipe: Recipe) -> set[str]:
    profile = set()
    for link in recipe.ingredients.select_related("ingredient").all():
        ingredient_name = link.ingredient.name.lower()
        ingredient_category = link.ingredient.category.lower()
        if ingredient_category == "protein":
            profile.add("protein")
        if ingredient_category == "vegetable":
            profile.add("vegetable")
        if ingredient_category == "staple":
            profile.add("staple")
        for category, keywords in PROFILE_KEYWORDS.items():
            if any(keyword in ingredient_name for keyword in keywords):
                profile.add(category)
    return profile


def build_balance_context(target_date: date, meal_context: str) -> dict:
    logs = get_recent_cooking_logs(target_date)
    same_meal_logs = [log for log in logs if log["meal"] == meal_context][:4]
    today_logs = [log for log in logs if log["cooked_on"] == target_date]
    recent_profiles = [derive_log_profile(log["menu"], log["note"]) for log in same_meal_logs]

    covered_categories = set().union(*recent_profiles) if recent_profiles else set()
    missing_categories = [category for category in ("protein", "vegetable", "staple") if category not in covered_categories]
    recent_menus = [log["menu"] for log in same_meal_logs[:3]]
    average_calories = (
        sum(log["calories"] for log in same_meal_logs) / len(same_meal_logs)
        if same_meal_logs
        else 0
    )

    return {
        "meal_context": meal_context,
        "missing_categories": missing_categories,
        "recent_menus": recent_menus,
        "average_calories": average_calories,
        "today_log_count": len(today_logs),
    }


def compute_recipe_match(
    recipe: Recipe,
    pantry_totals: dict[int, float],
    target_date: date,
    *,
    mode: str,
    meal_context: str,
    query: str = "",
    balance_context: dict | None = None,
) -> dict:
    missing_items = []
    available_items = []
    soon_items = []
    required_count = 0
    available_count = 0

    for link in recipe.ingredients.select_related("ingredient").all():
        if link.is_optional:
            continue

        required_count += 1
        available_quantity = pantry_totals.get(link.ingredient_id, 0)
        is_available = available_quantity >= link.quantity
        if is_available:
            available_count += 1
            available_items.append(link.ingredient.name)
            expiring_item = PantryItem.objects.filter(
                ingredient=link.ingredient,
                expires_on__isnull=False,
                expires_on__lte=target_date + timedelta(days=2),
            ).first()
            if expiring_item:
                soon_items.append(link.ingredient.name)
        else:
            missing_items.append(
                {
                    "ingredient_id": link.ingredient_id,
                    "name": link.ingredient.name,
                    "quantity": round(max(link.quantity - available_quantity, 0), 2),
                    "unit": link.unit,
                }
            )

    pantry_ratio = available_count / required_count if required_count else 1
    searchable = f"{recipe.name} {recipe.tags} {recipe.summary}".lower()
    query_boost = 0.0
    if query and query.lower() in searchable:
        query_boost = 0.18

    recipe_profile = derive_recipe_profile(recipe)
    soon_bonus = min(len(soon_items) * 0.08, 0.24)
    speed_bonus = max(0, (35 - recipe.cook_time_minutes) / 100)
    meal_bonus = 0.28 if recipe.meal == meal_context else (-0.18 if meal_context in {"Breakfast", "Dinner"} else -0.08)
    time_of_day_bonus = 0.0
    if meal_context == "Breakfast":
        time_of_day_bonus += 0.12 if recipe.cook_time_minutes <= 15 else -0.05
        if "protein" in recipe_profile:
            time_of_day_bonus += 0.08
    elif meal_context == "Dinner":
        if "protein" in recipe_profile:
            time_of_day_bonus += 0.1
        if "vegetable" in recipe_profile:
            time_of_day_bonus += 0.08
        if recipe.cook_time_minutes >= 15:
            time_of_day_bonus += 0.05

    balance_bonus = 0.0
    repeat_penalty = 0.0
    if balance_context:
        missing_categories = balance_context["missing_categories"]
        recent_menus = balance_context["recent_menus"]
        for category in missing_categories:
            if category in recipe_profile:
                balance_bonus += 0.12
        if recipe.name in recent_menus:
            repeat_penalty -= 0.2
        average_calories = balance_context["average_calories"]
        if meal_context == "Breakfast" and average_calories > 500 and recipe.cook_time_minutes <= 15:
            balance_bonus += 0.05
        if meal_context == "Dinner" and average_calories < 500 and "protein" in recipe_profile:
            balance_bonus += 0.08

    base_weight = 0.58 if mode == "pantry" else 0.34
    score = round(
        (pantry_ratio * base_weight)
        + query_boost
        + soon_bonus
        + speed_bonus
        + meal_bonus
        + time_of_day_bonus
        + balance_bonus
        + repeat_penalty,
        3,
    )

    return {
        "recipe": recipe,
        "available_items": available_items,
        "missing_items": missing_items,
        "pantry_ratio": pantry_ratio,
        "score": score,
        "soon_items": soon_items,
        "can_cook_now": len(missing_items) == 0,
        "recipe_profile": recipe_profile,
        "meal_context": meal_context,
        "balance_context": balance_context or {},
    }


def build_agent_message(match: dict, mode: str) -> str:
    recipe: Recipe = match["recipe"]
    reasons = []
    meal_label = MEAL_LABELS.get(match["meal_context"], "この時間帯")
    if match["soon_items"]:
        reasons.append(f"期限が近い {', '.join(match['soon_items'][:2])} を先に使えます")
    if match["can_cook_now"]:
        reasons.append("今ある在庫だけで作れます")
    elif len(match["missing_items"]) <= 2:
        reasons.append("少ない買い足しで成立します")
    else:
        reasons.append("不足食材を買えば作れます")

    if recipe.cook_time_minutes <= 20:
        reasons.append(f"{meal_label}向けに {recipe.cook_time_minutes}分前後で作れます")

    if mode == "balance":
        missing_categories = match["balance_context"].get("missing_categories", [])
        readable_categories = {
            "protein": "たんぱく質",
            "vegetable": "野菜",
            "staple": "主食",
        }
        covered = [readable_categories[item] for item in missing_categories if item in match["recipe_profile"]]
        if covered:
            reasons.append(f"最近不足しがちな {' / '.join(covered)} を補いやすいです")

    mode_line = (
        "在庫を優先して決める提案です"
        if mode == "pantry"
        else "最近の自炊記録からバランスを整える提案です"
    )
    return f"{mode_line}。{'。'.join(reasons)}。"


def build_suggestions(
    *,
    mode: str,
    query: str = "",
    meal_context: str | None = None,
    limit: int = 3,
    target_date: date | None = None,
) -> list[dict]:
    target = target_date or date.today()
    resolved_meal_context = resolve_meal_context(meal_context)
    pantry_totals = get_pantry_totals()
    recipes = Recipe.objects.prefetch_related("ingredients__ingredient").all()
    balance_context = build_balance_context(target, resolved_meal_context) if mode == "balance" else None

    matches = [
        compute_recipe_match(
            recipe,
            pantry_totals,
            target,
            mode=mode,
            meal_context=resolved_meal_context,
            query=query,
            balance_context=balance_context,
        )
        for recipe in recipes
    ]

    matches = [
        match for match in matches
        if match["recipe"].meal == resolved_meal_context or match["score"] >= 0.45
    ]

    if query:
        matches = [
            match
            for match in matches
            if query.lower() in f"{match['recipe'].name} {match['recipe'].tags} {match['recipe'].summary}".lower()
            or match["score"] >= 0.45
        ]

    matches.sort(
        key=lambda item: (
            item["recipe"].meal == resolved_meal_context,
            item["can_cook_now"],
            item["score"],
            -len(item["missing_items"]),
        ),
        reverse=True,
    )

    suggestions = []
    for match in matches[:limit]:
        recipe = match["recipe"]
        suggestions.append(
            {
                "recipe_id": recipe.id,
                "name": recipe.name,
                "meal": recipe.meal,
                "summary": recipe.summary,
                "cook_time_minutes": recipe.cook_time_minutes,
                "servings": recipe.servings,
                "score": match["score"],
                "can_cook_now": match["can_cook_now"],
                "available_items": match["available_items"],
                "missing_items": match["missing_items"],
                "buy_count": len(match["missing_items"]),
                "agent_message": build_agent_message(match, mode),
                "meal_context": resolved_meal_context,
            }
        )
    return suggestions


def build_planner_highlight(target_date: date) -> dict:
    suggestions = build_suggestions(mode="pantry", target_date=target_date, limit=1)
    if not suggestions:
        return {
            "title": "候補を準備中",
            "message": "食材登録が増えると提案精度が上がります。",
        }
    top = suggestions[0]
    return {
        "title": top["name"],
        "message": top["agent_message"],
        "buy_count": top["buy_count"],
    }


def build_shopping_plan(recipe_ids: list[int]) -> dict:
    pantry_totals = get_pantry_totals()
    selected_recipes = list(
        Recipe.objects.filter(id__in=recipe_ids).prefetch_related("ingredients__ingredient")
    )
    required_totals: dict[tuple[int, str], dict] = {}

    for recipe in selected_recipes:
        for link in recipe.ingredients.select_related("ingredient").all():
            if link.is_optional:
                continue
            key = (link.ingredient_id, link.unit)
            if key not in required_totals:
                required_totals[key] = {
                    "ingredient_id": link.ingredient_id,
                    "name": link.ingredient.name,
                    "unit": link.unit,
                    "required_quantity": 0.0,
                    "recipes": [],
                }
            required_totals[key]["required_quantity"] += link.quantity
            required_totals[key]["recipes"].append(recipe.name)

    items = []
    for key, item in required_totals.items():
        pantry_quantity = pantry_totals.get(key[0], 0)
        shortage = max(item["required_quantity"] - pantry_quantity, 0)
        if shortage <= 0:
            continue
        item["quantity"] = round(shortage, 2)
        item["suggested_purchase_quantity"] = max(1, ceil(item["quantity"]))
        del item["required_quantity"]
        items.append(item)

    items.sort(key=lambda item: (len(item["recipes"]), item["name"]), reverse=True)

    return {
        "recipes": [{"id": recipe.id, "name": recipe.name} for recipe in selected_recipes],
        "items": items,
    }


def build_weather_summary(target_date: date) -> dict:
    base_temp = 17 + (target_date.day % 4)
    conditions = ["Sunny", "Cloudy", "Rain", "Rain"]
    hours = ["09:00", "12:00", "15:00", "18:00"]
    offsets = [0, 3, 2, -1]

    timeline = [
        {
            "hour": hour,
            "condition": condition,
            "temperature": base_temp + offset,
        }
        for hour, condition, offset in zip(hours, conditions, offsets)
    ]

    daily_forecast = []
    for index in range(3):
        day = target_date + timedelta(days=index)
        daily_forecast.append(
            {
                "date": day.isoformat(),
                "label": "Today" if index == 0 else "Tomorrow" if index == 1 else day.strftime("%a"),
                "high": base_temp + 3 + index,
                "low": base_temp - 2 + index,
                "condition": ["Rain", "Cloudy", "Sunny"][index],
            }
        )

    return {
        "current_temperature": base_temp,
        "feels_like": base_temp - 2,
        "summary": "Afternoon rain expected" if "Rain" in conditions else "Stable weather",
        "timeline": timeline,
        "daily_forecast": daily_forecast,
    }
