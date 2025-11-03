# backend/accounts/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
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
    OrdenViewSet,
    ChoferListView,
    MecanicoListView,
    SeguridadAgendaView,
    MisProximasCitasView,
    mecanico_dashboard_stats,
    RegistrarSalidaView,
    OrdenesPendientesSalidaView,
    MecanicoAgendaView,
    NotificacionViewSet

)

router = DefaultRouter()
router.register(r'vehiculos', VehiculoViewSet, basename='vehiculo')
router.register(r'agendamientos', AgendamientoViewSet, basename='agendamiento')
router.register(r'ordenes', OrdenViewSet, basename='orden')
router.register(r'notificaciones', NotificacionViewSet, basename='notificacion') # --- 👈 AÑADE ESTA LÍNEA
urlpatterns = [
    # Autenticación
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    
    # Usuario actual
    path("users/me/", UserDetailView.as_view(), name="user-detail"),
    path("users/me/change-password/", ChangePasswordView.as_view(), name="change-password"),
    
    # Gestión de usuarios
    path("users/list/", UserListView.as_view(), name="user-list"),
    path("users/create/", UserCreateAPIView.as_view(), name="user-create"),
    path("users/<int:id>/", UserRetrieveUpdateAPIView.as_view(), name="user-detail-update"),
    path('choferes/', ChoferListView.as_view(), name='chofer-list'),
    path('mecanicos/', MecanicoListView.as_view(), name='mecanico-list'),
    path('mecanicos/<int:mecanico_id>/agenda/', MecanicoAgendaView.as_view(), name='mecanico-agenda'),
    path('agenda/seguridad/', SeguridadAgendaView.as_view(), name='seguridad-agenda-list'),
    # Dashboard del supervisor - RUTA CORREGIDA
    path("dashboard/supervisor/stats/", supervisor_dashboard_stats, name="dashboard-supervisor-stats"),
    path('mecanico/proximas-citas/', MisProximasCitasView.as_view(), name='mecanico-proximas-citas'),
    # Reset de contraseña
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset-confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path('dashboard/mecanico/stats/', mecanico_dashboard_stats, name='mecanico-dashboard-stats'),


    path('ordenes/pendientes-salida/', OrdenesPendientesSalidaView.as_view(), name='ordenes-pendientes-salida'
        ),
        
        # POST /api/ordenes/123/registrar-salida/
        path('ordenes/<int:pk>/registrar-salida/', RegistrarSalidaView.as_view(), name='registrar-salida'
        ),




    # Incluir rutas del router (vehiculos, agendamientos, ordenes)
    path('', include(router.urls)),
]