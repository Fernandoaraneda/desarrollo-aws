# core/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse  # 👈 importar HttpResponse

def healthz(request):
    return HttpResponse("OK")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('accounts.urls')),
    path('healthz', healthz),  # 👈 Health Check
]
