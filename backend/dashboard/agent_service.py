import json
import os
from datetime import date, timedelta
from typing import Any

from dashboard.models import CookingLog, PantryItem
from dashboard.services import (
    MEAL_LABELS,
    build_pantry_summary,
    build_planner_highlight,
    build_weather_summary,
)

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None


def _is_openai_enabled() -> bool:
    return OpenAI is not None and bool(os.getenv("OPENAI_API_KEY"))


def _get_client():
    if not _is_openai_enabled():
        return None
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _request_structured_output(
    *,
    schema_name: str,
    schema: dict[str, Any],
    instructions: str,
    prompt: str,
) -> dict[str, Any]:
    client = _get_client()
    if client is None:
        raise RuntimeError("OpenAI client is not configured")

    response = client.responses.create(
        model=os.getenv("OPENAI_AGENT_MODEL", "gpt-4.1-mini"),
        input=[
            {"role": "system", "content": instructions},
            {"role": "user", "content": prompt},
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": schema_name,
                "schema": schema,
                "strict": True,
            }
        },
        max_output_tokens=500,
    )

    output_text = getattr(response, "output_text", "").strip()
    if not output_text:
        raise RuntimeError("OpenAI response was empty")
    return json.loads(output_text)


def _fallback_daily_focus(target_date: date) -> dict[str, str]:
    summary = build_pantry_summary(target_date)
    planner = build_planner_highlight(target_date)
    today_logs = list(CookingLog.objects.filter(cooked_on=target_date).order_by("-updated_at")[:3])
    weather = build_weather_summary(target_date)

    if summary["expiring_soon_names"]:
        item_names = " / ".join(summary["expiring_soon_names"][:2])
        return {
            "title": "期限が近い在庫を先に使う",
            "reason": f"{item_names} が早めに使う候補です。{planner['title']} を軸にすると整理しやすいです。",
            "action_label": "在庫を確認する",
            "action_path": "/pantry",
            "generated_by": "fallback",
        }

    if len([log for log in today_logs if log.status == "logged"]) < 3:
        return {
            "title": "今日の食事記録を埋める",
            "reason": f"記録はまだ {len(today_logs)} 件です。次の一食候補は {planner['title']} です。",
            "action_label": "記録を追加する",
            "action_path": "/cooking",
            "generated_by": "fallback",
        }

    return {
        "title": "今日の状態は揃っている",
        "reason": f"気温は {weather['current_temperature']}°、概要は {weather['summary']} です。大きな入力漏れはありません。",
        "action_label": "ホームを見直す",
        "action_path": "/",
        "generated_by": "fallback",
    }


def build_daily_focus(target_date: date) -> dict[str, str]:
    summary = build_pantry_summary(target_date)
    planner = build_planner_highlight(target_date)
    today_logs = list(CookingLog.objects.filter(cooked_on=target_date).order_by("-updated_at")[:3])
    weather = build_weather_summary(target_date)

    prompt = json.dumps(
        {
            "date": target_date.isoformat(),
            "weather": {
                "temperature": weather["current_temperature"],
                "summary": weather["summary"],
                "timeline": weather["timeline"],
            },
            "pantry_summary": summary,
            "today_logs": [
                {
                    "meal": log.meal,
                    "menu": log.menu,
                    "status": log.status,
                    "updated_at": log.updated_at.isoformat(),
                }
                for log in today_logs
            ],
            "planner_highlight": planner,
            "allowed_actions": [
                {"label": "在庫を確認する", "path": "/pantry"},
                {"label": "記録を追加する", "path": "/cooking"},
                {"label": "ホームを見直す", "path": "/"},
            ],
        },
        ensure_ascii=False,
    )
    schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "reason": {"type": "string"},
            "action_label": {"type": "string"},
            "action_path": {"type": "string", "enum": ["/", "/pantry", "/cooking"]},
        },
        "required": ["title", "reason", "action_label", "action_path"],
    }
    instructions = (
        "You are an assistant inside a life dashboard. Return exactly one short daily focus item in Japanese. "
        "Prefer pantry cleanup when ingredients expire soon. Otherwise prefer completing today's cooking logs if they are incomplete."
    )

    try:
        payload = _request_structured_output(
            schema_name="daily_focus",
            schema=schema,
            instructions=instructions,
            prompt=prompt,
        )
        payload["generated_by"] = "openai"
        return payload
    except Exception:
        return _fallback_daily_focus(target_date)


def _fallback_pantry_insights(target_date: date) -> dict[str, Any]:
    items = list(PantryItem.objects.select_related("ingredient").all())
    use_soon = [
        item.ingredient.name
        for item in items
        if item.expires_on and item.expires_on <= target_date + timedelta(days=2)
    ][:3]
    stock_ok = [item.ingredient.name for item in items if not item.expires_on][:3]
    watchlist = [item.ingredient.name for item in items if item.storage == "Freezer"][:3]

    return {
        "summary": "期限と保管場所から、今日確認すべき在庫を絞りました。",
        "use_soon": use_soon,
        "stock_ok": stock_ok,
        "watchlist": watchlist,
        "generated_by": "fallback",
    }


def build_pantry_insights(target_date: date) -> dict[str, Any]:
    items = list(PantryItem.objects.select_related("ingredient").order_by("expires_on", "-updated_at")[:18])
    prompt = json.dumps(
        {
            "date": target_date.isoformat(),
            "items": [
                {
                    "name": item.ingredient.name,
                    "category": item.ingredient.category,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "storage": item.storage,
                    "expires_on": item.expires_on.isoformat() if item.expires_on else "",
                    "note": item.note,
                }
                for item in items
            ],
        },
        ensure_ascii=False,
    )
    schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "summary": {"type": "string"},
            "use_soon": {"type": "array", "items": {"type": "string"}, "maxItems": 3},
            "stock_ok": {"type": "array", "items": {"type": "string"}, "maxItems": 3},
            "watchlist": {"type": "array", "items": {"type": "string"}, "maxItems": 3},
        },
        "required": ["summary", "use_soon", "stock_ok", "watchlist"],
    }
    instructions = (
        "You organize pantry items for a Japanese household dashboard. Return short Japanese text. "
        "use_soon means consume first, stock_ok means stable stock, watchlist means items that need checking or replenishment."
    )

    try:
        payload = _request_structured_output(
            schema_name="pantry_insights",
            schema=schema,
            instructions=instructions,
            prompt=prompt,
        )
        payload["generated_by"] = "openai"
        return payload
    except Exception:
        return _fallback_pantry_insights(target_date)


def _fallback_cooking_assist(payload: dict[str, Any]) -> dict[str, Any]:
    meal = str(payload.get("meal", "Dinner"))
    menu = str(payload.get("menu", "")).strip()
    note = str(payload.get("note", "")).strip()
    related_logs = (
        list(CookingLog.objects.filter(menu__icontains=menu).order_by("-updated_at")[:3])
        if menu
        else []
    )
    suggested_calories = (
        round(sum(log.calories for log in related_logs) / len(related_logs))
        if related_logs
        else (430 if meal == "Breakfast" else 580 if meal == "Lunch" else 650)
    )

    return {
        "menu_summary": f"{menu or 'この料理'}を {MEAL_LABELS.get(meal, meal)} の記録として整える下書きです。",
        "suggested_calories": suggested_calories,
        "note_hint": note or "食べた量や作り置きかどうかを簡潔に残す。",
        "next_tip": "次回は量か満足度を一言入れると見返しやすくなります。",
        "generated_by": "fallback",
    }


def build_cooking_assist(payload: dict[str, Any]) -> dict[str, Any]:
    menu = str(payload.get("menu", "")).strip()
    if not menu:
        return _fallback_cooking_assist(payload)

    prompt = json.dumps(
        {
            "draft": {
                "meal": payload.get("meal", "Dinner"),
                "menu": menu,
                "note": payload.get("note", ""),
                "cooked_on": payload.get("cooked_on", ""),
            },
            "recent_logs": [
                {
                    "meal": log.meal,
                    "menu": log.menu,
                    "calories": log.calories,
                    "note": log.note,
                }
                for log in CookingLog.objects.order_by("-updated_at")[:6]
            ],
        },
        ensure_ascii=False,
    )
    schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "menu_summary": {"type": "string"},
            "suggested_calories": {"type": "integer"},
            "note_hint": {"type": "string"},
            "next_tip": {"type": "string"},
        },
        "required": ["menu_summary", "suggested_calories", "note_hint", "next_tip"],
    }
    instructions = (
        "You help fill a cooking log. Return concise Japanese strings. "
        "Estimate realistic calories for one meal and keep next_tip to one sentence."
    )

    try:
        payload = _request_structured_output(
            schema_name="cooking_assist",
            schema=schema,
            instructions=instructions,
            prompt=prompt,
        )
        payload["generated_by"] = "openai"
        return payload
    except Exception:
        return _fallback_cooking_assist(payload)
