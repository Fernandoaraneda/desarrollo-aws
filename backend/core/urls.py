# core/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 👇 Se añade el prefijo para que coincida con el frontend
    path('api/v1/', include('accounts.urls')), 
]