import json
from datetime import date

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test.client import BOUNDARY, MULTIPART_CONTENT, encode_multipart
from django.test import Client, TestCase

from dashboard.models import CookingLog


class DashboardApiTests(TestCase):
    def setUp(self) -> None:
        self.client = Client()

    def test_health_endpoint(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_dashboard_endpoint_returns_weather_and_logs(self) -> None:
        response = self.client.get("/dashboard")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("weather", data)
        self.assertGreaterEqual(len(data["cooking_logs"]), 1)
        self.assertIn("location", data["weather"])
        self.assertIn("daily_focus", data)

    def test_weather_endpoint_returns_summary(self) -> None:
        response = self.client.get("/weather")

        self.assertEqual(response.status_code, 200)
        self.assertIn("timeline", response.json())
        self.assertIn("daily_forecast", response.json())

    def test_create_and_update_cooking_log(self) -> None:
        create_response = self.client.post(
            "/cooking-logs",
            data=json.dumps(
                {
                    "meal": "Dinner",
                    "menu": "Pork ginger",
                    "calories": 690,
                    "status": "planned",
                    "cooked_on": date.today().isoformat(),
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(create_response.status_code, 201)
        created = create_response.json()
        self.assertEqual(created["meal"], "Dinner")

        update_response = self.client.put(
            f"/cooking-logs/{created['id']}",
            data=json.dumps({"status": "logged"}),
            content_type="application/json",
        )

        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["status"], "logged")
        self.assertEqual(CookingLog.objects.get(id=created["id"]).status, "logged")

    def test_cooking_logs_endpoint_returns_history(self) -> None:
        CookingLog.objects.create(
            meal="Dinner",
            menu="Pasta",
            calories=520,
            status="logged",
            cooked_on=date.today(),
        )

        response = self.client.get("/cooking-logs")

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()["cooking_logs"]), 1)

    def test_cooking_logs_endpoint_supports_filters(self) -> None:
        CookingLog.objects.create(
            meal="Lunch",
            menu="Filter target",
            calories=410,
            status="planned",
            cooked_on=date.today(),
            note="keyword",
        )

        response = self.client.get("/cooking-logs", {"meal": "Lunch", "query": "keyword"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["cooking_logs"]), 1)

    def test_create_cooking_log_with_photo(self) -> None:
        upload = SimpleUploadedFile("meal.jpg", b"fake-image-bytes", content_type="image/jpeg")

        response = self.client.post(
            "/cooking-logs",
            data={
                "meal": "Dinner",
                "menu": "Grilled mackerel",
                "calories": "640",
                "status": "logged",
                "cooked_on": date.today().isoformat(),
                "note": "脂がのっていた",
                "photo": upload,
            },
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["note"], "脂がのっていた")
        self.assertTrue(payload["photo_url"].startswith("/media/cooking-logs/"))

    def test_update_cooking_log_with_multipart_payload(self) -> None:
        log = CookingLog.objects.create(
            meal="Dinner",
            menu="Soup",
            calories=320,
            status="planned",
            cooked_on=date.today(),
        )

        payload = encode_multipart(
            BOUNDARY,
            {
                "meal": "Dinner",
                "menu": "Soup curry",
                "calories": "480",
                "status": "logged",
                "cooked_on": date.today().isoformat(),
                "note": "編集フォームの確認",
            },
        )
        response = self.client.generic(
            "PUT",
            f"/cooking-logs/{log.id}",
            payload,
            content_type=MULTIPART_CONTENT,
        )

        self.assertEqual(response.status_code, 200)
        updated = response.json()
        self.assertEqual(updated["menu"], "Soup curry")
        self.assertEqual(updated["note"], "編集フォームの確認")

    def test_delete_cooking_log(self) -> None:
        log = CookingLog.objects.create(
            meal="Dinner",
            menu="Delete me",
            calories=300,
            status="logged",
            cooked_on=date.today(),
        )

        response = self.client.delete(f"/cooking-logs/{log.id}")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(CookingLog.objects.filter(id=log.id).exists())

    def test_pantry_items_endpoint_returns_seeded_items(self) -> None:
        response = self.client.get("/pantry-items")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["pantry_items"]), 1)
        self.assertIn("name", payload["pantry_items"][0])

    def test_create_pantry_item(self) -> None:
        response = self.client.post(
            "/pantry-items",
            data=json.dumps(
                {
                    "name": "Broccoli",
                    "category": "Vegetable",
                    "quantity": 1,
                    "unit": "piece",
                    "storage": "Fridge",
                    "expires_on": date.today().isoformat(),
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["name"], "Broccoli")

    def test_receipt_import_requires_file(self) -> None:
        response = self.client.post("/pantry-items/import-receipt", data={})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "receipt is required")

    def test_suggestions_endpoint_supports_balance_mode(self) -> None:
        response = self.client.post(
            "/suggestions",
            data=json.dumps({"mode": "balance", "meal_context": "Dinner"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "balance")
        self.assertGreaterEqual(len(payload["suggestions"]), 1)
        self.assertIn("agent_message", payload["suggestions"][0])
        self.assertEqual(payload["suggestions"][0]["meal_context"], "Dinner")

    def test_shopping_plan_endpoint_returns_missing_items(self) -> None:
        recipes_response = self.client.get("/recipes", {"query": "グラタン"})
        recipe_id = recipes_response.json()["recipes"][0]["id"]

        response = self.client.post(
            "/shopping-plan",
            data=json.dumps({"recipe_ids": [recipe_id]}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["recipes"][0]["id"], recipe_id)
        self.assertGreaterEqual(len(payload["items"]), 1)

    def test_daily_focus_endpoint_returns_action(self) -> None:
        response = self.client.get("/agent/daily-focus")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("title", payload)
        self.assertIn(payload["action_path"], ["/", "/pantry", "/cooking"])

    def test_pantry_insights_endpoint_returns_lists(self) -> None:
        response = self.client.get("/agent/pantry-insights")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("use_soon", payload)
        self.assertIn("stock_ok", payload)
        self.assertIn("watchlist", payload)

    def test_cooking_assist_endpoint_returns_draft_help(self) -> None:
        response = self.client.post(
            "/agent/cooking-assist",
            data=json.dumps({"meal": "Dinner", "menu": "カレー", "note": ""}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("suggested_calories", payload)
        self.assertIn("next_tip", payload)
