from django.urls import path

from dashboard.views import (
    cooking_assist_view,
    cooking_log_detail_view,
    cooking_logs_view,
    dashboard_view,
    daily_focus_view,
    health_view,
    index_view,
    pantry_item_detail_view,
    pantry_insights_view,
    pantry_items_view,
    pantry_receipt_import_view,
    recipe_detail_view,
    recipes_view,
    shopping_plan_view,
    suggestions_view,
    weather_view,
)


urlpatterns = [
    path("", index_view, name="index"),
    path("health", health_view, name="health"),
    path("dashboard", dashboard_view, name="dashboard"),
    path("agent/daily-focus", daily_focus_view, name="daily-focus"),
    path("agent/pantry-insights", pantry_insights_view, name="pantry-insights"),
    path("agent/cooking-assist", cooking_assist_view, name="cooking-assist"),
    path("weather", weather_view, name="weather"),
    path("cooking-logs", cooking_logs_view, name="cooking-logs"),
    path("cooking-logs/<int:log_id>", cooking_log_detail_view, name="cooking-log-detail"),
    path("pantry-items", pantry_items_view, name="pantry-items"),
    path("pantry-items/import-receipt", pantry_receipt_import_view, name="pantry-items-import-receipt"),
    path("pantry-items/<int:item_id>", pantry_item_detail_view, name="pantry-item-detail"),
    path("recipes", recipes_view, name="recipes"),
    path("recipes/<int:recipe_id>", recipe_detail_view, name="recipe-detail"),
    path("suggestions", suggestions_view, name="suggestions"),
    path("shopping-plan", shopping_plan_view, name="shopping-plan"),
]
