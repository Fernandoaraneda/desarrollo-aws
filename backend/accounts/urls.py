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
    NotificacionViewSet,
    LlaveVehiculoViewSet, 
    PrestamoLlaveViewSet,
    LlaveHistorialEstadoViewSet,
    HistorialSeguridadViewSet,
    ProductoViewSet,
    OrdenItemViewSet,
    TallerViewSet,
    exportar_bitacora_seguridad,
    exportar_snapshot_taller_pdf,
    exportar_consumo_repuestos,
    exportar_inventario_valorizado,
    exportar_quiebres_stock,
    exportar_productividad_mecanicos,
    exportar_tiempos_taller,
    exportar_solicitudes_grua,
    exportar_historial_prestamos,
    exportar_inventario_llaves_pdf,
    exportar_frecuencia_fallas, 
    exportar_hoja_vida_vehiculo_pdf,
)

router = DefaultRouter()
router.register(r'vehiculos', VehiculoViewSet, basename='vehiculo')
router.register(r'agendamientos', AgendamientoViewSet, basename='agendamiento')
router.register(r'ordenes', OrdenViewSet, basename='orden')
router.register(r'notificaciones', NotificacionViewSet, basename='notificacion')
router.register(r'talleres', TallerViewSet, basename='taller')
router.register(r'llaves', LlaveVehiculoViewSet, basename='llave')
router.register(r'prestamos-llaves', PrestamoLlaveViewSet, basename='prestamo-llave')
router.register(r'llaves-historial-estado', LlaveHistorialEstadoViewSet, basename='llave-historial')
router.register(r'historial-seguridad', HistorialSeguridadViewSet, basename='historial-seguridad')
router.register(r'productos', ProductoViewSet, basename='producto') 
router.register(r'orden-items', OrdenItemViewSet, basename='orden-item') 




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


    path('ordenes/pendientes-salida/', OrdenesPendientesSalidaView.as_view(), name='ordenes-pendientes-salida'),
    path('ordenes/<int:pk>/registrar-salida/', RegistrarSalidaView.as_view(), name='registrar-salida'),
    
    
    # --- Reportes Administrativos ---
    path('reportes/seguridad/', exportar_bitacora_seguridad, name='reporte-seguridad'),
    path('reportes/seguridad/snapshot-pdf/', exportar_snapshot_taller_pdf, name='reporte-seguridad-pdf'),
    path('reportes/repuestos/consumo/', exportar_consumo_repuestos, name='reporte-repuestos-consumo'),
    path('reportes/repuestos/inventario-valorizado/', exportar_inventario_valorizado, name='export-inventario-valorizado'),
    path('reportes/repuestos/quiebres-stock/', exportar_quiebres_stock, name='export-quiebres-stock'),
    path('reportes/mecanicos/productividad/', exportar_productividad_mecanicos, name='export-productividad-mecanicos'),
    path('reportes/mecanicos/tiempos-taller/',exportar_tiempos_taller, name='export-tiempos-taller'),
    path('reportes/gruas/solicitudes/', exportar_solicitudes_grua, name='export-solicitudes-grua'),
    path('reportes/llaves/historial-prestamos/', exportar_historial_prestamos, name='export-historial-prestamos'),
    path('reportes/llaves/inventario-pdf/', exportar_inventario_llaves_pdf, name='export-inventario-llaves-pdf'),
    path('reportes/flota/frecuencia-fallas/', exportar_frecuencia_fallas, name='export-frecuencia-fallas'),
    path('reportes/flota/hoja-vida-pdf/', exportar_hoja_vida_vehiculo_pdf, name='export-hoja-vida-pdf'),
    
    
    
    # Incluir rutas del router (vehiculos, agendamientos, ordenes)
    path('', include(router.urls)),
]