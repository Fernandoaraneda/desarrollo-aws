# --- IMPORTS ---
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status, generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes

from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from django.utils.timezone import now, timedelta
from django.db.models import Count, Avg, F
from django.db.models.functions import TruncDay

User = get_user_model()

# --- MODELOS Y SERIALIZERS ---
from .models import Orden, Agendamiento, Vehiculo
from .serializers import (
    LoginSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    UserCreateUpdateSerializer,
    VehiculoSerializer,
    AgendamientoSerializer,
)

# --- PERMISOS PERSONALIZADOS ---
class IsSupervisor(permissions.BasePermission):
    """
    Permiso personalizado para permitir el acceso solo a usuarios 
    que pertenezcan al grupo "Supervisor".
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.groups.filter(name="Supervisor").exists()
        )


# --- VISTAS DE AUTENTICACIÓN Y PERFIL ---
class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        user_data = UserSerializer(user).data
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": user_data,
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response(
                {"error": "Se requiere el correo"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"message": "Si el correo está registrado, se enviará un enlace de recuperación."},
                status=status.HTTP_200_OK,
            )

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_link = f"http://localhost:5173/set-new-password?uid={uid}&token={token}"

        send_mail(
            "Restablecer contraseña para Taller PepsiCo",
            f"Hola {user.first_name},\n\nUsa este enlace para restablecer tu contraseña: {reset_link}\n\nSi no solicitaste esto, ignora este mensaje.",
            "noreply@pepsico-taller.com",
            [email],
            fail_silently=False,
        )

        return Response(
            {"message": "Si el correo está registrado, se enviará un enlace de recuperación."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("password")

        if not uidb64 or not token or not new_password:
            return Response(
                {"error": "Datos incompletos"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "El enlace de restablecimiento es inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"error": "El enlace de restablecimiento es inválido o ha expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response({"error": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"message": "Contraseña restablecida con éxito"}, status=status.HTTP_200_OK)


class UserDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

        if not user.check_password(old_password):
            return Response(
                {"error": "La contraseña actual es incorrecta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        return Response({"message": "Contraseña cambiada con éxito."}, status=status.HTTP_200_OK)


# --- VISTAS DE USUARIOS ---
class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by("first_name")
    serializer_class = UserSerializer
    permission_classes = [IsSupervisor]


class UserCreateAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateUpdateSerializer
    permission_classes = [IsSupervisor]


class UserRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateUpdateSerializer
    permission_classes = [IsSupervisor]
    lookup_field = "id"


# --- DASHBOARD SUPERVISOR ---
dias_semana = {0: "Lun", 1: "Mar", 2: "Mié", 3: "Jue", 4: "Vie", 5: "Sáb", 6: "Dom"}

# REEMPLAZA la función supervisor_dashboard_stats en tu views.py por esta versión corregida:

@api_view(["GET"])
@permission_classes([IsSupervisor])
def supervisor_dashboard_stats(request):
    """
    Vista corregida del dashboard del supervisor con cálculos precisos
    """
    today = now().date()
    start_of_month = today.replace(day=1)
    start_of_week = today - timedelta(days=today.weekday())

    # 🔧 1. VEHÍCULOS EN TALLER - Contar vehículos únicos con órdenes activas
    vehiculos_en_taller = Orden.objects.filter(
        estado__in=["Ingresado", "En Diagnostico", "En Proceso", "Pausado"]
    ).values('vehiculo').distinct().count()

    # 🔧 2. AGENDAMIENTOS HOY - Solo programados para hoy
    agendamientos_hoy = Agendamiento.objects.filter(
        fecha_hora_programada__date=today, 
        estado="Programado"
    ).count()

    # 🔧 3. ÓRDENES FINALIZADAS ESTE MES
    ordenes_finalizadas_mes = Orden.objects.filter(
        estado="Finalizado", 
        fecha_entrega_real__gte=start_of_month
    ).count()

    # 🔧 4. TIEMPO PROMEDIO DE REPARACIÓN
    ordenes_completadas = Orden.objects.filter(
        estado="Finalizado", 
        fecha_entrega_real__isnull=False,
        fecha_ingreso__isnull=False
    )
    
    tiempo_promedio_str = "N/A"
    if ordenes_completadas.exists():
        tiempo_promedio_dias = ordenes_completadas.aggregate(
            avg_duration=Avg(F("fecha_entrega_real") - F("fecha_ingreso"))
        )["avg_duration"]
        
        if tiempo_promedio_dias:
            total_dias = tiempo_promedio_dias.total_seconds() / (60 * 60 * 24)
            tiempo_promedio_str = f"{total_dias:.1f} días"

    # 🔧 5. ÓRDENES POR ESTADO (TODAS LAS ÓRDENES, NO SOLO ACTIVAS)
    ordenes_por_estado = list(
        Orden.objects.values("estado")
        .annotate(cantidad=Count("id"))
        .order_by("estado")
    )

    # 🔧 6. ÓRDENES DE LA ÚLTIMA SEMANA
    ordenes_semana_raw = (
        Orden.objects.filter(fecha_ingreso__date__gte=start_of_week)
        .annotate(dia_semana=TruncDay("fecha_ingreso"))
        .values("dia_semana")
        .annotate(creadas=Count("id"))
        .order_by("dia_semana")
    )

    # Crear lista completa de los 7 días con datos
    ordenes_ultima_semana = []
    for i in range(7):
        fecha_dia = start_of_week + timedelta(days=i)
        dia_nombre = dias_semana.get(fecha_dia.weekday(), "")
        
        # Buscar si hay datos para este día
        ordenes_del_dia = 0
        for item in ordenes_semana_raw:
            if item["dia_semana"].date() == fecha_dia:
                ordenes_del_dia = item["creadas"]
                break
        
        ordenes_ultima_semana.append({
            "dia": dia_nombre,
            "creadas": ordenes_del_dia
        })

    # 🔧 7. ÓRDENES RECIENTES (con mejor manejo de datos nulos)
    ordenes_recientes = list(
        Orden.objects.select_related("vehiculo", "usuario_asignado")
        .order_by("-fecha_ingreso")[:10]  # Incrementé a 10 para mostrar más
        .values(
            "id",
            "vehiculo__patente",
            "estado",
            "usuario_asignado__first_name",
            "usuario_asignado__last_name",
            "usuario_asignado__username",
        )
    )

    ordenes_recientes_data = []
    for o in ordenes_recientes:
        # Mejor manejo de nombres de mecánicos
        first_name = o.get('usuario_asignado__first_name', '') or ''
        last_name = o.get('usuario_asignado__last_name', '') or ''
        username = o.get('usuario_asignado__username', '') or ''
        
        mecanico_nombre = f"{first_name} {last_name}".strip()
        if not mecanico_nombre and username:
            mecanico_nombre = username
        if not mecanico_nombre:
            mecanico_nombre = "No asignado"
        
        ordenes_recientes_data.append({
            "id": o["id"],
            "patente": o["vehiculo__patente"] or "Sin patente",
            "estado": o["estado"],
            "mecanico": mecanico_nombre,
        })

    # 🔧 8. RESPUESTA CON LOGGING PARA DEBUG
    response_data = {
        "kpis": {
            "vehiculosEnTaller": vehiculos_en_taller,
            "agendamientosHoy": agendamientos_hoy,
            "ordenesFinalizadasMes": ordenes_finalizadas_mes,
            "tiempoPromedioRep": tiempo_promedio_str,
        },
        "ordenesPorEstado": ordenes_por_estado,
        "ordenesUltimaSemana": ordenes_ultima_semana,
        "ordenesRecientes": ordenes_recientes_data,
    }
    
    # Debug logging (puedes remover esto después de confirmar que funciona)
    print(f"🔍 Debug Dashboard - Vehículos en taller: {vehiculos_en_taller}")
    print(f"🔍 Debug Dashboard - Órdenes finalizadas mes: {ordenes_finalizadas_mes}")
    print(f"🔍 Debug Dashboard - Estados: {ordenes_por_estado}")
    
    return Response(response_data)


# --- VIEWSETS ---
from rest_framework import viewsets, permissions
from .models import Vehiculo, Agendamiento
from .serializers import VehiculoSerializer, AgendamientoSerializer

# --- VIEWSETS ---
class VehiculoViewSet(viewsets.ModelViewSet):
    serializer_class = VehiculoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.groups.filter(name='Chofer').exists():
            # Solo sus vehículos asignados
            return Vehiculo.objects.filter(chofer=user)
        # Supervisores y mecánicos ven todos
        return Vehiculo.objects.all()



class AgendamientoViewSet(viewsets.ModelViewSet):
    """
    Agendamientos:
    - Supervisores y mecánicos: ven todos
    - Choferes: solo los agendamientos de sus vehículos
    """
    serializer_class = AgendamientoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Supervisores y mecánicos ven todos
        if user.groups.filter(name__in=['Supervisor', 'Mecanico']).exists():
            return Agendamiento.objects.all()

        # Choferes ven solo los agendamientos de sus vehículos
        elif user.groups.filter(name='Chofer').exists():
            return Agendamiento.objects.filter(vehiculo__chofer=user)

        # Otros roles no ven nada
        return Agendamiento.objects.none()

    def perform_create(self, serializer):
        # Asigna automáticamente el usuario que crea el agendamiento
        serializer.save(creado_por=self.request.user)

# Vistas para usuarios
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from .serializers import UserSerializer

User = get_user_model()

class ChoferListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(groups__name='Chofer').order_by('first_name')








from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Orden, OrdenHistorialEstado, Usuario, Vehiculo, Agendamiento
from .serializers import (
    OrdenSerializer, 
    UserSerializer, 
    VehiculoSerializer, 
    AgendamientoSerializer
)

# --- PERMISOS PERSONALIZADOS ---
class IsSupervisorOrMecanico(permissions.BasePermission):
    """
    Permiso personalizado para permitir acceso solo a Supervisores o Mecánicos.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.groups.filter(name='Supervisor').exists() or
            request.user.groups.filter(name='Mecanico').exists()
        )

# --- VIEWSETS ---
# Aquí irían tus otros ViewSets (User, Vehiculo, Agendamiento) para mantener todo ordenado.

class OrdenViewSet(viewsets.ModelViewSet):
    """
    ViewSet para ver y gestionar las Órdenes de Servicio.
    """
    queryset = Orden.objects.all().order_by('-fecha_ingreso')
    serializer_class = OrdenSerializer
    permission_classes = [permissions.IsAuthenticated] # Permiso base para todas las acciones

    def get_permissions(self):
        """
        Asigna permisos más restrictivos para acciones específicas.
        Solo Supervisores y Mecánicos pueden cambiar el estado.
        """
        if self.action in ['cambiar_estado']:
            self.permission_classes = [IsSupervisorOrMecanico]
        return super().get_permissions()

    @action(detail=True, methods=['post'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None):
        """
        Endpoint para cambiar el estado de una orden y registrarlo en el historial.
        Espera un POST con: {"estado": "Nuevo Estado", "motivo": "Opcional"}
        """
        orden = self.get_object()
        nuevo_estado = request.data.get('estado')
        motivo = request.data.get('motivo', '')

        # Validación simple para asegurar que el estado enviado es válido
        if not nuevo_estado or nuevo_estado not in [choice[0] for choice in Orden.ESTADOS_ORDEN]:
            return Response({'error': 'Debe proporcionar un estado válido.'}, status=400)

        estado_anterior = orden.estado
        orden.estado = nuevo_estado
        orden.save()

        # Registrar el cambio en el historial
        OrdenHistorialEstado.objects.create(
            orden=orden,
            estado=nuevo_estado, # Guardamos solo el estado nuevo
            usuario=request.user,
            motivo=motivo
        )
        
        # Devolvemos la orden completamente actualizada con su nuevo historial
        serializer = self.get_serializer(orden)
        return Response(serializer.data)
