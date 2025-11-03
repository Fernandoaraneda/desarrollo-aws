# ----------------------------------------------------------------------
# IMPORTACIONES
# ----------------------------------------------------------------------
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from datetime import timedelta


# Importación de modelos locales
from .models import Vehiculo, Agendamiento, Orden, OrdenHistorialEstado, OrdenDocumento


User = get_user_model()


# ======================================================================
# 🔐 SERIALIZERS DE USUARIOS
# ======================================================================

class UserSerializer(serializers.ModelSerializer):
    """
    Serializador para LEER la información de los usuarios.
    Incluye el nombre del rol (primer grupo al que pertenece).
    """
    rol = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'email', 'rol', 'is_active', 'rut', 'telefono'
        ]

    def get_rol(self, obj):
        """Obtiene el nombre del grupo/rol del usuario."""
        group = obj.groups.first()
        return group.name if group else None


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializador para CREAR y ACTUALIZAR usuarios.
    Permite asignar el rol y establecer contraseña.
    """
    rol = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'username', 'first_name', 'last_name', 'email',
            'password', 'is_active', 'rol', 'rut', 'telefono'
        ]

    # -----------------------
    # Validaciones
    # -----------------------
    def validate_password(self, value):
        """Valida la contraseña según las reglas de Django."""
        if value:
            validate_password(value)
        return value

    # -----------------------
    # Métodos CRUD
    # -----------------------
    def create(self, validated_data):
        """Crea un usuario y lo asigna a un grupo/rol."""
        rol_name = validated_data.pop('rol')
        password = validated_data.pop('password', None)

        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()

        # Asigna el grupo correspondiente
        try:
            group = Group.objects.get(name=rol_name)
            user.groups.add(group)
        except Group.DoesNotExist:
            pass

        return user

    def update(self, instance, validated_data):
        """Actualiza un usuario existente (rol y contraseña incluidos)."""
        if 'rol' in validated_data:
            rol_name = validated_data.pop('rol')
            instance.groups.clear()
            try:
                group = Group.objects.get(name=rol_name)
                instance.groups.add(group)
            except Group.DoesNotExist:
                pass

        password = validated_data.pop('password', None)
        if password:
            validate_password(password, instance)
            instance.set_password(password)

        return super().update(instance, validated_data)


class LoginSerializer(serializers.Serializer):
    """
    Serializador para el INICIO DE SESIÓN.
    Valida las credenciales del usuario.
    """
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    user = serializers.HiddenField(default=None)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Credenciales incorrectas. Inténtalo de nuevo.")
        if not user.is_active:
            raise serializers.ValidationError("Esta cuenta de usuario está inactiva.")
        data['user'] = user
        return data


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializador para CAMBIO DE CONTRASEÑA del propio usuario.
    """
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value):
        """Valida la nueva contraseña antes de guardarla."""
        validate_password(value, self.context['request'].user)
        return value


# ======================================================================
# 🚗 SERIALIZERS DE VEHÍCULOS
# ======================================================================

class VehiculoSerializer(serializers.ModelSerializer):
    """
    Serializador para Vehículos.
    Muestra el nombre del chofer asociado si existe.
    """
    chofer_nombre = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Vehiculo
        fields = '__all__'

    def get_chofer_nombre(self, obj):
        """Devuelve el nombre completo del chofer o 'Sin asignar'."""
        if obj.chofer:
            return f"{obj.chofer.first_name} {obj.chofer.last_name}"
        return "Sin asignar"


# ======================================================================
# 📅 SERIALIZERS DE AGENDAMIENTOS
# ======================================================================

class AgendamientoSerializer(serializers.ModelSerializer):
    """
    Serializador para agendamientos (citas programadas).
    Incluye datos del vehículo, chofer y mecánico.
    """
    vehiculo_patente = serializers.CharField(source='vehiculo.patente', read_only=True)
    chofer_nombre = serializers.CharField(source='chofer_asociado.get_full_name', read_only=True)
    mecanico_nombre = serializers.CharField(source='mecanico_asignado.get_full_name', read_only=True, default='Sin asignar')

    imagen_averia = serializers.ImageField(required=False, allow_null=True)
    vehiculo = serializers.PrimaryKeyRelatedField(queryset=Vehiculo.activos.all())

    class Meta:
        model = Agendamiento
        fields = [
            'id', 'vehiculo', 'vehiculo_patente', 'chofer_asociado', 'chofer_nombre',
            'mecanico_asignado', 'mecanico_nombre',
            'fecha_hora_programada', 'duracion_estimada_minutos', 'fecha_hora_fin',
            'motivo_ingreso', 'estado', 'imagen_averia', 'creado_por', 'solicita_grua'
        ]
        read_only_fields = ['creado_por', 'fecha_hora_fin']

        extra_kwargs = {
            'fecha_hora_programada': {'required': False, 'allow_null': True},
            'vehiculo': {'required': True},
            'motivo_ingreso': {'required': True}
        }

    def __init__(self, *args, **kwargs):
        """Filtra los vehículos visibles según el rol del usuario."""
        super().__init__(*args, **kwargs)
        user = self.context.get('request').user if 'request' in self.context else None
        if user and user.groups.filter(name='Chofer').exists():
            self.fields['vehiculo'].queryset = Vehiculo.activos.filter(chofer=user)

    def create(self, validated_data):
        """
        Asigna automáticamente el usuario logueado como creador y chofer asociado.
        """
        user = self.context['request'].user
        validated_data['creado_por'] = user
        validated_data['chofer_asociado'] = user
        return super().create(validated_data)


# ======================================================================
# 🧾 SERIALIZERS DE ÓRDENES DE SERVICIO
# ======================================================================

class OrdenDocumentoSerializer(serializers.ModelSerializer):
    """
    Serializador para listar y subir documentos asociados a una orden.
    """
    subido_por_nombre = serializers.CharField(source='subido_por.get_full_name', read_only=True)
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = OrdenDocumento
        fields = ['id', 'tipo', 'descripcion', 'archivo', 'archivo_url', 'fecha', 'subido_por_nombre']
        read_only_fields = ['subido_por_nombre', 'fecha', 'archivo_url']

    def get_archivo_url(self, obj):
        """Devuelve la URL absoluta del archivo (si existe)."""
        request = self.context.get('request')
        if obj.archivo and hasattr(obj.archivo, 'url'):
            return request.build_absolute_uri(obj.archivo.url)
        return None


class OrdenHistorialEstadoSerializer(serializers.ModelSerializer):
    """
    Serializador para mostrar el historial de cambios de estado de una orden.
    """
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True, default='Sistema')

    class Meta:
        model = OrdenHistorialEstado
        fields = ['id', 'estado', 'fecha', 'usuario', 'usuario_nombre', 'motivo']


class OrdenSerializer(serializers.ModelSerializer):
    """
    Serializador principal para Órdenes de Servicio.
    Incluye:
    - Información del vehículo
    - Técnico asignado
    - Historial de estados
    - Documentos y fotos
    """
    vehiculo_info = serializers.StringRelatedField(source='vehiculo', read_only=True)
    asignado_a = serializers.CharField(source='usuario_asignado.get_full_name', read_only=True, default='No asignado')
    historial_estados = OrdenHistorialEstadoSerializer(many=True, read_only=True)
    documentos = OrdenDocumentoSerializer(many=True, read_only=True)

    imagen_averia_url = serializers.ImageField(source='agendamiento_origen.imagen_averia', read_only=True, allow_null=True)
    hora_agendada = serializers.DateTimeField(source='agendamiento_origen.fecha_hora_programada', read_only=True, allow_null=True)

    class Meta:
        model = Orden
        fields = [
            'id', 'vehiculo', 'vehiculo_info', 'agendamiento_origen',
            'fecha_ingreso', 'fecha_entrega_estimada', 'fecha_entrega_real',
            'estado', 'descripcion_falla', 'diagnostico_tecnico',
            'usuario_asignado', 'asignado_a',
            'historial_estados', 'imagen_averia_url', 'hora_agendada', 'documentos'
        ]
        extra_kwargs = {
            'vehiculo': {'queryset': Vehiculo.activos.all()}
        }




class OrdenSalidaListSerializer(serializers.ModelSerializer):
    """
    Serializer para listar las órdenes que están 'Finalizado' pero
    pendientes de salida (fecha_entrega_real is null).
    """
    # Usamos SerializerMethodField para obtener datos de modelos relacionados
    # y evitar errores si alguno es Nulo.
    
    vehiculo_patente = serializers.SerializerMethodField()
    chofer_nombre = serializers.SerializerMethodField()
    mecanico_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Orden
        fields = (
            'id',
            'estado',
            'vehiculo_patente',
            'chofer_nombre',
            'mecanico_nombre',
            'descripcion_falla',
            'diagnostico_tecnico',
            'fecha_ingreso',
        )

    def get_vehiculo_patente(self, obj):
        # obj es la instancia de Orden
        if obj.vehiculo:
            return obj.vehiculo.patente
        return "N/A"

    def get_chofer_nombre(self, obj):
        # Accedemos al chofer a través del agendamiento de origen
        if obj.agendamiento_origen and obj.agendamiento_origen.chofer_asociado:
            return obj.agendamiento_origen.chofer_asociado.get_full_name()
        
        # Si no hay agendamiento, intentamos desde el vehículo (si tienes esa lógica)
        if obj.vehiculo and obj.vehiculo.chofer:
             return obj.vehiculo.chofer.get_full_name()
        return "No asignado"

    def get_mecanico_nombre(self, obj):
        if obj.usuario_asignado:
            return obj.usuario_asignado.get_full_name()
        
        # Fallback por si el mecánico estaba en el agendamiento
        if obj.agendamiento_origen and obj.agendamiento_origen.mecanico_asignado:
            return obj.agendamiento_origen.mecanico_asignado.get_full_name()
            
        return "No asignado"
    


    def validate(self, data):
        """
        Validación personalizada para DRF (se ejecuta antes de crear/guardar).
        """
        # 1. Validar duplicados de vehículo
        vehiculo = data.get('vehiculo')
        
        # Chequeamos si estamos creando (no hay 'instance')
        is_create = self.instance is None
        
        if vehiculo and is_create:
            # Busca si este vehículo ya tiene OTRA cita que esté "activa"
            citas_activas = Agendamiento.objects.filter(
                vehiculo=vehiculo
            ).exclude(
                estado__in=[
                    Agendamiento.Estado.FINALIZADO,
                    Agendamiento.Estado.CANCELADO
                ]
            )
            
            # Si ya existe una cita activa, lanza un error
            if citas_activas.exists():
                raise serializers.ValidationError(
                    f"El vehículo {vehiculo.patente} ya tiene una cita activa (Programada o En Taller). "
                    "No puede agendar otra hasta que la anterior se complete."
                )
        
        # (Aquí irían otras validaciones si las tuvieras)
        
        return data
    


    # ... (tus otras importaciones)
from .models import Notificacion

# ... (tus otros serializers) ...

# --- 👇 AÑADE ESTE SERIALIZER NUEVO ---
class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ['id', 'mensaje', 'link', 'leida', 'fecha']