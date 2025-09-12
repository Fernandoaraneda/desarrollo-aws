# backend/accounts/urls.py

from django.urls import path, include # 👈 Asegúrate de importar 'include'
from rest_framework.routers import DefaultRouter # 👈 Importa el Router
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView, 
    PasswordResetRequestView, 
    PasswordResetConfirmView, 
    UserDetailView, 
    ChangePasswordView,
    UserListView,
    UserCreateAPIView,
    UserRetrieveUpdateAPIView,
    supervisor_dashboard_stats,
    VehiculoViewSet,
    AgendamientoViewSet,
    ChoferListView
)

# --- Se crea un router para las vistas basadas en ViewSet ---
# El router crea automáticamente las URLs para:
# - GET /api/v1/vehiculos/ (listar todos)
# - POST /api/v1/vehiculos/ (crear uno nuevo)
# - GET /api/v1/vehiculos/{patente}/ (ver uno)
# - PUT/PATCH /api/v1/vehiculos/{patente}/ (actualizar uno)
# - DELETE /api/v1/vehiculos/{patente}/ (eliminar uno)
router = DefaultRouter()
router.register(r'vehiculos', VehiculoViewSet, basename='vehiculo')
router.register(r'agendamientos', AgendamientoViewSet, basename='agendamiento')
# --- Lista de URLs de la aplicación ---
urlpatterns = [
    # Rutas que ya tenías (autenticación, usuarios, dashboard)
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("users/me/", UserDetailView.as_view(), name="user-detail"),
    path("users/me/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("users/list/", UserListView.as_view(), name="user-list"),
    path("users/create/", UserCreateAPIView.as_view(), name="user-create"),
    path("users/<int:id>/", UserRetrieveUpdateAPIView.as_view(), name="user-detail-update"),
    path("dashboard/supervisor/", supervisor_dashboard_stats, name="dashboard-supervisor"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset-confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),

    # 👇 Se añade esta línea para incluir todas las URLs del router
    path('', include(router.urls)),
    path('choferes/', ChoferListView.as_view(), name='chofer-list'),
]