from dashboard.models import CookingLog, PantryItem, Recipe


def serialize_cooking_log(log: CookingLog) -> dict:
    return {
        "id": log.id,
        "meal": log.meal,
        "menu": log.menu,
        "calories": log.calories,
        "status": log.status,
        "cooked_on": log.cooked_on.isoformat(),
        "note": log.note,
        "photo_url": log.photo,
        "updated_at": log.updated_at.isoformat(),
    }


def serialize_cooking_logs(logs) -> list[dict]:
    return [serialize_cooking_log(log) for log in logs]


def serialize_pantry_item(item: PantryItem) -> dict:
    return {
        "id": item.id,
        "ingredient_id": item.ingredient_id,
        "name": item.ingredient.name,
        "category": item.ingredient.category,
        "quantity": item.quantity,
        "unit": item.unit,
        "storage": item.storage,
        "purchased_on": item.purchased_on.isoformat() if item.purchased_on else "",
        "expires_on": item.expires_on.isoformat() if item.expires_on else "",
        "note": item.note,
        "updated_at": item.updated_at.isoformat(),
    }


def serialize_pantry_items(items) -> list[dict]:
    return [serialize_pantry_item(item) for item in items]


def serialize_recipe(recipe: Recipe) -> dict:
    return {
        "id": recipe.id,
        "name": recipe.name,
        "meal": recipe.meal,
        "summary": recipe.summary,
        "cook_time_minutes": recipe.cook_time_minutes,
        "servings": recipe.servings,
        "tags": [tag.strip() for tag in recipe.tags.split(",") if tag.strip()],
        "instructions": recipe.instructions,
        "ingredients": [
            {
                "ingredient_id": link.ingredient_id,
                "name": link.ingredient.name,
                "quantity": link.quantity,
                "unit": link.unit,
                "is_optional": link.is_optional,
            }
            for link in recipe.ingredients.select_related("ingredient").all()
        ],
    }


def serialize_recipes(recipes) -> list[dict]:
    return [serialize_recipe(recipe) for recipe in recipes]


def build_weather_response(location: str, weather: dict) -> dict:
    return {
        "location": location,
        "current_temperature": weather["current_temperature"],
        "feels_like": weather["feels_like"],
        "summary": weather["summary"],
        "timeline": weather["timeline"],
        "daily_forecast": weather["daily_forecast"],
    }


def build_dashboard_response(
    *,
    target_date: str,
    location: str,
    weather: dict,
    cooking_logs: list[dict],
    pantry_summary: dict,
    planner_highlight: dict,
    daily_focus: dict | None = None,
) -> dict:
    return {
        "date": target_date,
        "location": location,
        "weather": build_weather_response(location, weather),
        "cooking_logs": cooking_logs,
        "pantry_summary": pantry_summary,
        "planner_highlight": planner_highlight,
        "daily_focus": daily_focus or {},
    }
