from django.db import models


class Ingredient(models.Model):
    name = models.CharField(max_length=128, unique=True)
    category = models.CharField(max_length=64, blank=True)
    default_unit = models.CharField(max_length=32, default="item")

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class PantryItem(models.Model):
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="pantry_items")
    quantity = models.FloatField()
    unit = models.CharField(max_length=32, default="item")
    storage = models.CharField(max_length=64, default="Fridge")
    purchased_on = models.DateField(null=True, blank=True)
    expires_on = models.DateField(null=True, blank=True)
    note = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["expires_on", "ingredient__name", "-updated_at"]

    def __str__(self) -> str:
        return f"{self.ingredient.name} ({self.quantity} {self.unit})"


class Recipe(models.Model):
    name = models.CharField(max_length=128, unique=True)
    meal = models.CharField(max_length=32, default="Dinner")
    summary = models.TextField(blank=True)
    cook_time_minutes = models.PositiveIntegerField(default=20)
    servings = models.PositiveIntegerField(default=2)
    tags = models.CharField(max_length=255, blank=True)
    instructions = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="ingredients")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="recipe_links")
    quantity = models.FloatField()
    unit = models.CharField(max_length=32, default="item")
    is_optional = models.BooleanField(default=False)

    class Meta:
        ordering = ["recipe__name", "ingredient__name"]
        unique_together = ("recipe", "ingredient")

    def __str__(self) -> str:
        return f"{self.recipe.name}: {self.ingredient.name}"


class CookingLog(models.Model):
    meal = models.CharField(max_length=32)
    menu = models.CharField(max_length=255)
    calories = models.PositiveIntegerField()
    status = models.CharField(max_length=32)
    cooked_on = models.DateField()
    note = models.TextField(blank=True)
    photo = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["cooked_on", "created_at"]

    def __str__(self) -> str:
        return f"{self.meal}: {self.menu}"
