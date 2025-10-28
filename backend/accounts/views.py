# accounts/views.py (versión limpia y corregida)

from datetime import datetime, timedelta
from django.conf import settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.timezone import now, make_aware
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import status, generics, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from django.db.models import Count, Avg, F, DateField
from django.db.models.functions import TruncDay

from .models import Orden, Agendamiento, Vehiculo, OrdenHistorialEstado, OrdenPausa, OrdenDocumento, Notificacion
from .serializers import (
    LoginSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    UserCreateUpdateSerializer,
    VehiculoSerializer,
    AgendamientoSerializer,
    OrdenSerializer,
    OrdenDocumentoSerializer
)

User = get_user_model()


# --------------------
# Permisos personalizados
# --------------------
class IsSupervisor(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.groups.filter(name='Supervisor').exists())

class IsSupervisorOrMecanico(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.groups.filter(name__in=['Supervisor', 'Mecanico']).exists())

class IsSupervisorOrSeguridad(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.groups.filter(name__in=['Supervisor', 'Seguridad']).exists())


# --------------------
# Autenticación y perfil
# --------------------
class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        user_data = UserSerializer(user).data
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": user_data,
        }, status=status.HTTP_200_OK)


class PasswordResetRequestView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Se requiere el correo"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # No revelar si el correo existe o no
            return Response({"message": "Si el correo está registrado, se enviará un enlace de recuperación."}, status=status.HTTP_200_OK)

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        frontend = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend.rstrip('/')}/set-new-password?uid={uid}&token={token}"

        # En producción: mover esto a una task asíncrona (Celery, RQ...)
        send_mail(
            "Restablecer contraseña para Taller PepsiCo",
            f"Hola {user.first_name},\n\nUsa este enlace para restablecer tu contraseña: {reset_link}\n\nSi no solicitaste esto, ignora este mensaje.",
            "noreply@pepsico-taller.com",
            [email],
            fail_silently=False,
        )
        return Response({"message": "Si el correo está registrado, se enviará un enlace de recuperación."}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("password")

        if not uidb64 or not token or not new_password:
            return Response({"error": "Datos incompletos"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid_decoded = urlsafe_base64_decode(uidb64).decode()
            uid = int(uid_decoded)
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"error": "El enlace de restablecimiento es inválido."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"error": "El enlace de restablecimiento es inválido o ha expirado."}, status=status.HTTP_400_BAD_REQUEST)

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
            return Response({"error": "La contraseña actual es incorrecta."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response({"error": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"message": "Contraseña cambiada con éxito."}, status=status.HTTP_200_OK)


# --------------------
# Gestión de usuarios (Supervisor)
# --------------------
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


class ChoferListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return User.activos.filter(groups__name='Chofer').order_by('first_name')


# --------------------
# Dashboard supervisor (versión segura)
# --------------------
dias_semana = {0: "Lun", 1: "Mar", 2: "Mié", 3: "Jue", 4: "Vie", 5: "Sáb", 6: "Dom"}

# backend/accounts/views.py
# (Asegúrate de que estas importaciones estén al principio de tu archivo)
from datetime import datetime, timedelta
from django.utils import timezone
from django.utils.timezone import now, make_aware
from django.db.models import Count, Avg, F, DateField
from django.db.models.functions import TruncDay
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from .models import Orden, Agendamiento  # <-- ¡ASEGÚRATE DE IMPORTAR AGENDAMIENTO!


# ... (El resto de tus vistas como LoginView, VehiculoViewSet, etc.) ...

# --- ESTA ES LA FUNCIÓN MODIFICADA ---
@api_view(["GET"])
@permission_classes([IsSupervisor])
def supervisor_dashboard_stats(request):
    today = now().date()
    start_of_month_dt = make_aware(datetime.combine(today.replace(day=1), datetime.min.time()))
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week_dt = make_aware(datetime.combine(start_of_week, datetime.min.time()))

    # --- ✅ 1. CONSULTA CORREGIDA ---
    # Cambiamos 'PENDIENTE' por 'Agendamiento.Estado.PROGRAMADO' 
    # para que coincida con tu models.py
    pendientes_aprobacion = Agendamiento.objects.filter(
        estado=Agendamiento.Estado.PROGRAMADO
    ).count()
    # --- FIN DE LA CORRECCIÓN ---

    # Vehículos en taller (fallback si no existe manager 'activas')
    try:
        vehiculos_en_taller = Orden.objects.activas().values('vehiculo').distinct().count()
    except Exception:
        # Fallback si 'activas' no existe o falla
        vehiculos_en_taller = Orden.objects.exclude(estado=Orden.Estado.FINALIZADO).values('vehiculo').distinct().count()


    # Agendamientos para HOY (usamos CONFIRMADO para alinearnos con SeguridadAgendaView)
    start_today = make_aware(datetime.combine(today, datetime.min.time()))
    end_today = start_today + timedelta(days=1)
    agendamientos_hoy = Agendamiento.objects.filter(
        estado=Agendamiento.Estado.CONFIRMADO, # Correcto
        fecha_hora_programada__gte=start_today,
        fecha_hora_programada__lt=end_today
    ).count()

    # Órdenes finalizadas este mes
    ordenes_finalizadas_mes = Orden.objects.filter(
        estado=Orden.Estado.FINALIZADO, # Correcto
        fecha_entrega_real__gte=start_of_month_dt
    ).count()

    # Tiempo promedio de reparación (en días, con manejo de nulls)
    ordenes_completadas = Orden.objects.filter(
        estado=Orden.Estado.FINALIZADO,
        fecha_entrega_real__isnull=False,
        fecha_ingreso__isnull=False
    )
    tiempo_promedio_str = "N/A"
    if ordenes_completadas.exists():
        avg_delta = ordenes_completadas.aggregate(avg_duration=Avg(F("fecha_entrega_real") - F("fecha_ingreso")))["avg_duration"]
        if avg_delta:
            total_dias = avg_delta.total_seconds() / (60 * 60 * 24)
            tiempo_promedio_str = f"{total_dias:.1f} días"

    # Órdenes por estado
    ordenes_por_estado = list(
        Orden.objects.values("estado").annotate(cantidad=Count("id")).order_by("estado")
    )

    # Órdenes última semana (por día)
    ordenes_semana_raw = (
        Orden.objects.filter(fecha_ingreso__gte=start_of_week_dt)
        .annotate(dia_semana=TruncDay("fecha_ingreso", output_field=DateField()))
        .values("dia_semana")
        .annotate(creadas=Count("id"))
        .order_by("dia_semana")
    )
    ordenes_ultima_semana = []
    dias_semana_map = {0: "Lun", 1: "Mar", 2: "Mié", 3: "Jue", 4: "Vie", 5: "Sáb", 6: "Dom"}
    for i in range(7):
        fecha_dia = start_of_week + timedelta(days=i)
        dia_nombre = dias_semana_map.get(fecha_dia.weekday(), "")
        cre = 0
        for item in ordenes_semana_raw:
            if item["dia_semana"] == fecha_dia:
                cre = item["creadas"]
                break
        ordenes_ultima_semana.append({"dia": dia_nombre, "creadas": cre})

    # Órdenes recientes
    ordenes_recientes = list(
        Orden.objects.select_related("vehiculo", "usuario_asignado")
            .order_by("-fecha_ingreso")[:10]
            .values("id", "vehiculo__patente", "estado", "usuario_asignado__first_name", "usuario_asignado__last_name", "usuario_asignado__username")
    )
    ordenes_recientes_data = []
    for o in ordenes_recientes:
        first_name = o.get('usuario_asignado__first_name') or ''
        last_name = o.get('usuario_asignado__last_name') or ''
        username = o.get('usuario_asignado__username') or ''
        mecanico_nombre = f"{first_name} {last_name}".strip() or username or "No asignado"
        ordenes_recientes_data.append({
            "id": o["id"],
            "patente": o.get("vehiculo__patente") or "Sin patente",
            "estado": o["estado"],
            "mecanico": mecanico_nombre,
        })

    # --- ✅ 2. DATO AÑADIDO A LA RESPUESTA ---
    response_data = {
        "kpis": {
            "vehiculosEnTaller": vehiculos_en_taller,
            "agendamientosHoy": agendamientos_hoy,
            "ordenesFinalizadasMes": ordenes_finalizadas_mes,
            "tiempoPromedioRep": tiempo_promedio_str,
        },
        "alertas": {
            "pendientesAprobacion": pendientes_aprobacion, # <-- Este dato ahora será correcto
        },
        "ordenesPorEstado": ordenes_por_estado,
        "ordenesUltimaSemana": ordenes_ultima_semana,
        "ordenesRecientes": ordenes_recientes_data,
    }
    return Response(response_data, status=status.HTTP_200_OK)
# --------------------
# ViewSets
# --------------------
class VehiculoViewSet(viewsets.ModelViewSet):
    serializer_class = VehiculoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'reactivar']:
            return Vehiculo.objects.all()
        user = self.request.user
        if user.groups.filter(name='Chofer').exists():
            return Vehiculo.activos.filter(chofer=user)
        return Vehiculo.activos.all()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

    @action(detail=False, methods=['get'], url_path='inactivos', permission_classes=[IsAuthenticated])
    def inactivos(self, request):
        vehiculos_inactivos = Vehiculo.objects.filter(is_active=False)
        user = self.request.user
        if user.groups.filter(name='Chofer').exists():
            vehiculos_inactivos = vehiculos_inactivos.filter(chofer=user)
        serializer = self.get_serializer(vehiculos_inactivos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reactivar', permission_classes=[IsSupervisor])
    def reactivar(self, request, pk=None):
        vehiculo = self.get_object()
        vehiculo.is_active = True
        vehiculo.save()
        return Response(self.get_serializer(vehiculo).data, status=status.HTTP_200_OK)


class AgendamientoViewSet(viewsets.ModelViewSet):
    serializer_class = AgendamientoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.groups.filter(name__in=['Supervisor', 'Mecanico', 'Seguridad']).exists():
            return Agendamiento.objects.select_related('vehiculo', 'mecanico_asignado').all().order_by('fecha_hora_programada')
        elif user.groups.filter(name='Chofer').exists():
            return Agendamiento.objects.filter(vehiculo__chofer=user).order_by('fecha_hora_programada')
        return Agendamiento.objects.none()

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    @action(detail=True, methods=['post'], url_path='confirmar-y-asignar', permission_classes=[IsSupervisor])
    def confirmar_y_asignar(self, request, pk=None):
        agendamiento = self.get_object()
        mecanico_id_raw = request.data.get('mecanico_id')
        try:
            mecanico_id = int(mecanico_id_raw)
        except (TypeError, ValueError):
            return Response({'error': 'ID de mecánico inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            mecanico = User.objects.get(id=mecanico_id, groups__name='Mecanico')
        except User.DoesNotExist:
            return Response({'error': 'El usuario seleccionado no es un mecánico válido.'}, status=status.HTTP_404_NOT_FOUND)

        agendamiento.mecanico_asignado = mecanico
        agendamiento.estado = Agendamiento.Estado.CONFIRMADO
        agendamiento.save()
        return Response(self.get_serializer(agendamiento).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='registrar-ingreso', permission_classes=[IsSupervisorOrSeguridad])
    def registrar_ingreso(self, request, pk=None):
        agendamiento = self.get_object()
        if agendamiento.estado != Agendamiento.Estado.CONFIRMADO:
            return Response({'error': 'Solo se puede registrar el ingreso de una cita confirmada.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            nueva_orden = Orden.objects.create(
                vehiculo=agendamiento.vehiculo,
                agendamiento_origen=agendamiento,
                descripcion_falla=agendamiento.motivo_ingreso,
                usuario_asignado=agendamiento.mecanico_asignado,
            )
            if agendamiento.mecanico_asignado:
                mensaje = f"Se te ha asignado una nueva orden (#{nueva_orden.id}) para el vehículo {nueva_orden.vehiculo.patente}."
                Notificacion.objects.create(
                    usuario=agendamiento.mecanico_asignado,
                    mensaje=mensaje,
                    link=f"/ordenes/{nueva_orden.id}" # Link para que al hacer clic, vaya al detalle de la orden
                )
            

            # Conservador: mantenemos el comportamiento original (FINALIZADO) para no cambiar el flujo actual.
            agendamiento.estado = Agendamiento.Estado.FINALIZADO
            agendamiento.save()

            
            

        return Response({'message': 'Ingreso registrado y orden creada.', 'orden_id': nueva_orden.id}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='cancelar', permission_classes=[IsSupervisor])
    def cancelar(self, request, pk=None):
        agendamiento = self.get_object()
        agendamiento.estado = Agendamiento.Estado.CANCELADO
        agendamiento.save()
        return Response(self.get_serializer(agendamiento).data, status=status.HTTP_200_OK)


class OrdenViewSet(viewsets.ModelViewSet):
    serializer_class = OrdenSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.groups.filter(name='Supervisor').exists():
            return Orden.objects.select_related('vehiculo', 'usuario_asignado').all().order_by('-fecha_ingreso')
        elif user.groups.filter(name='Mecanico').exists():
            return Orden.objects.filter(usuario_asignado=user).select_related('vehiculo').order_by('-fecha_ingreso')
        elif user.groups.filter(name='Chofer').exists():
            return Orden.objects.filter(vehiculo__chofer=user).select_related('vehiculo').order_by('-fecha_ingreso')
        return Orden.objects.none()

    def get_permissions(self):
        if self.action in ['cambiar_estado']:
            self.permission_classes = [IsSupervisorOrMecanico]
        return super().get_permissions()

    @action(detail=True, methods=['post'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None):
        orden = self.get_object()
        nuevo_estado = request.data.get('estado')
        motivo = request.data.get('motivo', '')

        try:
            valid_values = list(Orden.Estado.values)
        except Exception:
            valid_values = [c[0] for c in getattr(Orden, 'Estado', {}).choices] if hasattr(Orden, 'Estado') else []
        if not nuevo_estado or (valid_values and nuevo_estado not in valid_values):
            return Response({'error': 'Debe proporcionar un estado válido.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            orden.estado = nuevo_estado
           # --- LÍNEA PROBLEMÁTICA ELIMINADA ---
            # if nuevo_estado == Orden.Estado.FINALIZADO:
            #     orden.fecha_entrega_real = timezone.now() 
            # --------------------------------------         
            orden.save()
            OrdenHistorialEstado.objects.create(orden=orden, estado=nuevo_estado, usuario=request.user, motivo=motivo)
            

        return Response(self.get_serializer(orden).data, status=status.HTTP_200_OK)
    @action(detail=True, methods=['post'], url_path='pausar')
    def pausar(self, request, pk=None):
        """Pausa una orden de trabajo."""
        orden = self.get_object()
        motivo = request.data.get('motivo', 'Pausa iniciada por el usuario.')

        with transaction.atomic():
            # Cambiamos el estado de la orden a 'Pausado'
            orden.estado = Orden.Estado.PAUSADO
            orden.save()
            
            # Creamos el registro de la pausa
            OrdenPausa.objects.create(orden=orden, usuario=request.user, motivo=motivo)
            
            # Guardamos el historial del cambio de estado
            OrdenHistorialEstado.objects.create(
                orden=orden, estado=Orden.Estado.PAUSADO, usuario=request.user, motivo=motivo
            )

        return Response(self.get_serializer(orden).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reanudar')
    def reanudar(self, request, pk=None):
        """Reanuda una orden de trabajo que estaba en pausa."""
        orden = self.get_object()

        with transaction.atomic():
            # Buscamos la pausa activa (la que no tiene fecha de fin) y la cerramos
            pausa_activa = orden.pausas.filter(fin__isnull=True).first()
            if pausa_activa:
                pausa_activa.fin = timezone.now()
                pausa_activa.save()
            
            # Volvemos la orden al estado 'En Proceso' (o el que consideres por defecto)
            orden.estado = Orden.Estado.EN_PROCESO
            orden.save()

            # Guardamos el historial del cambio de estado
            OrdenHistorialEstado.objects.create(
                orden=orden, estado=Orden.Estado.EN_PROCESO, usuario=request.user, motivo="Trabajo reanudado."
            )

        return Response(self.get_serializer(orden).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='subir-documento')
    def subir_documento(self, request, pk=None):
        """Sube un documento o foto asociado a una orden."""
        orden = self.get_object()
        
        # Usamos un serializer específico para la subida de archivos
        serializer = OrdenDocumentoSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Asignamos la orden y el usuario antes de guardar
            serializer.save(orden=orden, subido_por=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MecanicoListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return User.activos.filter(groups__name='Mecanico').order_by('first_name')


class SeguridadAgendaView(generics.ListAPIView):
    serializer_class = AgendamientoSerializer
    permission_classes = [IsSupervisorOrSeguridad]

    def get_queryset(self):
        today = now().date()
        start = make_aware(datetime.combine(today, datetime.min.time()))
        end = start + timedelta(days=1)
        return Agendamiento.objects.filter(
            estado=Agendamiento.Estado.CONFIRMADO,
            fecha_hora_programada__gte=start,
            fecha_hora_programada__lt=end
        ).order_by('fecha_hora_programada')


class MisProximasCitasView(generics.ListAPIView):
    """
    Devuelve una lista de las próximas citas con estado 'Confirmado'
    que han sido asignadas al mecánico que realiza la consulta.
    Es una vista de solo lectura para planificación.
    """
    serializer_class = AgendamientoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Nos aseguramos de que solo los mecánicos puedan usar esta vista
        if user.groups.filter(name='Mecanico').exists():
            return Agendamiento.objects.filter(
                mecanico_asignado=user,
                estado=Agendamiento.Estado.CONFIRMADO # Solo las que no han llegado
            ).order_by('fecha_hora_programada')
        
        # Si no es mecánico, no devolvemos nada
        return Agendamiento.objects.none()



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mecanico_dashboard_stats(request):
    """
    Prepara y devuelve las estadísticas y tareas para el dashboard del mecánico.
    """
    user = request.user
    if not user.groups.filter(name='Mecanico').exists():
        return Response({'error': 'Acceso no autorizado'}, status=status.HTTP_403_FORBIDDEN)

    # 1. Contar órdenes activas (todas las que no estén 'Finalizado')
    ordenes_activas_count = Orden.objects.filter(
        usuario_asignado=user
    ).exclude(
        estado=Orden.Estado.FINALIZADO
    ).count()

    # 2. Contar próximas asignaciones (agendamientos confirmados pero sin orden creada)
    proximas_asignaciones_count = Agendamiento.objects.filter(
        mecanico_asignado=user,
        estado=Agendamiento.Estado.CONFIRMADO
    ).count()
    
    # 3. Obtener la lista de órdenes activas
    ordenes_activas = Orden.objects.filter(
        usuario_asignado=user
    ).exclude(
        estado=Orden.Estado.FINALIZADO
    ).order_by('fecha_ingreso')

    # Serializar la lista de órdenes
    ordenes_serializer = OrdenSerializer(ordenes_activas, many=True, context={'request': request})

    # Construir la respuesta
    data = {
        'kpis': {
            'ordenesActivas': ordenes_activas_count,
            'proximasAsignaciones': proximas_asignaciones_count,
        },
        'tareas': ordenes_serializer.data
    }
    return Response(data, status=status.HTTP_200_OK)


# accounts/views.py
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated 
# ^ Asumo que usas esto. Si tienes permisos por roles (ej. IsSeguridad), ¡mejor!

from .models import Orden, Agendamiento, Orden # Importa tus modelos
from .serializers import OrdenSalidaListSerializer # Importa el nuevo serializer

# ... (Aquí van tus otras vistas: LoginView, RegisterView, etc.) ...

# --- AÑADE ESTAS DOS NUEVAS VISTAS ---

class OrdenesPendientesSalidaView(APIView):
    """
    Endpoint [GET] para listar todas las órdenes de trabajo que
    están en estado 'Finalizado' pero aún no tienen una
    fecha de entrega real (es decir, no han salido del taller).
    """
    # permission_classes = [IsAuthenticated, TuPermisoDeSeguridadOSupervisor] 
    
    def get(self, request, *args, **kwargs):
        try:
            # 1. Filtramos las órdenes:
            #    - Estado sea FINALIZADO
            #    - fecha_entrega_real esté VACÍA (isnull=True)
            ordenes_listas = Orden.objects.filter(
                estado=Orden.Estado.FINALIZADO,
                fecha_entrega_real__isnull=True
            ).select_related( # Optimizamos la consulta
                'vehiculo', 
                'agendamiento_origen__chofer_asociado', 
                'usuario_asignado'
            ).order_by('fecha_ingreso') # Opcional: ordenar por la más antigua

            # 2. Serializamos los datos
            serializer = OrdenSalidaListSerializer(ordenes_listas, many=True)
            
            # 3. Devolvemos la lista a React
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Error al obtener órdenes: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RegistrarSalidaView(APIView):
    """
    Endpoint [POST] para registrar la salida de un vehículo.
    Recibe el ID (pk) de la Orden en la URL.
    """
    # permission_classes = [IsAuthenticated, TuPermisoDeSeguridadOSupervisor] 
    
    def post(self, request, pk, *args, **kwargs):
        try:
            # 1. Buscamos la orden
            orden = get_object_or_404(Orden, pk=pk)

            # 2. Validaciones
            if orden.fecha_entrega_real:
                return Response(
                    {"error": "Esta salida ya fue registrada."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if orden.estado != Orden.Estado.FINALIZADO:
                return Response(
                    {"error": "El trabajo en este vehículo aún no ha sido finalizado por el taller."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 3. --- ¡LA LÓGICA CLAVE! ---
            #    Establecemos la fecha de salida a "AHORA"
            orden.fecha_entrega_real = timezone.now()
            
            # 4. (Opcional pero recomendado)
            #    Si quieres, puedes pasar el Agendamiento original a 'Finalizado'
            if orden.agendamiento_origen:
                if orden.agendamiento_origen.estado != Agendamiento.Estado.FINALIZADO:
                    orden.agendamiento_origen.estado = Agendamiento.Estado.FINALIZADO
                    orden.agendamiento_origen.save()

            # 5. Guardamos la orden
            orden.save()

            return Response(
                {"mensaje": f"Salida del vehículo {orden.vehiculo.patente} registrada con éxito."},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
             return Response(
                {"error": f"Error al registrar la salida: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )