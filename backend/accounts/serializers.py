from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from datetime import timedelta
from django.db.models import Q # <-- CAMBIO: Se importa Q para consultas complejas
from .models import Vehiculo, Agendamiento, Orden, OrdenHistorialEstado

User = get_user_model()

# ----------------------------------------------------------------------
# SERIALIZERS DE USUARIOS (Sin cambios)
# ----------------------------------------------------------------------
class UserSerializer(serializers.ModelSerializer):
    """
    Serializador para LEER la información de los usuarios.
    """
    rol = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'email', 'rol', 'is_active', 'rut', 'telefono'
        ]
    
    def get_rol(self, obj):
        group = obj.groups.first()
        return group.name if group else None


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializador para CREAR y ACTUALIZAR usuarios.
    """
    rol = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'username', 'first_name', 'last_name', 'email',
            'password', 'is_active', 'rol', 'rut', 'telefono'
        ]

    def validate_password(self, value):
        """Valida la contraseña con las reglas de Django (mínimo, comunes, etc.)."""
        if value:
            validate_password(value)
        return value

    def create(self, validated_data):
        rol_name = validated_data.pop('rol')
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        try:
            group = Group.objects.get(name=rol_name)
            user.groups.add(group)
        except Group.DoesNotExist:
            pass
        return user

    def update(self, instance, validated_data):
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
    Valida las credenciales.
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
    Serializador para que un usuario CAMBIE SU PROPIA CONTRASEÑA.
    """
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value):
        validate_password(value, self.context['request'].user)
        return value


# ----------------------------------------------------------------------
# SERIALIZERS DE VEHÍCULOS (Sin cambios)
# ----------------------------------------------------------------------
class VehiculoSerializer(serializers.ModelSerializer):
    chofer_nombre = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Vehiculo
        fields = '__all__'

    def get_chofer_nombre(self, obj):
        if obj.chofer:
            return f"{obj.chofer.first_name} {obj.chofer.last_name}"
        return "Sin asignar"


# ----------------------------------------------------------------------
# SERIALIZERS DE AGENDAMIENTOS (Aquí están los cambios)
# ----------------------------------------------------------------------
class AgendamientoSerializer(serializers.ModelSerializer):
    # Campos de solo lectura para mostrar información amigable en el frontend
    vehiculo_patente = serializers.CharField(source='vehiculo.patente', read_only=True)
    chofer_nombre = serializers.CharField(source='chofer_asociado.get_full_name', read_only=True)
    
    # Campo para la creación/edición, con queryset dinámico
    vehiculo = serializers.PrimaryKeyRelatedField(queryset=Vehiculo.objects.all())

    class Meta:
        model = Agendamiento
        fields = [
            'id', 'vehiculo', 'vehiculo_patente', 'chofer_asociado', 'chofer_nombre',
            'fecha_hora_programada', 'duracion_estimada_minutos', 'fecha_hora_fin', # Se incluye fecha_hora_fin
            'motivo_ingreso', 'estado', 'creado_por'
        ]
        # 'creado_por' y 'fecha_hora_fin' son gestionados por el backend
        read_only_fields = ['creado_por', 'fecha_hora_fin']

    def __init__(self, *args, **kwargs):
        # Mantiene la lógica para filtrar vehículos según el rol del usuario
        super().__init__(*args, **kwargs)
        if 'request' in self.context:
            user = self.context['request'].user
            if user.groups.filter(name='Chofer').exists():
                self.fields['vehiculo'].queryset = user.vehiculos.all()
            else:
                self.fields['vehiculo'].queryset = Vehiculo.objects.all()

    def validate(self, data):
        # <-- CAMBIO: Se añade la validación anti-solapamiento
        inicio = data['fecha_hora_programada']
        duracion = data.get('duracion_estimada_minutos', 60)
        fin = inicio + timedelta(minutes=duracion)

        # Busca agendamientos existentes cuyo rango de tiempo se cruce con el nuevo
        agendamientos_solapados = Agendamiento.objects.filter(
            fecha_hora_programada__lt=fin,
            fecha_hora_fin__gt=inicio
        )

        # Si estamos actualizando, excluimos el propio agendamiento de la validación
        if self.instance:
            agendamientos_solapados = agendamientos_solapados.exclude(pk=self.instance.pk)

        if agendamientos_solapados.exists():
            raise serializers.ValidationError("El horario seleccionado ya no está disponible. Por favor, elija otro.")
        
        return data

    def create(self, validated_data):
        # <-- CAMBIO: Se añade la lógica para asignar el creador de la cita
        # Asigna el usuario logueado como 'creado_por' y 'chofer_asociado'
        user = self.context['request'].user
        validated_data['creado_por'] = user
        validated_data['chofer_asociado'] = user
        return super().create(validated_data)
    

# ----------------------------------------------------------------------
# SERIALIZERS DE ÓRDENES DE SERVICIO
# ----------------------------------------------------------------------
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
    Serializador para ver y gestionar las Órdenes de Servicio.
    """
    vehiculo_info = serializers.StringRelatedField(source='vehiculo', read_only=True)
    asignado_a = serializers.CharField(source='usuario_asignado.get_full_name', read_only=True, default='No asignado')
    # Se anida el historial para tener toda la info en un solo endpoint
    historial_estados = OrdenHistorialEstadoSerializer(many=True, read_only=True)

    class Meta:
        model = Orden
        fields = [
            'id', 'vehiculo', 'vehiculo_info', 'agendamiento_origen',
            'fecha_ingreso', 'fecha_entrega_estimada', 'fecha_entrega_real',
            'estado', 'descripcion_falla', 'diagnostico_tecnico',
            'usuario_asignado', 'asignado_a', 'historial_estados'
        ]
        extra_kwargs = {
            # Se usa PrimaryKeyRelatedField para que al crear/actualizar solo necesitemos el ID del vehículo.
            'vehiculo': {'queryset': Vehiculo.objects.all()}
        }