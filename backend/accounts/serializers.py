# ----------------------------------------------------------------------
# IMPORTACIONES
# ----------------------------------------------------------------------
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from datetime import timedelta, datetime
import re

# Modelos locales
from .models import (
    Vehiculo, Agendamiento, Orden, OrdenHistorialEstado, OrdenDocumento, 
    Notificacion, Producto, OrdenItem, LlaveVehiculo, PrestamoLlave, LlaveHistorialEstado, Taller
)


User = get_user_model()

def validar_rut_chileno(rut):
    """
    Valida y formatea un RUT chileno.
    Devuelve (True, "RUT formateado") o (False, "Mensaje de Error").
    """
    try:
        rut_limpio = str(rut).upper().replace(".", "").replace("-", "")
        if not re.match(r"^\d{7,8}[0-9K]$", rut_limpio):
            return False, "Formato de RUT inválido (ej: 12.345.678-9)."
        
        cuerpo = rut_limpio[:-1]
        dv = rut_limpio[-1]
        
        suma = 0
        multiplo = 2
        for c in reversed(cuerpo):
            suma += int(c) * multiplo
            multiplo = multiplo + 1 if multiplo < 7 else 2
        
        dv_calculado = 11 - (suma % 11)
        
        if dv_calculado == 11:
            dv_esperado = '0'
        elif dv_calculado == 10:
            dv_esperado = 'K'
        else:
            dv_esperado = str(dv_calculado)
        
        if dv == dv_esperado:
            # Formatear el RUT (ej: 12.345.678-9)
            cuerpo_int = int(cuerpo)
            cuerpo_formateado = f"{cuerpo_int:,}".replace(",", ".")
            return True, f"{cuerpo_formateado}-{dv}"
        else:
            return False, "RUT inválido (dígito verificador no coincide)."
    except Exception:
        return False, "Error al procesar el RUT."
    

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
    def validate_rut(self, value):
        """
        Valida el RUT usando la función helper.
        Si es válido, guarda el RUT formateado.
        """
        es_valido, rut_o_error = validar_rut_chileno(value)
        if not es_valido:
            raise serializers.ValidationError(rut_o_error)
        
        # Guardamos el RUT formateado (ej: 12.345.678-9)
        # Esto coincide con los datos que mostraste de tu BD.
        return rut_o_error

    def validate_telefono(self, value):
        """
        Valida que el teléfono tenga 9 dígitos y (opcionalmente) comience con 9.
        """
        if not value: # Permite campos vacíos (null=True, blank=True)
            return None
            
        # Limpiar cualquier caracter que no sea dígito
        numeros = re.sub(r'\D', '', str(value))
        
        # Opcional: Si escriben +569... lo limpiamos a 9...
        if len(numeros) == 11 and numeros.startswith('569'):
            numeros = numeros[2:]
        
        if not re.match(r'^[9]\d{8}$', numeros):
            raise serializers.ValidationError("El teléfono debe ser un número celular chileno válido (9 dígitos, ej: 912345678).")
        
        # Guardamos solo los 9 dígitos limpios
        return numeros

    def validate_first_name(self, value):
        """
        Valida que el nombre solo contenga letras, espacios y acentos.
        """
        if not value:
             raise serializers.ValidationError("El nombre no puede estar vacío.")
        # Regex permite letras, acentos, ñ, espacios y apóstrofes
        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s']+$", value):
            raise serializers.ValidationError("El nombre solo debe contener letras y espacios.")
        if len(value) > 50:
            raise serializers.ValidationError("El nombre no debe exceder los 50 caracteres.")
        return value

    def validate_last_name(self, value):
        """
        Valida que el apellido solo contenga letras, espacios y acentos.
        """
        if not value:
             raise serializers.ValidationError("El apellido no puede estar vacío.")
        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s']+$", value):
            raise serializers.ValidationError("El apellido solo debe contener letras y espacios.")
        if len(value) > 50:
            raise serializers.ValidationError("El apellido no debe exceder los 50 caracteres.")
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
    chofer_nombre = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Vehiculo
        fields = '__all__'

    def get_chofer_nombre(self, obj):
        if obj.chofer:
            return f"{obj.chofer.first_name} {obj.chofer.last_name}"
        return "Sin asignar"


    def validate_patente(self, value):
        patente_limpia = str(value).upper().replace(' ', '').replace('-', '')
        patente_regex = r'(^[A-Z]{4}\d{2}$)|(^[A-Z]{2}\d{4}$)'
        if not re.match(patente_regex, patente_limpia):
            raise serializers.ValidationError("Formato de Patente inválido. Debe ser XX1111 o XXXX11.")
        
        if not self.instance:
            if Vehiculo.objects.filter(patente=patente_limpia).exists():
                raise serializers.ValidationError("Esta patente ya está registrada.")
        return patente_limpia

    def validate_anio(self, value):
        ano_maximo = datetime.now().year + 1
        ano_minimo = 1980
        if not isinstance(value, int):
             raise serializers.ValidationError("El año debe ser un número.")
        if not (ano_minimo <= value <= ano_maximo):
            raise serializers.ValidationError(f"El año debe estar entre {ano_minimo} y {ano_maximo}.")
        return value

    def validate_kilometraje(self, value):
        if not isinstance(value, int) or value < 0:
            raise serializers.ValidationError("El kilometraje debe ser un número positivo.")
        return value

    def validate_vin(self, value):
        if not value: 
            return value

        vin_limpio = re.sub(r'[^A-HJ-NPR-Z0-9]', '', str(value).upper())
      
        
        if len(vin_limpio) != 17:
             raise serializers.ValidationError("El VIN debe tener 17 caracteres alfanuméricos.")
             
        query = Vehiculo.objects.filter(vin=vin_limpio)
        if self.instance:
            query = query.exclude(pk=self.instance.pk)
        
        if query.exists():
            raise serializers.ValidationError("Este VIN ya está registrado en otro vehículo.")
            
        return vin_limpio

    def _validate_texto_vehiculo(self, value, field_name="El campo"):
        """Función helper interna para validar marca, modelo, color."""
        if not value:
            return value # Permite campos vacíos (como 'color')
        # Permite letras, números, acentos, ñ, espacios, y guiones
        if not re.match(r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s'-]+$", str(value)):
             raise serializers.ValidationError(f"{field_name} contiene caracteres inválidos.")
        if len(str(value)) > 50:
             raise serializers.ValidationError(f"{field_name} no debe exceder los 50 caracteres.")
        return value

    def validate_marca(self, value):
        if not value:
             raise serializers.ValidationError("La Marca no puede estar vacía.")
        return self._validate_texto_vehiculo(value, "La Marca")

    def validate_modelo(self, value):
        if not value:
             raise serializers.ValidationError("El Modelo no puede estar vacío.")
        return self._validate_texto_vehiculo(value, "El Modelo")

    def validate_color(self, value):
        return self._validate_texto_vehiculo(value, "El Color")
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
        fields = ['id', 'tipo', 'descripcion', 'archivo', 'archivo_url', 'fecha', 'subido_por_nombre', 'estado_en_carga']
        read_only_fields = ['subido_por_nombre', 'fecha', 'archivo_url', 'estado_en_carga']

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
class ProductoSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Producto (Repuesto).
    """
    class Meta:
        model = Producto
        fields = ['sku', 'nombre', 'descripcion', 'marca', 'precio_venta', 'stock']


class OrdenItemSerializer(serializers.ModelSerializer):
    """
    Serializer para los Items de la Orden (Repuestos o Servicios).
    """
    # Usamos 'source' para leer la info del producto, no solo el SKU
    producto_info = ProductoSerializer(source='producto', read_only=True)
    servicio_info = serializers.StringRelatedField(source='servicio', read_only=True)
    
    solicitado_por_nombre = serializers.CharField(source='solicitado_por.get_full_name', read_only=True, default='')
    gestionado_por_nombre = serializers.CharField(source='gestionado_por.get_full_name', read_only=True, default='')

    class Meta:
        model = OrdenItem
        fields = [
            'id', 'orden', 'producto', 'producto_info', 'servicio', 'servicio_info', 
            'cantidad', 'precio_unitario', 'estado_repuesto', 
            'solicitado_por_nombre', 'gestionado_por_nombre', 'motivo_gestion', 'fecha_gestion'
        ]
        # Hacemos que 'producto' y 'servicio' sean write_only en el serializer base
        # El usuario enviará el ID, pero recibirá el objeto 'producto_info' anidado
        extra_kwargs = {
            'producto': {'write_only': True, 'required': False, 'allow_null': True},
            'servicio': {'write_only': True, 'required': False, 'allow_null': True},
            'precio_unitario': {'required': False, 'allow_null': True},
        }

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
    items = OrdenItemSerializer(many=True, read_only=True)
    imagen_averia_url = serializers.ImageField(source='agendamiento_origen.imagen_averia', read_only=True, allow_null=True)
    hora_agendada = serializers.DateTimeField(source='agendamiento_origen.fecha_hora_programada', read_only=True, allow_null=True)

    class Meta:
        model = Orden
        fields = [
            'id', 'vehiculo', 'vehiculo_info', 'agendamiento_origen',
            'fecha_ingreso', 'fecha_entrega_estimada', 'fecha_entrega_real',
            'estado', 'descripcion_falla', 'diagnostico_tecnico',
            'usuario_asignado', 'asignado_a',
            'historial_estados', 'imagen_averia_url', 'hora_agendada', 'documentos','items'
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
    



class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ['id', 'mensaje', 'link', 'leida', 'fecha']

class TallerSerializer(serializers.ModelSerializer):
    class Meta:
            model = Taller
            fields = ['id', 'nombre', 'direccion']



# ======================================================================
#  SERIALIZERS DE GESTIÓN DE LLAVES
# ======================================================================

class LlaveVehiculoSerializer(serializers.ModelSerializer):
    """
    Serializer para listar el inventario de llaves.
    Muestra la patente y quién la tiene ahora.
    """
    vehiculo_patente = serializers.CharField(source='vehiculo.patente', read_only=True)
    poseedor_info = serializers.CharField(source='poseedor_actual.get_full_name', read_only=True, default='En Bodega')

    class Meta:
        model = LlaveVehiculo
        fields = [
            'id', 'vehiculo', 'vehiculo_patente', 'codigo_interno', 
            'tipo', 'estado', 'poseedor_actual', 'poseedor_info','motivo_reporte'
        ]
        read_only_fields = ['vehiculo_patente', 'estado', 'poseedor_actual', 'poseedor_info','motivo_reporte']
        extra_kwargs = {
            'vehiculo': {'write_only': True} # Solo necesitamos el ID para crear
        }


class PrestamoLlaveSerializer(serializers.ModelSerializer):
    """
    Serializer para el historial de préstamos.
    """
    usuario_nombre = serializers.CharField(source='usuario_retira.get_full_name', read_only=True)
    llave_info = serializers.CharField(source='llave.__str__', read_only=True)

    class Meta:
        model = PrestamoLlave
        fields = [
            'id', 'llave', 'llave_info', 'usuario_retira', 'usuario_nombre',
            'fecha_hora_retiro', 'fecha_hora_devolucion',
            'observaciones_retiro', 'observaciones_devolucion'
        ]

class LlaveHistorialEstadoSerializer(serializers.ModelSerializer):
    """
    Serializer para el historial de reportes de llaves.
    """
    usuario_nombre = serializers.CharField(source='usuario_reporta.get_full_name', read_only=True)
    llave_info = serializers.CharField(source='llave.__str__', read_only=True)
    
    class Meta:
        model = LlaveHistorialEstado
        fields = [
            'id', 'llave', 'llave_info', 'usuario_reporta', 'usuario_nombre',
            'estado_anterior', 'estado_nuevo', 'motivo', 'fecha'
        ]


    # ======================================================================
# 📦 SERIALIZER DE HISTORIAL DE SEGURIDAD
# ======================================================================

class HistorialSeguridadSerializer(serializers.ModelSerializer):
    """
    Serializer de solo lectura para el historial de ingresos y salidas
    del panel de Seguridad.
    """
    vehiculo_patente = serializers.CharField(source='vehiculo.patente', read_only=True)
    

    chofer_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Orden
        fields = (
            'id',
            'vehiculo_patente',
            'chofer_nombre',
            'fecha_ingreso',      
            'fecha_entrega_real'  
        )

    def get_chofer_nombre(self, obj):
        if obj.agendamiento_origen and obj.agendamiento_origen.chofer_asociado:
            return obj.agendamiento_origen.chofer_asociado.get_full_name()
        
        if obj.vehiculo and obj.vehiculo.chofer:
             return obj.vehiculo.chofer.get_full_name()
        return "No asignado"
    
