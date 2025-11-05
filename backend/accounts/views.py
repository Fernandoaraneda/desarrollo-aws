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
from django.db.models import Count, Avg, F, DateField, Q
from django.db.models.functions import TruncDay
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

from rest_framework import filters
# accounts/views.py (Línea 26 - CORREGIDA)
from .models import Orden, Agendamiento, Vehiculo, OrdenHistorialEstado, OrdenPausa, OrdenDocumento, Notificacion,LlaveVehiculo, PrestamoLlave, LlaveHistorialEstado
from .serializers import (
    LoginSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    UserCreateUpdateSerializer,
    VehiculoSerializer,
    AgendamientoSerializer,
    OrdenSerializer,
    OrdenDocumentoSerializer,
    NotificacionSerializer,
    LlaveVehiculoSerializer, 
    PrestamoLlaveSerializer,
    LlaveHistorialEstadoSerializer,
    HistorialSeguridadSerializer
)

User = get_user_model()

# ... (después de las importaciones)

def enviar_correo_notificacion(usuario, subject, message_body):
    """
    Envía un correo electrónico de notificación usando la plantilla HTML.
    """
    # 1. Asegurarnos que el usuario tenga un email
    if not usuario.email:
        print(f"Usuario {usuario.username} no tiene email, no se envía correo.")
        return

    # 2. ***** CONFIGURACIÓN DE PRUEBA *****
    #    Forzamos que TODOS los correos se envíen a tu email de prueba.
    #    En producción, deberías cambiar esto a 'usuario.email'.
    recipient_email = 'fer.araneda@duocuc.cl'
    print(f"Enviando correo de prueba a: {recipient_email} (Usuario real: {usuario.email})")
    
    # 3. Preparar el contexto para la plantilla HTML
    context = {
        'subject': subject,
        'message_body': message_body,
        'nombre_usuario': usuario.first_name or usuario.username,
    }
    
    try:
        # 4. Renderizar la plantilla HTML
        html_message = render_to_string('emails/notificacion_base.html', context)
        # 5. Crear una versión de texto plano como fallback
        plain_message = strip_tags(html_message)
        # 6. Obtener el email remitente desde settings
        from_email = settings.EMAIL_HOST_USER

        # 7. Enviar el correo
        send_mail(
            subject,
            plain_message,
            from_email,
            [recipient_email], # La lista de destinatarios
            html_message=html_message,
            fail_silently=False # Poner en True en producción para que no falle la app si el email falla
        )
        print(f"Correo enviado exitosamente a {recipient_email}")

    except Exception as e:
        # Imprime el error en la consola del backend para debugging
        print(f"ERROR al enviar correo a {recipient_email}: {e}")


# --------------------
# Permisos personalizados
# --------------------
class IsSupervisor(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                    request.user.groups.filter(name__in=['Supervisor', 'Administrativo']).exists())

class IsSupervisorOrMecanico(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                    request.user.groups.filter(name__in=['Supervisor', 'Mecanico', 'Administrativo']).exists())

class IsSupervisorOrSeguridad(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                    request.user.groups.filter(name__in=['Supervisor', 'Seguridad', 'Administrativo']).exists())

class IsControlLlaves(permissions.BasePermission):
    """
    Permiso para el Encargado de Llaves o Supervisor.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                    request.user.groups.filter(name__in=['Control Llaves', 'Supervisor', 'Administrativo']).exists())
class IsSupervisorOrControlLlaves(permissions.BasePermission):
    """
    Permiso para Supervisor O Encargado de Llaves (para ver listas de usuarios).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                    request.user.groups.filter(name__in=['Supervisor', 'Control Llaves', 'Administrativo']).exists())
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
    permission_classes = [IsSupervisorOrControlLlaves]

class UserCreateAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateUpdateSerializer
    permission_classes = [IsSupervisor]

class UserRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateUpdateSerializer
    permission_classes = [IsSupervisor]
    lookup_field = "id"
    def get_serializer_class(self):
        """
        Usa un serializador diferente para LEER (GET) que para ESCRIBIR (PUT/PATCH).
        """
        if self.request.method in ['PUT', 'PATCH']:
            # Al actualizar, usamos el serializador que acepta el 'rol' por texto.
            return UserCreateUpdateSerializer
        
        # Al cargar (GET), usamos el serializador que SÍ muestra el 'rol'.
        return UserSerializer


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
    def perform_create(self, serializer):
        """
        Se ejecuta después de crear un Vehículo.
        Automatiza la creación de sus llaves por defecto.
        """
        # 1. Guarda el vehículo primero (esto nos da el objeto 'vehiculo')
        vehiculo = serializer.save()

        # 2. Ahora, crea las llaves asociadas (como sugeriste)
        try:
            # Llave 1: La Original
            LlaveVehiculo.objects.get_or_create(
                vehiculo=vehiculo,
                tipo=LlaveVehiculo.Tipo.ORIGINAL,
                defaults={
                    'codigo_interno': f"{vehiculo.patente}-ORI" # ej: ABCD12-ORI
                }
            )

            # Llave 2: El Duplicado (Copia)
            LlaveVehiculo.objects.get_or_create(
                vehiculo=vehiculo,
                tipo=LlaveVehiculo.Tipo.DUPLICADO,
                defaults={
                    'codigo_interno': f"{vehiculo.patente}-DUP" # ej: ABCD12-DUP
                }
            )
        except Exception as e:
            # Si algo falla aquí, no queremos que la creación del vehículo se detenga
            # solo lo reportamos en la consola del backend.
            print(f"ERROR: No se pudieron crear llaves automáticas para {vehiculo.patente}: {e}")

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
        if user.groups.filter(name__in=['Supervisor', 'Mecanico', 'Seguridad','Administrativo']).exists():
            return Agendamiento.objects.select_related('vehiculo', 'mecanico_asignado').all().order_by('fecha_hora_programada')
        elif user.groups.filter(name='Chofer').exists():
            return Agendamiento.objects.filter(vehiculo__chofer=user).order_by('fecha_hora_programada')
        return Agendamiento.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        
        # 1. Guardamos la instancia UNA SOLA VEZ y la asignamos a una variable
        agendamiento = serializer.save(creado_por=user, chofer_asociado=user)
        
        # 2. Ahora usamos esa variable 'agendamiento' para las notificaciones
        try:
            # 2. Obtenemos a todos los supervisores activos
            supervisores = User.objects.filter(groups__name=['Supervisor', 'Administrativo'], is_active=True)
            
            # 3. Preparamos el mensaje
            chofer = agendamiento.creado_por
            chofer_nombre = f"{chofer.first_name} {chofer.last_name}".strip() or chofer.username
            patente = agendamiento.vehiculo.patente
            
            subject = f"Nueva Solicitud de Cita: {patente}"
            mensaje = f"El chofer {chofer_nombre} ha solicitado un ingreso para el vehículo {patente}. Motivo: {agendamiento.motivo_ingreso}"
            link_supervisor = "/panel-supervisor" # Link al panel donde aprueban

            # 4. Enviamos notificación y email a CADA supervisor
            for supervisor in supervisores:
                Notificacion.objects.create(
                    usuario=supervisor,
                    mensaje=mensaje,
                    link=link_supervisor
                )
                
                # 5. Enviamos el correo
                enviar_correo_notificacion(supervisor, subject, mensaje)

        except Exception as e:
            # Es importante que la creación de la cita no falle si la notificación falla.
            # Imprimimos el error en la consola del backend para debugging.
            print(f"ERROR al notificar al supervisor sobre nueva cita: {e}")

# accounts/views.py

    @action(detail=True, methods=['post'], url_path='confirmar-y-asignar', permission_classes=[IsSupervisor])
    def confirmar_y_asignar(self, request, pk=None):
        agendamiento = self.get_object()
        
        # 1. OBTENER DATOS (SIN chofer_id)
        mecanico_id_raw = request.data.get('mecanico_id')
        fecha_hora_asignada_str = request.data.get('fecha_hora_asignada')
        motivo_cambio = request.data.get('motivo_reagendamiento', None)

        # 2. VALIDAR MECÁNICO
        try:
            mecanico_id = int(mecanico_id_raw)
            mecanico = User.objects.get(id=mecanico_id, groups__name='Mecanico')
        except (TypeError, ValueError, User.DoesNotExist):
            return Response({'error': 'El mecánico seleccionado es inválido.'}, status=status.HTTP_404_NOT_FOUND)

        # 3. VALIDAR FECHA Y HORA
        fecha_a_validar = None
        hubo_cambio_fecha = False

        if not fecha_hora_asignada_str:
             # --- 👇 ARREGLO DEL SYNTAX ERROR ---
             return Response({'error': 'Debe seleccionar una fecha y hora.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # fromisoformat() ya maneja el string 'Z' (UTC) de JavaScript
            fecha_a_validar = datetime.fromisoformat(fecha_hora_asignada_str)
            
            # Comparamos la nueva fecha con la original (si existía)
            if agendamiento.fecha_hora_programada != fecha_a_validar:
                hubo_cambio_fecha = True
                
        except (ValueError, TypeError):
            return Response({'error': 'Formato de fecha/hora asignada es inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        # Calculamos el fin
        fecha_fin = fecha_a_validar + timedelta(minutes=agendamiento.duracion_estimada_minutos)
    
        # 4. VALIDACIÓN DE CONFLICTO (MECÁNICO)
        overlapping_mecanico = Agendamiento.objects.filter(
            Q(fecha_hora_programada__lt=fecha_fin) &
            Q(fecha_hora_fin__gt=fecha_a_validar) &
            Q(mecanico_asignado=mecanico) &
            Q(estado__in=[Agendamiento.Estado.CONFIRMADO, Agendamiento.Estado.EN_TALLER])
        ).exclude(pk=agendamiento.pk) 
    
        if overlapping_mecanico.exists():
            return Response(
                {'error': f"Conflicto de horario (Mecánico): El mecánico {mecanico.get_full_name()} ya tiene una cita en ese rango."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 5. VALIDACIÓN DE CONFLICTO (VEHÍCULO)
        overlapping_vehiculo = Agendamiento.objects.filter(
            Q(fecha_hora_programada__lt=fecha_fin) &
            Q(fecha_hora_fin__gt=fecha_a_validar) &
            Q(vehiculo=agendamiento.vehiculo)
        ).exclude(
            estado__in=[Agendamiento.Estado.FINALIZADO, Agendamiento.Estado.CANCELADO]
        ).exclude(pk=agendamiento.pk) # Excluir la cita que estamos moviendo

        if overlapping_vehiculo.exists():
            return Response(
                {'error': f"Conflicto de horario (Vehículo): El vehículo {agendamiento.vehiculo.patente} ya tiene OTRA cita activa en ese nuevo rango."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 6. GUARDAR TODO (SIN chofer_asociado)
        agendamiento.mecanico_asignado = mecanico
        agendamiento.estado = Agendamiento.Estado.CONFIRMADO
        agendamiento.fecha_hora_programada = fecha_a_validar # Asignamos la nueva fecha
        
        if hubo_cambio_fecha:
            agendamiento.motivo_reagendamiento = motivo_cambio
            
            # Notificar al chofer (Esta lógica está bien)
            try:
                # El chofer ya está en 'agendamiento.chofer_asociado' desde que se creó la cita
                if agendamiento.chofer_asociado:
                    mensaje = f"Su cita para {agendamiento.vehiculo.patente} fue asignada/reagendada para el {fecha_a_validar.strftime('%d-%m-%Y a las %H:%M')}. Motivo: {motivo_cambio or 'Asignación de taller.'}"
                    Notificacion.objects.create(
                        usuario=agendamiento.chofer_asociado,
                        mensaje=mensaje,
                        link=f"/historial" 
                    )
                    subject_chofer = f"Actualización de Cita: Vehículo {agendamiento.vehiculo.patente}"
                    enviar_correo_notificacion(agendamiento.chofer_asociado, subject_chofer, mensaje)
            except Exception as e:
                print(f"Error al crear notificación de reagendamiento: {e}")
            try:
            # 1. Buscamos a todos los usuarios del grupo "Seguridad"
                usuarios_seguridad = User.objects.filter(groups__name='Seguridad', is_active=True)
            
            # 2. Creamos el mensaje
                mensaje_seguridad = f"Vehículo {agendamiento.vehiculo.patente} (Chofer: {agendamiento.chofer_asociado.first_name}) tiene cita confirmada para el {fecha_a_validar.strftime('%d-%m a las %H:%M')}."
            
            # 3. Creamos una notificación para cada uno de ellos
                for user_seg in usuarios_seguridad:
                 Notificacion.objects.create(
                    usuario=user_seg,
                    mensaje=mensaje_seguridad,
                    link="/panel-ingresos" # El link a su panel de trabajo
                )
                subject_seguridad = f"Cita Confirmada: Vehículo {agendamiento.vehiculo.patente}"
                enviar_correo_notificacion(user_seg, subject_seguridad, mensaje_seguridad)
            except Exception as e:
                    # Si falla la notificación de seguridad, no detenemos la operación
                print(f"Error al crear notificación para Seguridad: {e}")
                
        agendamiento.save() # Esta línea ya no dará error
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
            
                subject_mecanico = f"Nueva Orden Asignada: #{nueva_orden.id}"
                enviar_correo_notificacion(agendamiento.mecanico_asignado, subject_mecanico, mensaje)
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
        if user.groups.filter(name__in=['Supervisor', 'Administrativo']).exists():
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
            
            try:
    # 1. Encontrar al chofer asociado a esta orden
                chofer_a_notificar = None
                if orden.agendamiento_origen and orden.agendamiento_origen.chofer_asociado:
                    chofer_a_notificar = orden.agendamiento_origen.chofer_asociado
                elif orden.vehiculo and orden.vehiculo.chofer:  # Fallback si no hay agendamiento
                    chofer_a_notificar = orden.vehiculo.chofer

                if chofer_a_notificar:
                    # 2. Definir mensajes claros para cada estado
                    mensajes = {
                        'En Diagnostico': 'está siendo diagnosticado por un mecánico.',
                        'En Proceso': 'ha entrado en proceso de reparación.',
                        'Pausado': f'ha sido pausado (Motivo: {motivo or "N/A"}).',
                        'Finalizado': '¡está listo! El trabajo en su vehículo ha finalizado.'
                    }

                    # 3. Crear la notificación
                    mensaje_chofer = mensajes.get(nuevo_estado)
                    if mensaje_chofer:
                        Notificacion.objects.create(
                            usuario=chofer_a_notificar,
                            mensaje=f"Actualización: Su vehículo {orden.vehiculo.patente} {mensaje_chofer}",
                            link="/dashboard"  # El dashboard del chofer
                        )
                        subject_chofer_estado = f"Actualización Orden #{orden.id}: {orden.vehiculo.patente}"
                        # Re-construimos el mensaje completo para el email
                        mensaje_email = f"Actualización: Su vehículo {orden.vehiculo.patente} {mensaje_chofer}"
                        enviar_correo_notificacion(chofer_a_notificar, subject_chofer_estado, mensaje_email)
                        
            except Exception as e:
                # Si falla la notificación, no detenemos la operación
                print(f"Error al crear notificación de cambio de estado: {e}")


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
        
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Q
from rest_framework.response import Response # ¡Importante!
from django.utils.timezone import make_aware #
from django.utils import timezone
from datetime import datetime

class MecanicoAgendaView(generics.ListAPIView):
    serializer_class = AgendamientoSerializer
    permission_classes = [IsSupervisor]

    def get_queryset(self):
        mecanico_id = self.kwargs.get('mecanico_id')
        if not mecanico_id:
            return Agendamiento.objects.none()
        
        queryset = Agendamiento.objects.filter(
            mecanico_asignado_id=mecanico_id,
            estado__in=[
                Agendamiento.Estado.CONFIRMADO, 
                Agendamiento.Estado.EN_TALLER
            ]
        )

        # --- 👇 INICIO DEL ARREGLO ---
        fecha_str = self.request.query_params.get('fecha')
        if fecha_str:
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                
                current_tz = timezone.get_current_timezone()

                # Esta es la forma MODERNA de hacerlo (con tzinfo)
                start_of_day = datetime.combine(fecha, datetime.min.time(), tzinfo=current_tz)
                end_of_day = datetime.combine(fecha, datetime.max.time(), tzinfo=current_tz)

                # Filtramos el queryset por ese rango de día
                queryset = queryset.filter(
                    fecha_hora_programada__gte=start_of_day,
                    fecha_hora_programada__lte=end_of_day
                )
            except ValueError:
                pass # Ignora la fecha si el formato es incorrecto
        # --- 👆 FIN DEL ARREGLO ---

        return queryset.order_by('fecha_hora_programada')


# accounts/views.py

# --- 👇 AÑADE ESTAS IMPORTACIONES AL PRINCIPIO DEL ARCHIVO ---
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from .models import Notificacion
from .serializers import NotificacionSerializer
# --- (Asegúrate de no duplicar importaciones si ya existen) ---


# ... (El resto de tus vistas como AgendamientoViewSet, OrdenViewSet, etc.) ...


# --- 👇 AÑADE ESTA VISTA NUEVA (al final del archivo está bien) ---
class NotificacionViewSet(viewsets.ModelViewSet):
    """
    API para leer, crear y marcar notificaciones como leídas.
    """
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filtra notificaciones solo para el usuario logueado."""
        return Notificacion.objects.filter(usuario=self.request.user).order_by('-fecha')

    @action(detail=False, methods=['post'], url_path='marcar-como-leidas')
    def marcar_como_leidas(self, request):
        """Acción para marcar todas las notificaciones del usuario como leídas."""
        Notificacion.objects.filter(usuario=request.user, leida=False).update(leida=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
    



# ======================================================================
# 🔑 API DE GESTIÓN DE LLAVES (NUEVO)
# ======================================================================

class LlaveVehiculoViewSet(viewsets.ModelViewSet):
    """
    API para gestionar el inventario de llaves (Pañol).
    Cubre: Control de duplicados, Reportar pérdidas.
    """
    queryset = LlaveVehiculo.objects.all().select_related('vehiculo', 'poseedor_actual')
    serializer_class = LlaveVehiculoSerializer
    permission_classes = [IsControlLlaves] # Protegido para el nuevo rol

    @action(detail=True, methods=['post'], url_path='registrar-devolucion')
    @transaction.atomic
    def registrar_devolucion(self, request, pk=None):
        """
        Cierra un préstamo activo (RECIBIR LLAVE).
        El 'pk' aquí es el ID de la *LlaveVehiculo*.
        """
        llave = self.get_object() # <-- Usa self.get_object() que es más seguro.

        try:
            # Buscamos el préstamo ACTIVO (sin fecha de devolución) para esta llave
            prestamo = PrestamoLlave.objects.get(llave=llave, fecha_hora_devolucion__isnull=True)
        except PrestamoLlave.DoesNotExist:
            return Response({'error': 'Esta llave no tiene un préstamo activo para devolver.'}, status=status.HTTP_404_NOT_FOUND)

        # 1. Cerramos el préstamo
        prestamo.fecha_hora_devolucion = timezone.now()
        prestamo.observaciones_devolucion = request.data.get('observaciones', '')
        prestamo.save()

        llave.estado = LlaveVehiculo.Estado.EN_BODEGA
        llave.poseedor_actual = None
        llave.save()

        serializer = self.get_serializer(llave)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='registrar-retiro')
    @transaction.atomic
    def registrar_retiro(self, request, pk=None):
        """
        Crea un nuevo préstamo (PRESTAR LLAVE). El 'pk' es el ID de la Llave.
        """
        llave = self.get_object() # Obtiene la llave
        usuario_id = request.data.get('usuario_id')
        observaciones = request.data.get('observaciones', '')

        if llave.estado != LlaveVehiculo.Estado.EN_BODEGA:
            return Response({'error': 'La llave no existe o ya está prestada.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            usuario = User.objects.get(id=usuario_id, is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'El usuario seleccionado no existe.'}, status=status.HTTP_404_NOT_FOUND)

        # 1. Creamos el nuevo registro de préstamo
        prestamo = PrestamoLlave.objects.create(
            llave=llave,
            usuario_retira=usuario,
            observaciones_retiro=observaciones
        )

        # 2. Actualizamos el estado y poseedor de la llave
        llave.estado = LlaveVehiculo.Estado.PRESTADA
        llave.poseedor_actual = usuario
        llave.save()

        # Devolvemos la llave actualizada
        serializer = self.get_serializer(llave)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='reportar-estado')
    @transaction.atomic
    def reportar_estado(self, request, pk=None):
        """
        Acción para marcar una llave como 'Perdida' o 'Dañada'
        """
        llave = self.get_object()
        nuevo_estado = request.data.get('estado') # "Perdida" o "Dañada"
        motivo = request.data.get('motivo')

        if not motivo:
            return Response({'error': 'Se requiere un motivo para el reporte.'}, status=status.HTTP_400_BAD_REQUEST)

        if nuevo_estado not in [LlaveVehiculo.Estado.PERDIDA, LlaveVehiculo.Estado.DAÑADA]:
            return Response({'error': 'Estado no válido. Solo se puede reportar como "Perdida" o "Dañada".'}, status=status.HTTP_400_BAD_REQUEST)

        if llave.estado != LlaveVehiculo.Estado.EN_BODEGA:
            return Response(
                {'error': 'Solo se pueden reportar llaves que están "En Bodega". Devuelva la llave antes de reportarla.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        estado_anterior = llave.estado
        llave.estado = nuevo_estado
        llave.motivo_reporte = motivo
        llave.save()

        LlaveHistorialEstado.objects.create(
            llave=llave,
            usuario_reporta=request.user,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            motivo=motivo
        )

    
        
        serializer = self.get_serializer(llave)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='revertir-reporte')
    @transaction.atomic
    def revertir_reporte(self, request, pk=None):
        """
        Revierte un reporte, marcando la llave como "En Bodega"
        y limpiando el motivo.
        """
        llave = self.get_object()
        
        if llave.estado not in [LlaveVehiculo.Estado.PERDIDA, LlaveVehiculo.Estado.DAÑADA]:
            return Response({'error': 'Esta llave no tiene un reporte activo que revertir.'}, status=status.HTTP_400_BAD_REQUEST)

        estado_anterior = llave.estado # <-- Captura el estado actual
        llave.estado = LlaveVehiculo.Estado.EN_BODEGA
        llave.motivo_reporte = None # Limpiamos el motivo
        llave.save()

        # --- ¡NUEVA LÓGICA DE HISTORIAL! ---
        LlaveHistorialEstado.objects.create(
            llave=llave,
            usuario_reporta=request.user,
            estado_anterior=estado_anterior,
            estado_nuevo=LlaveVehiculo.Estado.EN_BODEGA,
            motivo="Reporte revertido. Llave vuelve a estar operativa."
        )
        
        serializer = self.get_serializer(llave)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='historial')
    def historial(self, request, pk=None):
        """
        Devuelve el historial de préstamos de una llave específica.
        """
        llave = self.get_object()
        prestamos = llave.prestamos.all().select_related('usuario_retira')
        serializer = PrestamoLlaveSerializer(prestamos, many=True)
        return Response(serializer.data)


class PrestamoLlaveViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API para LEER el historial de préstamos.
    """
    queryset = PrestamoLlave.objects.all().select_related('llave__vehiculo', 'usuario_retira')
    serializer_class = PrestamoLlaveSerializer
    permission_classes = [IsControlLlaves]
    # La acción 'registrar-retiro' se mueve a LlaveVehiculoViewSet
    # para que esté centrada en la "llave"

    filter_backends = [filters.SearchFilter]
    search_fields = ['llave__vehiculo__patente', 'usuario_retira__username', 'usuario_retira__first_name', 'usuario_retira__last_name']

    @action(detail=True, methods=['post'], url_path='registrar-devolucion')
    @transaction.atomic
    def registrar_devolucion(self, request, pk=None):
        """
        Cierra un préstamo activo (RECIBIR LLAVE).
        El 'pk' aquí es el ID de la *LlaveVehiculo* para encontrar el préstamo activo.
        """
        try:
            # Buscamos el préstamo ACTIVO (sin fecha de devolución) para esta llave
            prestamo = PrestamoLlave.objects.get(llave_id=pk, fecha_hora_devolucion__isnull=True)
        except PrestamoLlave.DoesNotExist:
            return Response({'error': 'Esta llave no tiene un préstamo activo para devolver.'}, status=status.HTTP_404_NOT_FOUND)

        # 1. Cerramos el préstamo
        prestamo.fecha_hora_devolucion = timezone.now()
        prestamo.observaciones_devolucion = request.data.get('observaciones', '')
        prestamo.save()

        # 2. Actualizamos la llave
        llave = prestamo.llave
        llave.estado = LlaveVehiculo.Estado.EN_BODEGA
        llave.poseedor_actual = None
        llave.save()

        serializer = self.get_serializer(prestamo)
        return Response(serializer.data, status=status.HTTP_200_OK)
    


class LlaveHistorialEstadoViewSet(viewsets.ReadOnlyModelViewSet):
        """
        API para LEER el historial de reportes de llaves.
        """
        queryset = LlaveHistorialEstado.objects.all().select_related('llave__vehiculo', 'usuario_reporta')
        serializer_class = LlaveHistorialEstadoSerializer
        permission_classes = [IsControlLlaves]

        filter_backends = [filters.SearchFilter]

        search_fields = [
            'llave__vehiculo__patente',
            'usuario_reporta__username',
            'usuario_reporta__first_name',
            'usuario_reporta__last_name'
        ]


class HistorialSeguridadViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API de solo lectura para el historial de ingresos y salidas de Seguridad.
    """
    serializer_class = HistorialSeguridadSerializer
    permission_classes = [IsSupervisorOrSeguridad]

    filter_backends = [filters.SearchFilter]

    search_fields = [
        'vehiculo__patente',
        'agendamiento_origen__chofer_asociado__first_name',
        'agendamiento_origen__chofer_asociado__last_name',
        'vehiculo__chofer__first_name',
        'vehiculo__chofer__last_name'
    ]

    def get_queryset(self):
        return Orden.objects.all().select_related(
            'vehiculo',
            'agendamiento_origen__chofer_asociado',
            'vehiculo__chofer'
        ).order_by('-fecha_ingreso')
