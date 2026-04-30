from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("dashboard", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="cookinglog",
            name="note",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="cookinglog",
            name="photo",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
