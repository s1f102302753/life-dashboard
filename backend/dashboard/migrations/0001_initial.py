from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="CookingLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("meal", models.CharField(max_length=32)),
                ("menu", models.CharField(max_length=255)),
                ("calories", models.PositiveIntegerField()),
                ("status", models.CharField(max_length=32)),
                ("cooked_on", models.DateField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["cooked_on", "created_at"]},
        ),
    ]
