import json
from datetime import date
from io import BytesIO

from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import HttpRequest, JsonResponse, QueryDict
from django.http.multipartparser import MultiPartParser
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt

from dashboard.dto import (
    build_dashboard_response,
    build_weather_response,
    serialize_cooking_log,
    serialize_cooking_logs,
    serialize_pantry_item,
    serialize_pantry_items,
    serialize_recipe,
    serialize_recipes,
)
from dashboard.agent_service import build_cooking_assist, build_daily_focus, build_pantry_insights
from dashboard.models import CookingLog, Ingredient, PantryItem, Recipe
from dashboard.receipt_parser import parse_receipt_image
from dashboard.services import (
    build_default_cooking_logs,
    build_pantry_summary,
    build_planner_highlight,
    build_shopping_plan,
    build_suggestions,
    build_weather_summary,
)
from dashboard.storage import CookingPhotoStorage, ReceiptPhotoStorage


def parse_payload(request: HttpRequest) -> tuple[dict | QueryDict, str]:
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        if request.method == "POST":
            payload = request.POST
            files = request.FILES
        else:
            parser = MultiPartParser(request.META, BytesIO(request.body), request.upload_handlers, request.encoding)
            payload, files = parser.parse()

        photo = files.get("photo")
        if photo is None:
            return payload, ""

        return payload, CookingPhotoStorage().save(photo)

    payload = json.loads(request.body or "{}")
    return payload, payload.get("photo_url", "")


def index_view(request: HttpRequest):
    return JsonResponse(
        {
            "service": "Life Dashboard API",
            "available_endpoints": [
                "/health",
                "/dashboard",
                "/weather",
                "/cooking-logs",
                "/pantry-items",
                "/pantry-items/import-receipt",
                "/recipes",
                "/suggestions",
                "/shopping-plan",
            ],
        }
    )


def health_view(request: HttpRequest):
    return JsonResponse({"status": "ok"})


def dashboard_view(request: HttpRequest):
    today = date.today()
    weather = build_weather_summary(today)
    queryset = CookingLog.objects.filter(cooked_on=today).order_by("created_at")
    cooking_logs = serialize_cooking_logs(queryset) if queryset.exists() else build_default_cooking_logs(today)

    return JsonResponse(
        build_dashboard_response(
            target_date=today.isoformat(),
            location="Tokyo",
            weather=weather,
            cooking_logs=cooking_logs,
            pantry_summary=build_pantry_summary(today),
            planner_highlight=build_planner_highlight(today),
            daily_focus=build_daily_focus(today),
        )
    )


def daily_focus_view(request: HttpRequest):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    return JsonResponse(build_daily_focus(date.today()))


@csrf_exempt
def cooking_logs_view(request: HttpRequest):
    if request.method == "GET":
        queryset = CookingLog.objects.order_by("-cooked_on", "-created_at")
        meal = request.GET.get("meal")
        status = request.GET.get("status")
        cooked_on = request.GET.get("cooked_on")
        query = request.GET.get("query")

        if meal:
            queryset = queryset.filter(meal=meal)
        if status:
            queryset = queryset.filter(status=status)
        if cooked_on:
            queryset = queryset.filter(cooked_on=cooked_on)
        if query:
            queryset = queryset.filter(Q(menu__icontains=query) | Q(note__icontains=query))

        cooking_logs = serialize_cooking_logs(queryset)
        return JsonResponse({"cooking_logs": cooking_logs})

    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload, photo_url = parse_payload(request)
        log = CookingLog.objects.create(
            meal=payload["meal"],
            menu=payload["menu"],
            calories=int(payload["calories"]),
            status=payload.get("status", "logged"),
            cooked_on=date.fromisoformat(payload.get("cooked_on", date.today().isoformat())),
            note=payload.get("note", ""),
            photo=photo_url,
        )
    except (KeyError, TypeError, ValueError, ValidationError, json.JSONDecodeError):
        return JsonResponse({"detail": "Invalid payload"}, status=400)

    return JsonResponse(serialize_cooking_log(log), status=201)


@csrf_exempt
def cooking_log_detail_view(request: HttpRequest, log_id: int):
    if request.method == "DELETE":
        log = get_object_or_404(CookingLog, id=log_id)
        log.delete()
        return JsonResponse({"deleted": True})

    if request.method != "PUT":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        log = get_object_or_404(CookingLog, id=log_id)
        payload, photo_url = parse_payload(request)

        log.meal = payload.get("meal", log.meal)
        log.menu = payload.get("menu", log.menu)
        log.calories = int(payload.get("calories", log.calories))
        log.status = payload.get("status", log.status)
        log.note = payload.get("note", log.note)
        if "cooked_on" in payload:
            log.cooked_on = date.fromisoformat(payload["cooked_on"])
        if photo_url:
            log.photo = photo_url
        log.save()
    except (TypeError, ValueError, ValidationError, json.JSONDecodeError):
        return JsonResponse({"detail": "Invalid payload"}, status=400)

    return JsonResponse(serialize_cooking_log(log))


def weather_view(request: HttpRequest):
    today = date.today()
    return JsonResponse(build_weather_response("Tokyo", build_weather_summary(today)))


def pantry_insights_view(request: HttpRequest):
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    return JsonResponse(build_pantry_insights(date.today()))


@csrf_exempt
def pantry_items_view(request: HttpRequest):
    if request.method == "GET":
        queryset = PantryItem.objects.select_related("ingredient").all()
        storage = request.GET.get("storage")
        query = request.GET.get("query")

        if storage:
            queryset = queryset.filter(storage__iexact=storage)
        if query:
            queryset = queryset.filter(ingredient__name__icontains=query)

        return JsonResponse({"pantry_items": serialize_pantry_items(queryset)})

    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body or "{}")
        ingredient_name = str(payload["name"]).strip()
        ingredient, _ = Ingredient.objects.get_or_create(
            name=ingredient_name,
            defaults={
                "category": payload.get("category", ""),
                "default_unit": payload.get("unit", "item"),
            },
        )
        if payload.get("category") and ingredient.category != payload["category"]:
            ingredient.category = payload["category"]
            ingredient.save(update_fields=["category"])

        item = PantryItem.objects.create(
            ingredient=ingredient,
            quantity=float(payload["quantity"]),
            unit=payload.get("unit", ingredient.default_unit or "item"),
            storage=payload.get("storage", "Fridge"),
            purchased_on=date.fromisoformat(payload["purchased_on"]) if payload.get("purchased_on") else None,
            expires_on=date.fromisoformat(payload["expires_on"]) if payload.get("expires_on") else None,
            note=payload.get("note", ""),
        )
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return JsonResponse({"detail": "Invalid payload"}, status=400)

    return JsonResponse(serialize_pantry_item(item), status=201)


@csrf_exempt
def pantry_receipt_import_view(request: HttpRequest):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    if not request.content_type or not request.content_type.startswith("multipart/form-data"):
        return JsonResponse({"detail": "multipart/form-data is required"}, status=400)

    upload = request.FILES.get("receipt")
    if upload is None:
        return JsonResponse({"detail": "receipt is required"}, status=400)

    receipt_path = ReceiptPhotoStorage().save(upload)
    parsed = parse_receipt_image(receipt_path)

    return JsonResponse(
        {
            "parsed_items": parsed["items"],
            "warnings": parsed["warnings"],
        }
    )


@csrf_exempt
def pantry_item_detail_view(request: HttpRequest, item_id: int):
    item = get_object_or_404(PantryItem.objects.select_related("ingredient"), id=item_id)

    if request.method == "DELETE":
        item.delete()
        return JsonResponse({"deleted": True})

    if request.method != "PUT":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body or "{}")
        if "name" in payload:
            ingredient_name = str(payload["name"]).strip()
            ingredient, _ = Ingredient.objects.get_or_create(
                name=ingredient_name,
                defaults={
                    "category": payload.get("category", item.ingredient.category),
                    "default_unit": payload.get("unit", item.unit),
                },
            )
            item.ingredient = ingredient
        if "quantity" in payload:
            item.quantity = float(payload["quantity"])
        if "unit" in payload:
            item.unit = payload["unit"]
        if "storage" in payload:
            item.storage = payload["storage"]
        if "purchased_on" in payload:
            item.purchased_on = date.fromisoformat(payload["purchased_on"]) if payload["purchased_on"] else None
        if "expires_on" in payload:
            item.expires_on = date.fromisoformat(payload["expires_on"]) if payload["expires_on"] else None
        if "note" in payload:
            item.note = payload["note"]
        item.save()
    except (TypeError, ValueError, json.JSONDecodeError):
        return JsonResponse({"detail": "Invalid payload"}, status=400)

    return JsonResponse(serialize_pantry_item(item))


def recipes_view(request: HttpRequest):
    queryset = Recipe.objects.prefetch_related("ingredients__ingredient").all()
    query = request.GET.get("query")
    if query:
        queryset = queryset.filter(Q(name__icontains=query) | Q(tags__icontains=query) | Q(summary__icontains=query))
    return JsonResponse({"recipes": serialize_recipes(queryset)})


def recipe_detail_view(request: HttpRequest, recipe_id: int):
    recipe = get_object_or_404(
        Recipe.objects.prefetch_related("ingredients__ingredient"),
        id=recipe_id,
    )
    return JsonResponse(serialize_recipe(recipe))


@csrf_exempt
def suggestions_view(request: HttpRequest):
    if request.method not in {"POST", "GET"}:
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    if request.method == "GET":
        mode = request.GET.get("mode", "pantry")
        query = request.GET.get("query", "")
        meal_context = request.GET.get("meal_context")
    else:
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "Invalid payload"}, status=400)
        mode = payload.get("mode", "pantry")
        query = payload.get("query", "")
        meal_context = payload.get("meal_context")

    suggestions = build_suggestions(mode=mode, query=query, meal_context=meal_context)
    return JsonResponse({"mode": mode, "query": query, "meal_context": meal_context, "suggestions": suggestions})


@csrf_exempt
def shopping_plan_view(request: HttpRequest):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body or "{}")
        recipe_ids = [int(recipe_id) for recipe_id in payload.get("recipe_ids", [])]
    except (TypeError, ValueError, json.JSONDecodeError):
        return JsonResponse({"detail": "Invalid payload"}, status=400)

    if not recipe_ids:
        return JsonResponse({"detail": "recipe_ids is required"}, status=400)

    return JsonResponse(build_shopping_plan(recipe_ids))


@csrf_exempt
def cooking_assist_view(request: HttpRequest):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid payload"}, status=400)

    return JsonResponse(build_cooking_assist(payload))
