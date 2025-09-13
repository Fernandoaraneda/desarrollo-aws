# backend/accounts/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

# CAMBIO: Se importa el nuevo OrdenViewSet
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
    OrdenViewSet, # <--- IMPORTADO
    ChoferListView
)

router = DefaultRouter()
router.register(r'vehiculos', VehiculoViewSet, basename='vehiculo')
router.register(r'agendamientos', AgendamientoViewSet, basename='agendamiento')
# CAMBIO: Se registra el nuevo ViewSet para las órdenes
router.register(r'ordenes', OrdenViewSet, basename='orden') # <--- AÑADIDO

urlpatterns = [
    # Rutas existentes de autenticación y usuarios
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
    path('choferes/', ChoferListView.as_view(), name='chofer-list'),

    # Se incluyen todas las URLs del router (vehiculos, agendamientos y ahora ordenes)
    path('', include(router.urls)),
]
