


from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from datetime import timedelta, datetime
import re


from .models import (
    Vehiculo,
    Agendamiento,
    Orden,
    OrdenHistorialEstado,
    OrdenDocumento,
    Notificacion,
    Producto,
    OrdenItem,
    LlaveVehiculo,
    PrestamoLlave,
    LlaveHistorialEstado,
    Taller,
    AgendamientoDocumento,
    ChatRoom, ChatMessage
)

import os
from django.core.exceptions import ValidationError as DjangoValidationError







def validate_image_only(file):
    """Validador para tamaño (10MB) y SOLO tipo de archivo (Imágenes)."""

    MAX_SIZE = 10 * 1024 * 1024
    if file.size > MAX_SIZE:
        raise DjangoValidationError(
            f"El tamaño del archivo ({file.size // (1024*1024)}MB) supera el límite de 10MB."
        )



    if not file.content_type or not file.content_type.startswith("image/"):
        raise DjangoValidationError(
            f"Archivo no permitido. Solo se aceptan imágenes (tipo detectado: {file.content_type})."
        )

    return file


def validate_image_size(file):
    """Validador solo para el tamaño de la imagen (10MB)."""
    MAX_SIZE = 10 * 1024 * 1024
    if file.size > MAX_SIZE:

        raise DjangoValidationError(
            f"El tamaño de la imagen ({file.size // (1024*1024)}MB) supera el límite de 10MB."
        )
    return file


def validate_file_restrictions(file):
    """Validador para tamaño (10MB) y tipo de archivo (Imágenes, PDF, PPT, Excel)."""

    MAX_SIZE = 10 * 1024 * 1024
    if file.size > MAX_SIZE:
        raise DjangoValidationError(
            f"El tamaño del archivo ({file.size // (1024*1024)}MB) supera el límite de 10MB."
        )


    ALLOWED_MIME_TYPES = [
        "image/",
        "application/pdf",
        

        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
    ]

    file_type_ok = False
    if file.content_type:
        for mime_type in ALLOWED_MIME_TYPES:
            if file.content_type.startswith(mime_type):
                file_type_ok = True
                break

    file_type_ok = False
    if file.content_type:
        for mime_type in ALLOWED_MIME_TYPES:
            if file.content_type.startswith(mime_type):
                file_type_ok = True
                break

    if not file_type_ok:

        ext = os.path.splitext(file.name)[1].lower()
        

        ALLOWED_EXTENSIONS = [
            ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg",
            ".pdf",
            ".doc", ".docx"
        ]
        
        if ext not in ALLOWED_EXTENSIONS:
            raise DjangoValidationError(
                f"Tipo de archivo no permitido ('{file.content_type}'). Solo se aceptan imágenes, PDF y documentos de Word."
            )

    return file





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
            dv_esperado = "0"
        elif dv_calculado == 10:
            dv_esperado = "K"
        else:
            dv_esperado = str(dv_calculado)

        if dv == dv_esperado:

            cuerpo_int = int(cuerpo)
            cuerpo_formateado = f"{cuerpo_int:,}".replace(",", ".")
            return True, f"{cuerpo_formateado}-{dv}"
        else:
            return False, "RUT inválido (dígito verificador no coincide)."
    except Exception:
        return False, "Error al procesar el RUT."







class UserSerializer(serializers.ModelSerializer):
    """
    Serializador para LEER la información de los usuarios.
    Incluye el nombre del rol (primer grupo al que pertenece).
    """

    rol = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "rol",
            "is_active",
            "rut",
            "telefono",
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
            "username",
            "first_name",
            "last_name",
            "email",
            "password",
            "is_active",
            "rol",
            "rut",
            "telefono",
        ]




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



        return rut_o_error

    def validate_telefono(self, value):
        """
        Valida que el teléfono tenga 9 dígitos y (opcionalmente) comience con 9.
        """
        if not value:
            return None


        numeros = re.sub(r"\D", "", str(value))


        if len(numeros) == 11 and numeros.startswith("569"):
            numeros = numeros[2:]

        if not re.match(r"^[9]\d{8}$", numeros):
            raise serializers.ValidationError(
                "El teléfono debe ser un número celular chileno válido (9 dígitos, ej: 912345678)."
            )


        return numeros

    def validate_first_name(self, value):
        """
        Valida que el nombre solo contenga letras, espacios y acentos.
        """
        if not value:
            raise serializers.ValidationError("El nombre no puede estar vacío.")

        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s']+$", value):
            raise serializers.ValidationError(
                "El nombre solo debe contener letras y espacios."
            )
        if len(value) > 50:
            raise serializers.ValidationError(
                "El nombre no debe exceder los 50 caracteres."
            )
        return value

    def validate_last_name(self, value):
        """
        Valida que el apellido solo contenga letras, espacios y acentos.
        """
        if not value:
            raise serializers.ValidationError("El apellido no puede estar vacío.")
        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s']+$", value):
            raise serializers.ValidationError(
                "El apellido solo debe contener letras y espacios."
            )
        if len(value) > 50:
            raise serializers.ValidationError(
                "El apellido no debe exceder los 50 caracteres."
            )
        return value




    def create(self, validated_data):
        """Crea un usuario y lo asigna a un grupo/rol."""
        rol_name = validated_data.pop("rol")
        password = validated_data.pop("password", None)

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
        """Actualiza un usuario existente (rol y contraseña incluidos)."""
        if "rol" in validated_data:
            rol_name = validated_data.pop("rol")
            instance.groups.clear()
            try:
                group = Group.objects.get(name=rol_name)
                instance.groups.add(group)
            except Group.DoesNotExist:
                pass

        password = validated_data.pop("password", None)
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
        user = authenticate(username=data["username"], password=data["password"])
        if not user:
            raise serializers.ValidationError(
                "Credenciales incorrectas. Inténtalo de nuevo."
            )
        if not user.is_active:
            raise serializers.ValidationError("Esta cuenta de usuario está inactiva.")
        data["user"] = user
        return data


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializador para CAMBIO DE CONTRASEÑA del propio usuario.
    """

    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value):
        """Valida la nueva contraseña antes de guardarla."""
        validate_password(value, self.context["request"].user)
        return value







class VehiculoSerializer(serializers.ModelSerializer):
    chofer_nombre = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Vehiculo
        fields = "__all__"

    def get_chofer_nombre(self, obj):
        if obj.chofer:
            return f"{obj.chofer.first_name} {obj.chofer.last_name}"
        return "Sin asignar"

    def validate_patente(self, value):
        patente_limpia = str(value).upper().replace(" ", "").replace("-", "")
        patente_regex = r"(^[A-Z]{4}\d{2}$)|(^[A-Z]{2}\d{4}$)"
        if not re.match(patente_regex, patente_limpia):
            raise serializers.ValidationError(
                "Formato de Patente inválido. Debe ser XX1111 o XXXX11."
            )

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
            raise serializers.ValidationError(
                f"El año debe estar entre {ano_minimo} y {ano_maximo}."
            )
        return value

    def validate_kilometraje(self, value):
        if not isinstance(value, int) or value < 0:
            raise serializers.ValidationError(
                "El kilometraje debe ser un número positivo."
            )
        return value

    def validate_vin(self, value):
        if not value:
            return value

        vin_limpio = re.sub(r"[^A-HJ-NPR-Z0-9]", "", str(value).upper())

        if len(vin_limpio) != 17:
            raise serializers.ValidationError(
                "El VIN debe tener 17 caracteres alfanuméricos."
            )

        query = Vehiculo.objects.filter(vin=vin_limpio)
        if self.instance:
            query = query.exclude(pk=self.instance.pk)

        if query.exists():
            raise serializers.ValidationError(
                "Este VIN ya está registrado en otro vehículo."
            )

        return vin_limpio

    def _validate_texto_vehiculo(self, value, field_name="El campo"):
        """Función helper interna para validar marca, modelo, color."""
        if not value:
            return value

        if not re.match(r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s'-]+$", str(value)):
            raise serializers.ValidationError(
                f"{field_name} contiene caracteres inválidos."
            )
        if len(str(value)) > 50:
            raise serializers.ValidationError(
                f"{field_name} no debe exceder los 50 caracteres."
            )
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







class AgendamientoSerializer(serializers.ModelSerializer):
    """
    Serializador para agendamientos (citas programadas).
    Incluye datos del vehículo, chofer y mecánico.
    """

    vehiculo_patente = serializers.CharField(source="vehiculo.patente", read_only=True)
    chofer_nombre = serializers.CharField(
        source="chofer_asociado.get_full_name", read_only=True
    )
    mecanico_nombre = serializers.CharField(
        source="mecanico_asignado.get_full_name", read_only=True, default="Sin asignar"
    )

    imagen_averia = serializers.FileField( 
        required=False, 
        allow_null=True,
        validators=[validate_image_only] 
    )

    vehiculo = serializers.PrimaryKeyRelatedField(queryset=Vehiculo.activos.all())

    class Meta:
        model = Agendamiento
        fields = [
            "id",
            "vehiculo",
            "vehiculo_patente",
            "chofer_asociado",
            "chofer_nombre",
            "mecanico_asignado",
            "mecanico_nombre",
            "fecha_hora_programada",
            "duracion_estimada_minutos",
            "fecha_hora_fin",
            "motivo_ingreso",
            "estado",
            "imagen_averia",
            "creado_por",
            "solicita_grua",
            "direccion_grua",
            "grua_enviada",
            "es_mantenimiento",
        ]
        read_only_fields = ["creado_por", "fecha_hora_fin"]

        extra_kwargs = {
            "fecha_hora_programada": {"required": False, "allow_null": True},
            "vehiculo": {"required": True},
            "motivo_ingreso": {"required": False, "allow_blank": True},
        }

    def __init__(self, *args, **kwargs):
        """Filtra los vehículos visibles según el rol del usuario."""
        super().__init__(*args, **kwargs)
        user = self.context.get("request").user if "request" in self.context else None
        if user and user.groups.filter(name="Chofer").exists():
            self.fields["vehiculo"].queryset = Vehiculo.activos.filter(chofer=user)







class OrdenDocumentoSerializer(serializers.ModelSerializer):
    """
    Serializador para listar y subir documentos asociados a una orden.
    """

    subido_por_nombre = serializers.CharField(
        source="subido_por.get_full_name", read_only=True
    )
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = OrdenDocumento
        fields = [
            "id",
            "tipo",
            "descripcion",
            "archivo",
            "archivo_url",
            "fecha",
            "subido_por_nombre",
            "estado_en_carga",
        ]
        read_only_fields = [
            "subido_por_nombre",
            "fecha",
            "archivo_url",
            "estado_en_carga",
        ]


        extra_kwargs = {"archivo": {"validators": [validate_file_restrictions]}}

    def get_archivo_url(self, obj):
        """Devuelve la URL absoluta del archivo (si existe)."""
        request = self.context.get("request")
        if obj.archivo and hasattr(obj.archivo, "url"):
            return request.build_absolute_uri(obj.archivo.url)
        return None


class AgendamientoDocumentoSerializer(serializers.ModelSerializer):
    """
    Serializador para listar y subir documentos de un agendamiento.
    """

    subido_por_nombre = serializers.CharField(
        source="subido_por.get_full_name", read_only=True
    )
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = AgendamientoDocumento
        fields = [
            "id",
            "agendamiento",
            "tipo",
            "descripcion",
            "archivo",
            "archivo_url",
            "fecha",
            "subido_por_nombre",
        ]
        read_only_fields = ["subido_por_nombre", "fecha", "archivo_url"]


        extra_kwargs = {"archivo": {"validators": [validate_file_restrictions]}}

    def get_archivo_url(self, obj):
        """Devuelve la URL absoluta del archivo (si existe)."""
        request = self.context.get("request")
        if obj.archivo and hasattr(obj.archivo, "url"):
            return request.build_absolute_uri(obj.archivo.url)
        return None


class OrdenHistorialEstadoSerializer(serializers.ModelSerializer):
    """
    Serializador para mostrar el historial de cambios de estado de una orden.
    """

    usuario_nombre = serializers.CharField(
        source="usuario.get_full_name", read_only=True, default="Sistema"
    )

    class Meta:
        model = OrdenHistorialEstado
        fields = ["id", "estado", "fecha", "usuario", "usuario_nombre", "motivo"]


class ProductoSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Producto (Repuesto).
    """

    class Meta:
        model = Producto
        fields = ["sku", "nombre", "descripcion", "marca", "precio_venta", "stock"]


class OrdenItemSerializer(serializers.ModelSerializer):
    """
    Serializer para los Items de la Orden (Repuestos o Servicios).
    """


    producto_info = ProductoSerializer(source="producto", read_only=True)
    servicio_info = serializers.StringRelatedField(source="servicio", read_only=True)

    solicitado_por_nombre = serializers.CharField(
        source="solicitado_por.get_full_name", read_only=True, default=""
    )
    gestionado_por_nombre = serializers.CharField(
        source="gestionado_por.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = OrdenItem
        fields = [
            "id",
            "orden",
            "producto",
            "producto_info",
            "servicio",
            "servicio_info",
            "cantidad",
            "precio_unitario",
            "estado_repuesto",
            "solicitado_por_nombre",
            "gestionado_por_nombre",
            "motivo_gestion",
            "fecha_gestion",
        ]


        extra_kwargs = {
            "producto": {"write_only": True, "required": False, "allow_null": True},
            "servicio": {"write_only": True, "required": False, "allow_null": True},
            "precio_unitario": {"required": False, "allow_null": True},
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

    vehiculo_info = serializers.StringRelatedField(source="vehiculo", read_only=True)
    asignado_a = serializers.CharField(
        source="usuario_asignado.get_full_name", read_only=True, default="No asignado"
    )
    historial_estados = OrdenHistorialEstadoSerializer(many=True, read_only=True)
    documentos = OrdenDocumentoSerializer(many=True, read_only=True)
    items = OrdenItemSerializer(many=True, read_only=True)
    imagen_averia_url = serializers.ImageField(
        source="agendamiento_origen.imagen_averia", read_only=True, allow_null=True
    )
    hora_agendada = serializers.DateTimeField(
        source="agendamiento_origen.fecha_hora_programada",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Orden
        fields = [
            "id",
            "vehiculo",
            "vehiculo_info",
            "agendamiento_origen",
            "fecha_ingreso",
            "fecha_entrega_estimada",
            "fecha_entrega_real",
            "estado",
            "descripcion_falla",
            "diagnostico_tecnico",
            "usuario_asignado",
            "asignado_a",
            "historial_estados",
            "imagen_averia_url",
            "hora_agendada",
            "documentos",
            "items",
        ]
        extra_kwargs = {"vehiculo": {"queryset": Vehiculo.activos.all()}}


class OrdenSalidaListSerializer(serializers.ModelSerializer):
    """
    Serializer para listar las órdenes que están 'Finalizado' pero
    pendientes de salida (fecha_entrega_real is null).
    """




    vehiculo_patente = serializers.SerializerMethodField()
    chofer_nombre = serializers.SerializerMethodField()
    mecanico_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Orden
        fields = (
            "id",
            "estado",
            "vehiculo_patente",
            "chofer_nombre",
            "mecanico_nombre",
            "descripcion_falla",
            "diagnostico_tecnico",
            "fecha_ingreso",
        )

    def get_vehiculo_patente(self, obj):

        if obj.vehiculo:
            return obj.vehiculo.patente
        return "N/A"

    def get_chofer_nombre(self, obj):

        if obj.agendamiento_origen and obj.agendamiento_origen.chofer_asociado:
            return obj.agendamiento_origen.chofer_asociado.get_full_name()


        if obj.vehiculo and obj.vehiculo.chofer:
            return obj.vehiculo.chofer.get_full_name()
        return "No asignado"

    def get_mecanico_nombre(self, obj):
        if obj.usuario_asignado:
            return obj.usuario_asignado.get_full_name()


        if obj.agendamiento_origen and obj.agendamiento_origen.mecanico_asignado:
            return obj.agendamiento_origen.mecanico_asignado.get_full_name()

        return "No asignado"

    def validate(self, data):
        """
        Validación personalizada para DRF (se ejecuta antes de crear/guardar).
        """

        vehiculo = data.get("vehiculo")


        is_create = self.instance is None

        if vehiculo and is_create:

            citas_activas = Agendamiento.objects.filter(vehiculo=vehiculo).exclude(
                estado__in=[
                    Agendamiento.Estado.FINALIZADO,
                    Agendamiento.Estado.CANCELADO,
                ]
            )


            if citas_activas.exists():
                raise serializers.ValidationError(
                    f"El vehículo {vehiculo.patente} ya tiene una cita activa (Programada o En Taller). "
                    "No puede agendar otra hasta que la anterior se complete."
                )



        return data


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ["id", "mensaje", "link", "leida", "fecha"]


class TallerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Taller
        fields = ["id", "nombre", "direccion"]







class LlaveVehiculoSerializer(serializers.ModelSerializer):
    """
    Serializer para listar el inventario de llaves.
    Muestra la patente y quién la tiene ahora.
    """

    vehiculo_patente = serializers.CharField(source="vehiculo.patente", read_only=True)
    poseedor_info = serializers.CharField(
        source="poseedor_actual.get_full_name", read_only=True, default="En Bodega"
    )

    class Meta:
        model = LlaveVehiculo
        fields = [
            "id",
            "vehiculo",
            "vehiculo_patente",
            "codigo_interno",
            "tipo",
            "estado",
            "poseedor_actual",
            "poseedor_info",
            "motivo_reporte",
        ]
        read_only_fields = [
            "vehiculo_patente",
            "estado",
            "poseedor_actual",
            "poseedor_info",
            "motivo_reporte",
        ]
        extra_kwargs = {
            "vehiculo": {"write_only": True}
        }


class PrestamoLlaveSerializer(serializers.ModelSerializer):
    """
    Serializer para el historial de préstamos.
    """

    usuario_nombre = serializers.CharField(
        source="usuario_retira.get_full_name", read_only=True
    )
    llave_info = serializers.CharField(source="llave.__str__", read_only=True)

    class Meta:
        model = PrestamoLlave
        fields = [
            "id",
            "llave",
            "llave_info",
            "usuario_retira",
            "usuario_nombre",
            "fecha_hora_retiro",
            "fecha_hora_devolucion",
            "observaciones_retiro",
            "observaciones_devolucion",
        ]


class LlaveHistorialEstadoSerializer(serializers.ModelSerializer):
    """
    Serializer para el historial de reportes de llaves.
    """

    usuario_nombre = serializers.CharField(
        source="usuario_reporta.get_full_name", read_only=True
    )
    llave_info = serializers.CharField(source="llave.__str__", read_only=True)

    class Meta:
        model = LlaveHistorialEstado
        fields = [
            "id",
            "llave",
            "llave_info",
            "usuario_reporta",
            "usuario_nombre",
            "estado_anterior",
            "estado_nuevo",
            "motivo",
            "fecha",
        ]








class HistorialSeguridadSerializer(serializers.ModelSerializer):
    """
    Serializer de solo lectura para el historial de ingresos y salidas
    del panel de Seguridad.
    """

    vehiculo_patente = serializers.CharField(source="vehiculo.patente", read_only=True)

    chofer_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Orden
        fields = (
            "id",
            "vehiculo_patente",
            "chofer_nombre",
            "fecha_ingreso",
            "fecha_entrega_real",
        )

    def get_chofer_nombre(self, obj):
        if obj.agendamiento_origen and obj.agendamiento_origen.chofer_asociado:
            return obj.agendamiento_origen.chofer_asociado.get_full_name()

        if obj.vehiculo and obj.vehiculo.chofer:
            return obj.vehiculo.chofer.get_full_name()
        return "No asignado"




class ChatMessageSerializer(serializers.ModelSerializer):
    """
    Serializa un mensaje individual.
    """

    autor = UserSerializer(read_only=True)
    archivo = serializers.FileField(
        required=False, 
        allow_null=True, 
        validators=[validate_file_restrictions]
    )
    
    class Meta:
        model = ChatMessage


        fields = ['id', 'room', 'autor', 'contenido', 'archivo', 'creado_en']
        read_only_fields = ['id', 'room', 'autor', 'creado_en']
        
        
    def validate(self, data):
        """
        Asegura que se envíe contenido O un archivo.
        """
        contenido = data.get('contenido')
        archivo = data.get('archivo')
        
        if not contenido and not archivo:
            raise serializers.ValidationError(
                "No se puede enviar un mensaje vacío sin un archivo adjunto."
            )
        return data

class ChatRoomSerializer(serializers.ModelSerializer):
    """
    Serializa una sala de chat, incluyendo sus participantes.
    """

    participantes = UserSerializer(many=True, read_only=True)
    
    class Meta:
        model = ChatRoom
        fields = ['id', 'nombre', 'participantes', 'actualizado_en']
        read_only_fields = ['id', 'participantes', 'actualizado_en']
        
        
        
class ChatRoomCreateSerializer(serializers.Serializer):
    """
    Serializer para crear una nueva sala de chat.
    Solo necesita el ID del otro participante.
    """
    user_id = serializers.IntegerField(required=True)