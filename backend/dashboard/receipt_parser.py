import base64
import json
import mimetypes
import os
from pathlib import Path
from urllib import error, request


def guess_category(name: str) -> str:
    lower_name = name.lower()
    if any(keyword in lower_name for keyword in ["egg", "chicken", "tofu", "milk", "cheese", "salmon"]):
        return "Protein"
    if any(keyword in lower_name for keyword in ["onion", "carrot", "cabbage", "spinach", "potato", "tomato"]):
        return "Vegetable"
    if any(keyword in lower_name for keyword in ["rice", "pasta", "bread", "noodle"]):
        return "Staple"
    if any(keyword in lower_name for keyword in ["miso", "soy", "salt", "sauce"]):
        return "Seasoning"
    return "Staple"


def parse_receipt_image(image_path: str) -> dict:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "items": [],
            "warnings": ["OPENAI_API_KEY が未設定のため、レシート画像の自動解析をスキップしました。"],
        }

    path = Path(image_path)
    media_type = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    encoded_image = base64.b64encode(path.read_bytes()).decode("utf-8")
    payload = {
        "model": os.getenv("OPENAI_RECEIPT_MODEL", "gpt-4o-mini"),
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You extract grocery items from Japanese supermarket receipts. "
                    "Return JSON with an 'items' array only. "
                    "Each item must include name, quantity, unit, storage, and note. "
                    "Use quantity 1 and unit 'item' if unclear. "
                    "Storage must be one of Fridge, Freezer, Pantry."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Parse this receipt image and extract only grocery items."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{encoded_image}"
                        }
                    },
                ],
            },
        ],
    }

    http_request = request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(http_request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except error.URLError:
        return {
            "items": [],
            "warnings": ["レシート解析 API に接続できませんでした。手動登録へ切り替えてください。"],
        }

    content = body["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    items = []
    for item in parsed.get("items", []):
        name = str(item.get("name", "")).strip()
        if not name:
            continue
        items.append(
            {
                "name": name,
                "category": guess_category(name),
                "quantity": float(item.get("quantity", 1) or 1),
                "unit": str(item.get("unit", "item") or "item"),
                "storage": str(item.get("storage", "Fridge") or "Fridge"),
                "note": str(item.get("note", "") or ""),
            }
        )

    return {"items": items, "warnings": []}
