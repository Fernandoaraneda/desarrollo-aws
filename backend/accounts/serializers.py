from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from datetime import timedelta
from .models import Vehiculo, Agendamiento

User = get_user_model()

# ----------------------------------------------------------------------
# SERIALIZERS DE USUARIOS
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
# SERIALIZERS DE VEHÍCULOS
# ----------------------------------------------------------------------

class VehiculoSerializer(serializers.ModelSerializer):
    chofer_nombre = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Vehiculo
        fields = '__all__'  # O lista explícita de campos
        # fields = ['patente', 'marca', 'modelo', 'anio', 'color', 'vin', 'kilometraje', 'chofer', 'chofer_nombre']

    def get_chofer_nombre(self, obj):
        if obj.chofer:
            return f"{obj.chofer.first_name} {obj.chofer.last_name}"
        return "Sin asignar"


# ----------------------------------------------------------------------
# SERIALIZERS DE AGENDAMIENTOS
# ----------------------------------------------------------------------
class AgendamientoSerializer(serializers.ModelSerializer):
    vehiculo_patente = serializers.CharField(source='vehiculo.patente', read_only=True)
    chofer_nombre = serializers.CharField(source='chofer_asociado.get_full_name', read_only=True)
    
    # Campo vehiculo editable con queryset dinámico
    vehiculo = serializers.PrimaryKeyRelatedField(queryset=Vehiculo.objects.none())

    class Meta:
        model = Agendamiento
        fields = [
            'id', 'vehiculo', 'vehiculo_patente', 'chofer_asociado', 'chofer_nombre',
            'fecha_hora_programada', 'duracion_estimada_minutos', 
            'motivo_ingreso', 'estado', 'creado_por'
        ]
        read_only_fields = ['creado_por']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context['request'].user

        # Si el usuario es chofer, solo verá sus vehículos
        if user.groups.filter(name='Chofer').exists():
            self.fields['vehiculo'].queryset = user.vehiculos.all()
        else:
            # Supervisores y mecánicos ven todos los vehículos
            self.fields['vehiculo'].queryset = Vehiculo.objects.all()
