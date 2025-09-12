# backend/create_superuser.py
import os
import django
from django.contrib.auth import get_user_model

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")  # ajusta si tu settings.py está en otra ruta
django.setup()

User = get_user_model()

username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@example.com")
password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "admin123")

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f"Superuser {username} creado")
else:
    print(f"Superuser {username} ya existe")
