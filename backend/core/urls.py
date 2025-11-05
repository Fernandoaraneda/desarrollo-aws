# core/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse  # 👈 importar HttpResponse
from django.conf import settings
from django.conf.urls.static import static
from accounts.views import LoginView

def healthz(request):
    return HttpResponse("OK")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('accounts.urls')),
    path('healthz', healthz),  # 👈 Health Check
    path('login/', LoginView.as_view(), name="login-legacy"),
]


urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)