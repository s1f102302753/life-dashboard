from datetime import date, timedelta

from django.db import migrations


def seed_planner_catalog(apps, schema_editor):
    Ingredient = apps.get_model("dashboard", "Ingredient")
    PantryItem = apps.get_model("dashboard", "PantryItem")
    Recipe = apps.get_model("dashboard", "Recipe")
    RecipeIngredient = apps.get_model("dashboard", "RecipeIngredient")

    ingredient_specs = [
        ("Egg", "Protein", "piece"),
        ("Rice", "Staple", "cup"),
        ("Chicken breast", "Protein", "g"),
        ("Tofu", "Protein", "block"),
        ("Onion", "Vegetable", "piece"),
        ("Carrot", "Vegetable", "piece"),
        ("Cabbage", "Vegetable", "quarter"),
        ("Miso", "Seasoning", "tbsp"),
        ("Soy sauce", "Seasoning", "tbsp"),
        ("Pasta", "Staple", "g"),
        ("Tomato can", "Staple", "can"),
        ("Cheese", "Dairy", "g"),
        ("Milk", "Dairy", "ml"),
        ("Potato", "Vegetable", "piece"),
        ("Spinach", "Vegetable", "bunch"),
    ]

    ingredients = {}
    for name, category, unit in ingredient_specs:
        ingredient, _ = Ingredient.objects.get_or_create(
            name=name,
            defaults={"category": category, "default_unit": unit},
        )
        if ingredient.category != category or ingredient.default_unit != unit:
            ingredient.category = category
            ingredient.default_unit = unit
            ingredient.save(update_fields=["category", "default_unit"])
        ingredients[name] = ingredient

    today = date.today()
    pantry_specs = [
        ("Egg", 4, "piece", "Fridge", today - timedelta(days=3), today + timedelta(days=4)),
        ("Rice", 3, "cup", "Pantry", today - timedelta(days=20), None),
        ("Chicken breast", 280, "g", "Fridge", today - timedelta(days=1), today + timedelta(days=1)),
        ("Tofu", 1, "block", "Fridge", today - timedelta(days=1), today + timedelta(days=2)),
        ("Onion", 2, "piece", "Pantry", today - timedelta(days=7), today + timedelta(days=8)),
        ("Carrot", 2, "piece", "Fridge", today - timedelta(days=4), today + timedelta(days=5)),
        ("Miso", 6, "tbsp", "Fridge", None, None),
        ("Soy sauce", 8, "tbsp", "Pantry", None, None),
        ("Pasta", 300, "g", "Pantry", None, None),
        ("Tomato can", 1, "can", "Pantry", None, None),
    ]

    if not PantryItem.objects.exists():
        for ingredient_name, quantity, unit, storage, purchased_on, expires_on in pantry_specs:
            PantryItem.objects.create(
                ingredient=ingredients[ingredient_name],
                quantity=quantity,
                unit=unit,
                storage=storage,
                purchased_on=purchased_on,
                expires_on=expires_on,
            )

    recipe_specs = [
        {
            "name": "親子丼",
            "meal": "Dinner",
            "summary": "鶏むね肉と卵を優先的に使える定番丼。",
            "cook_time_minutes": 20,
            "servings": 2,
            "tags": "rice,quick,japanese",
            "instructions": "玉ねぎを炒め、鶏肉を加えて火を通し、調味して卵でとじる。",
            "ingredients": [
                ("Chicken breast", 250, "g", False),
                ("Egg", 3, "piece", False),
                ("Onion", 1, "piece", False),
                ("Rice", 2, "cup", False),
                ("Soy sauce", 2, "tbsp", False),
            ],
        },
        {
            "name": "豆腐みそスープ",
            "meal": "Breakfast",
            "summary": "期限が近い豆腐を消費しやすい汁物。",
            "cook_time_minutes": 10,
            "servings": 2,
            "tags": "soup,japanese,light",
            "instructions": "鍋に湯を沸かし、具材を煮て最後にみそを溶く。",
            "ingredients": [
                ("Tofu", 1, "block", False),
                ("Carrot", 0.5, "piece", True),
                ("Miso", 2, "tbsp", False),
            ],
        },
        {
            "name": "トマトチーズパスタ",
            "meal": "Lunch",
            "summary": "買い足しが少なく、週末ランチに向くパスタ。",
            "cook_time_minutes": 18,
            "servings": 2,
            "tags": "pasta,italian,comfort",
            "instructions": "パスタをゆで、玉ねぎとトマト缶を煮てソースにし、チーズを絡める。",
            "ingredients": [
                ("Pasta", 200, "g", False),
                ("Tomato can", 1, "can", False),
                ("Onion", 1, "piece", False),
                ("Cheese", 80, "g", False),
            ],
        },
        {
            "name": "ほうれん草オムレツ",
            "meal": "Breakfast",
            "summary": "作りたい料理から入りやすい軽食候補。",
            "cook_time_minutes": 12,
            "servings": 1,
            "tags": "egg,breakfast,quick",
            "instructions": "具材を炒め、卵液を流して半熟で仕上げる。",
            "ingredients": [
                ("Egg", 2, "piece", False),
                ("Spinach", 0.5, "bunch", False),
                ("Milk", 50, "ml", True),
                ("Cheese", 20, "g", True),
            ],
        },
        {
            "name": "ポテトチキングラタン",
            "meal": "Dinner",
            "summary": "食べたい料理起点で買い物候補も作りやすい主菜。",
            "cook_time_minutes": 35,
            "servings": 2,
            "tags": "oven,western,rich",
            "instructions": "具材を炒めて耐熱皿に入れ、チーズをのせて焼く。",
            "ingredients": [
                ("Chicken breast", 200, "g", False),
                ("Potato", 2, "piece", False),
                ("Milk", 150, "ml", False),
                ("Cheese", 80, "g", False),
                ("Onion", 1, "piece", True),
            ],
        },
    ]

    for spec in recipe_specs:
        recipe, _ = Recipe.objects.get_or_create(
            name=spec["name"],
            defaults={
                "meal": spec["meal"],
                "summary": spec["summary"],
                "cook_time_minutes": spec["cook_time_minutes"],
                "servings": spec["servings"],
                "tags": spec["tags"],
                "instructions": spec["instructions"],
            },
        )
        recipe.meal = spec["meal"]
        recipe.summary = spec["summary"]
        recipe.cook_time_minutes = spec["cook_time_minutes"]
        recipe.servings = spec["servings"]
        recipe.tags = spec["tags"]
        recipe.instructions = spec["instructions"]
        recipe.save()

        existing_links = set(recipe.ingredients.values_list("ingredient__name", flat=True))
        for ingredient_name, quantity, unit, is_optional in spec["ingredients"]:
            RecipeIngredient.objects.update_or_create(
                recipe=recipe,
                ingredient=ingredients[ingredient_name],
                defaults={
                    "quantity": quantity,
                    "unit": unit,
                    "is_optional": is_optional,
                },
            )
            existing_links.discard(ingredient_name)

        if existing_links:
            recipe.ingredients.filter(ingredient__name__in=existing_links).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0003_ingredient_recipe_pantryitem_recipeingredient"),
    ]

    operations = [
        migrations.RunPython(seed_planner_catalog, migrations.RunPython.noop),
    ]
