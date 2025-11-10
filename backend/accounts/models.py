from django.db import models
from django.db.models import Q, Sum
from django.contrib.auth.models import AbstractUser, Group, Permission, UserManager
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta

# --------------------------------------------------------------------------
# MANAGERS PERSONALIZADOS
# --------------------------------------------------------------------------

class SoftDeleteManager(models.Manager):
    """Manager para obtener solo los objetos activos (no borrados lógicamente)."""
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)

class OrdenManager(models.Manager):
    """Manager para consultas comunes sobre Órdenes de Servicio."""
    def get_queryset(self):
        return super().get_queryset()

    def activas(self):
        """Devuelve órdenes que no están finalizadas."""
        return self.get_queryset().exclude(estado=Orden.Estado.FINALIZADO)

# --------------------------------------------------------------------------
# MODELOS ABSTRACTOS
# --------------------------------------------------------------------------

class TimeStampedModel(models.Model):
    """Modelo abstracto con campos de fecha de creación y actualización."""
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

# --------------------------------------------------------------------------
# USUARIOS Y ROLES
# --------------------------------------------------------------------------

class Usuario(AbstractUser):
    rut = models.CharField("RUT", max_length=12, unique=True, db_index=True)
    telefono = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True) # Para borrado lógico

    # Managers
    objects = UserManager()
    activos = SoftDeleteManager() # Nuestro manager para soft delete

    # Redefinición para evitar colisión de nombres en related_name
    groups = models.ManyToManyField(
        Group,
        verbose_name="Grupos",
        blank=True,
        help_text="Los grupos a los que pertenece este usuario. Un usuario obtendrá todos los permisos otorgados a cada uno de sus grupos.",
        related_name="usuario_set",
        related_query_name="usuario",
    )
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name="Permisos de usuario",
        blank=True,
        help_text="Permisos específicos para este usuario.",
        related_name="usuario_set",
        related_query_name="usuario",
    )

    def __str__(self):
        rol = self.groups.first()
        rol_nombre = rol.name if rol else "Sin Rol"
        return f"{self.first_name} {self.last_name} ({rol_nombre})"

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"


class Taller(models.Model):
    nombre = models.CharField(max_length=100, unique=True, help_text="Nombre descriptivo del taller (Ej: Pepsico Maipú)")
    direccion = models.CharField(max_length=255, help_text="Dirección completa del taller")

    def __str__(self):
        return f"{self.nombre} ({self.direccion})"


# --------------------------------------------------------------------------
# FLOTA Y TALLER
# --------------------------------------------------------------------------

class Vehiculo(TimeStampedModel):
    patente = models.CharField(max_length=10, primary_key=True, db_index=True)
    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    anio = models.IntegerField("Año")
    color = models.CharField(max_length=30, blank=True, null=True)
    vin = models.CharField("VIN", max_length=50, unique=True, blank=True, null=True)
    kilometraje = models.IntegerField(blank=True, null=True)
    chofer = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vehiculos',
        limit_choices_to={'groups__name': 'Chofer', 'is_active': True}
    )
    taller = models.ForeignKey(Taller, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehiculos')
    is_active = models.BooleanField(default=True)

    # Managers
    objects = models.Manager()
    activos = SoftDeleteManager()

    def __str__(self):
        return f"{self.patente} - {self.marca} {self.modelo}"
        
    class Meta:
        verbose_name = "Vehículo"
        verbose_name_plural = "Vehículos"

class Agendamiento(TimeStampedModel):
    class Estado(models.TextChoices):
        PROGRAMADO = 'Programado', 'Programado'
        CONFIRMADO = 'Confirmado', 'Confirmado'
        EN_TALLER = 'En Taller', 'En Taller'
        FINALIZADO = 'Finalizado', 'Finalizado'
        CANCELADO = 'Cancelado', 'Cancelado'
    solicita_grua = models.BooleanField(default=False, help_text="Marcar si el vehículo requiere ser movilizado por una grúa.")
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.PROTECT, related_name="agendamientos")
    chofer_asociado = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="agendamientos_chofer", limit_choices_to={'groups__name': 'Chofer'})
    mecanico_asignado = models.ForeignKey(
        Usuario, 
        on_delete=models.PROTECT, 
        related_name="citas_asignadas", 
        limit_choices_to={'groups__name': 'Mecanico'},
        null=True,  # Puede ser nulo al principio
        blank=True
    )
    fecha_hora_programada = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="La fecha/hora asignada por el Supervisor. Puede estar vacía si es solo una solicitud."
    )
    duracion_estimada_minutos = models.PositiveIntegerField(default=60)
    fecha_hora_fin = models.DateTimeField(editable=False, null=True, blank=True)
    motivo_ingreso = models.TextField()
    estado = models.CharField(max_length=50, choices=Estado.choices, default=Estado.PROGRAMADO, db_index=True)
    imagen_averia = models.ImageField(
        "Imagen de la avería", 
        upload_to='agendamientos_imagenes/%Y/%m/', 
        blank=True, 
        null=True
    )
    creado_por = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="agendamientos_creados")

    motivo_reagendamiento = models.TextField(
        "Motivo de Reagendamiento", 
        blank=True, 
        null=True,
        help_text="El motivo por el cual el supervisor cambió la hora de la cita original."
    )

    def save(self, *args, **kwargs):
        if self.fecha_hora_programada and self.duracion_estimada_minutos:
            self.fecha_hora_fin = self.fecha_hora_programada + timedelta(minutes=self.duracion_estimada_minutos)
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()

        if self.fecha_hora_programada and self.fecha_hora_programada < timezone.now():
            raise ValidationError("La fecha de la cita no puede ser en el pasado.")
        if self.pk is None and self.vehiculo:
            
            # Busca si este vehículo ya tiene OTRA cita que esté "activa"
            citas_activas_existentes = Agendamiento.objects.filter(
                vehiculo=self.vehiculo
            ).exclude(
                estado__in=[
                    Agendamiento.Estado.FINALIZADO,
                    Agendamiento.Estado.CANCELADO
                ]
            )
            
            # Si ya existe una cita activa, lanza un error
            if citas_activas_existentes.exists():
                raise ValidationError(
                    f"El vehículo {self.vehiculo.patente} ya tiene una cita activa (Programada o En Taller). "
                    "No puede agendar una nueva hasta que la anterior se complete."
                )

    def __str__(self):
        return f"Cita para {self.vehiculo.patente} el {self.fecha_hora_programada.strftime('%d-%m-%Y %H:%M')}"

    class Meta:
        verbose_name = "Agendamiento"
        verbose_name_plural = "Agendamientos"
        ordering = ['fecha_hora_programada']
        unique_together = ('vehiculo', 'fecha_hora_programada')

class AgendamientoHistorial(models.Model):
    agendamiento = models.ForeignKey(Agendamiento, on_delete=models.CASCADE, related_name='historial')
    estado = models.CharField(max_length=50)
    fecha = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    comentario = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Agendamiento {self.agendamiento.id}: {self.estado} el {self.fecha.strftime('%d-%m-%Y %H:%M')}"
    
    class Meta:
        verbose_name = "Historial de Agendamiento"
        verbose_name_plural = "Historiales de Agendamiento"
        ordering = ['-fecha']

class AgendamientoDocumento(models.Model):
    agendamiento = models.ForeignKey(Agendamiento, on_delete=models.CASCADE, related_name='documentos')
    tipo = models.CharField(max_length=50, choices=[('Foto', 'Foto'), ('Informe', 'Informe'), ('Otro', 'Otro')])
    descripcion = models.CharField(max_length=255, blank=True)
    archivo = models.FileField(upload_to='agendamientos_documentos/%Y/%m/')
    fecha = models.DateTimeField(auto_now_add=True)
    subido_por = models.ForeignKey(Usuario, on_delete=models.PROTECT)

    class Meta:
        verbose_name = "Documento de Agendamiento"
        verbose_name_plural = "Documentos de Agendamiento"
        ordering = ['-fecha']

# --------------------------------------------------------------------------
# ÓRDENES DE SERVICIO
# --------------------------------------------------------------------------

class Orden(TimeStampedModel):
    class Estado(models.TextChoices):
        INGRESADO = 'Ingresado', 'Ingresado'
        EN_DIAGNOSTICO = 'En Diagnostico', 'En Diagnóstico'
        EN_PROCESO = 'En Proceso', 'En Proceso'
        PAUSADO = 'Pausado', 'Pausado'
        FINALIZADO = 'Finalizado', 'Finalizado'

    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.PROTECT, related_name='ordenes')
    agendamiento_origen = models.OneToOneField(Agendamiento, on_delete=models.SET_NULL, null=True, blank=True, related_name="orden_generada")
    fecha_ingreso = models.DateTimeField(default=timezone.now)
    fecha_entrega_estimada = models.DateField(blank=True, null=True)
    fecha_entrega_real = models.DateTimeField(blank=True, null=True)
    estado = models.CharField(max_length=50, choices=Estado.choices, default=Estado.INGRESADO, db_index=True)
    descripcion_falla = models.TextField("Descripción de la Falla (Cliente)")
    diagnostico_tecnico = models.TextField("Diagnóstico Técnico (Mecánico)", blank=True, null=True)
    usuario_asignado = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='ordenes_asignadas',
        limit_choices_to={'groups__name__in': ['Mecanico', 'Supervisor'], 'is_active': True}
    )

    # Managers
    objects = OrdenManager()

    @property
    def costo_total(self):
        """Calcula el costo total de la orden sumando sus items."""
        total = self.items.aggregate(
            total=Sum(models.F('cantidad') * models.F('precio_unitario'))
        )['total']
        return total or 0

    def __str__(self):
        return f"Orden #{self.id} - {self.vehiculo.patente} ({self.get_estado_display()})"

    class Meta:
        verbose_name = "Orden de Servicio"
        verbose_name_plural = "Órdenes de Servicio"
        ordering = ['-fecha_ingreso']

class OrdenHistorialEstado(models.Model):
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='historial_estados')
    estado = models.CharField(max_length=50)
    fecha = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    motivo = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Orden {self.orden.id}: {self.estado} el {self.fecha.strftime('%d-%m-%Y %H:%M')}"

    class Meta:
        verbose_name = "Historial de Estado de Orden"
        verbose_name_plural = "Historiales de Estado de Orden"
        ordering = ['-fecha']

class OrdenPausa(TimeStampedModel):
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='pausas')
    inicio = models.DateTimeField(auto_now_add=True)
    fin = models.DateTimeField(blank=True, null=True)
    motivo = models.CharField(max_length=255, blank=True, null=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.PROTECT)

    @property
    def duracion(self):
        """Calcula la duración de la pausa en minutos."""
        if self.fin and self.inicio:
            return round((self.fin - self.inicio).total_seconds() / 60)
        return 0

    def get_duracion_display(self):
        if self.fin:
            return f"{self.duracion} min"
        return "Activa"

    def __str__(self):
        return f"Pausa Orden #{self.orden.id} ({self.get_duracion_display()})"

    class Meta:
        verbose_name = "Pausa de Orden"
        verbose_name_plural = "Pausas de Orden"
        ordering = ['-inicio']

class OrdenDocumento(models.Model):
    tipo = models.CharField(max_length=50, blank=True, null=True)
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='documentos')
    
    descripcion = models.CharField(max_length=255, blank=True)
    archivo = models.FileField(upload_to='ordenes_documentos/%Y/%m/')
    fecha = models.DateTimeField(auto_now_add=True)
    subido_por = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    estado_en_carga = models.CharField("Estado al Cargar", max_length=50, blank=True, null=True, db_index=True)
    def __str__(self):
        return f"{self.get_tipo_display()} para Orden #{self.orden.id}"

    class Meta:
        verbose_name = "Documento de Orden"
        verbose_name_plural = "Documentos de Orden"
        ordering = ['-fecha']

# --------------------------------------------------------------------------
# CATÁLOGO (Productos y Servicios)
# --------------------------------------------------------------------------

class Producto(TimeStampedModel):
    sku = models.CharField(max_length=50, primary_key=True)
    nombre = models.CharField(max_length=150, db_index=True)
    descripcion = models.TextField(blank=True, null=True)
    marca = models.CharField(max_length=50, blank=True, null=True)
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.nombre} ({self.sku})"

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"

class Servicio(TimeStampedModel):
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    precio_base = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Servicio"
        verbose_name_plural = "Servicios"

class OrdenItem(models.Model):
    
    class EstadoRepuesto(models.TextChoices):
        NO_APLICA = 'N/A', 'No Aplica' # Para servicios o items no inventariables
        PENDIENTE = 'Pendiente', 'Pendiente de Aprobación'
        APROBADO = 'Aprobado', 'Aprobado y Descontado'
        RECHAZADO = 'Rechazado', 'Rechazado (Sin Stock)'
    
    estado_repuesto = models.CharField(
        max_length=50, 
        choices=EstadoRepuesto.choices, 
        default=EstadoRepuesto.NO_APLICA,
        db_index=True
    )
    solicitado_por = models.ForeignKey(
        Usuario, 
        related_name='items_solicitados', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    gestionado_por = models.ForeignKey(
        Usuario, 
        related_name='items_gestionados', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    motivo_gestion = models.TextField(blank=True, null=True) # Para el motivo de rechazo
    fecha_gestion = models.DateTimeField(blank=True, null=True)
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey(Producto, on_delete=models.SET_NULL, blank=True, null=True)
    servicio = models.ForeignKey(Servicio, on_delete=models.SET_NULL, blank=True, null=True)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, default=1.0)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def clean(self):
        if (self.producto and self.servicio) or (not self.producto and not self.servicio):
            raise ValidationError("Debe especificar un producto o un servicio, pero no ambos.")

    def save(self, *args, **kwargs):
       
        if self._state.adding and self.producto:      
            self.estado_repuesto = self.EstadoRepuesto.PENDIENTE
            if not hasattr(self, 'precio_unitario') or not self.precio_unitario:
                self.precio_unitario = self.producto.precio_venta
        elif self._state.adding and self.servicio:
            self.estado_repuesto = self.EstadoRepuesto.NO_APLICA
            if not hasattr(self, 'precio_unitario') or not self.precio_unitario:
                self.precio_unitario = self.servicio.precio_base
        super().save(*args, **kwargs)

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unitario

    def __str__(self):
        item_name = self.producto.nombre if self.producto else self.servicio.nombre
        return f"{item_name} (x{self.cantidad})"

    class Meta:
        verbose_name = "Ítem de Orden"
        verbose_name_plural = "Ítems de Orden"

# --------------------------------------------------------------------------
# NOTIFICACIONES
# --------------------------------------------------------------------------

class Notificacion(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='notificaciones')
    mensaje = models.CharField(max_length=255)
    link = models.CharField(max_length=255, blank=True, null=True) # Link para redirigir al usuario
    leida = models.BooleanField(default=False, db_index=True)
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notificación a {self.usuario.username}: {self.mensaje[:30]}..."

    class Meta:
        verbose_name = "Notificación"
        verbose_name_plural = "Notificaciones"
        ordering = ['-fecha']



# --------------------------------------------------------------------------
# GESTIÓN DE LLAVES (NUEVO MÓDULO)
# --------------------------------------------------------------------------

class LlaveVehiculo(TimeStampedModel):
    """
    Representa una llave física en el inventario (el pañol).
    Cubre: "Control de duplicados, chapas, etc."
    """
    class Tipo(models.TextChoices):
        ORIGINAL = 'Original', 'Original'
        DUPLICADO = 'Duplicado', 'Duplicado'
        CONTROL_ACCESO = 'Control', 'Control de Acceso'
        TALLER = 'Taller', 'Llave de Taller'

    class Estado(models.TextChoices):
        EN_BODEGA = 'En Bodega', 'En Bodega'
        PRESTADA = 'Prestada', 'Prestada'
        PERDIDA = 'Perdida', 'Perdida'
        DADA_DE_BAJA = 'Dada de Baja', 'Dada de Baja'

    class Estado(models.TextChoices):
        EN_BODEGA = 'En Bodega', 'En Bodega'
        PRESTADA = 'Prestada', 'Prestada'
        PERDIDA = 'Perdida', 'Perdida'
        DAÑADA = 'Dañada', 'Dañada'  # <-- AÑADIR ESTA LÍNEA
        DADA_DE_BAJA = 'Dada de Baja', 'Dada de Baja'

    # "Control de llaves por patente"
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.PROTECT, related_name="llaves")
    
    codigo_interno = models.CharField(max_length=50, unique=True, help_text="Código único o ID del llavero físico.")
    tipo = models.CharField(max_length=50, choices=Tipo.choices, default=Tipo.ORIGINAL)
    estado = models.CharField(max_length=50, choices=Estado.choices, default=Estado.EN_BODEGA, db_index=True)
    
    # Este campo se actualiza automáticamente para saber quién la tiene
    poseedor_actual = models.ForeignKey(
        Usuario, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="llaves_en_posesion"
    )
    motivo_reporte = models.TextField(
        "Motivo del Reporte", 
        blank=True, 
        null=True,
        help_text="Razón por la cual la llave fue marcada como perdida o dañada."
    )

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.vehiculo.patente} (Cód: {self.codigo_interno})"

    class Meta:
        verbose_name = "Llave de Vehículo"
        verbose_name_plural = "Inventario de Llaves"
        ordering = ['vehiculo__patente', 'tipo']


class PrestamoLlave(TimeStampedModel):
    """
    Representa el "Registro de préstamos temporales".
    """
    llave = models.ForeignKey(LlaveVehiculo, on_delete=models.PROTECT, related_name="prestamos")
    usuario_retira = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="prestamos_realizados")
    
    fecha_hora_retiro = models.DateTimeField(default=timezone.now)
    fecha_hora_devolucion = models.DateTimeField(blank=True, null=True, db_index=True)
    
    observaciones_retiro = models.TextField(blank=True, null=True)
    observaciones_devolucion = models.TextField(blank=True, null=True)

    def __str__(self):
        estado = "ACTIVO" if self.fecha_hora_devolucion is None else "DEVUELTO"
        return f"Préstamo {self.llave.codigo_interno} a {self.usuario_retira.username} ({estado})"

    class Meta:
        verbose_name = "Préstamo de Llave"
        verbose_name_plural = "Historial de Préstamos"
        ordering = ['-fecha_hora_retiro']



class LlaveHistorialEstado(TimeStampedModel):
    """
    Registra cada cambio de estado reportado (Dañada, Perdida)
    y su eventual reversión.
    """
    llave = models.ForeignKey(LlaveVehiculo, on_delete=models.CASCADE, related_name="historial_estados")
    usuario_reporta = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="reportes_llave_realizados")

    estado_anterior = models.CharField(max_length=50, blank=True, null=True)
    estado_nuevo = models.CharField(max_length=50)
    motivo = models.TextField(blank=True, null=True)
    fecha = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.llave.codigo_interno}: {self.estado_anterior} -> {self.estado_nuevo}"

    class Meta:
        verbose_name = "Historial de Estado de Llave"
        verbose_name_plural = "Historiales de Estados de Llave"
        ordering = ['-fecha']