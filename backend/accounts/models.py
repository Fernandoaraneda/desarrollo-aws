from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.core.exceptions import ValidationError
from django.utils import timezone

# -----------------------------------------------------------------------------
# MODELOS DE USUARIOS Y ROLES (Sin cambios)
# -----------------------------------------------------------------------------
class Usuario(AbstractUser):
    rut = models.CharField(max_length=12, unique=True)
    telefono = models.CharField(max_length=50, blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    groups = models.ManyToManyField(
        Group,
        related_name="usuarios_groups",
        blank=True,
        help_text="Los grupos a los que pertenece este usuario. Un usuario obtendrá todos los permisos otorgados a cada uno de sus grupos.",
        verbose_name="grupos"
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name="usuarios_permissions",
        blank=True,
        help_text="Permisos específicos para este usuario.",
        verbose_name="permisos de usuario"
    )
    def __str__(self):
        group = self.groups.first()
        rol_nombre = group.name if group else "Sin Rol"
        return f"{self.first_name} {self.last_name} ({rol_nombre})"

# -----------------------------------------------------------------------------
# MODELOS DE LA FLOTA Y TALLER
# -----------------------------------------------------------------------------
class Vehiculo(models.Model):
    patente = models.CharField(max_length=10, primary_key=True)
    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    anio = models.IntegerField("Año")
    color = models.CharField(max_length=30, blank=True, null=True)
    vin = models.CharField("VIN", max_length=50, unique=True, blank=True, null=True)
    kilometraje = models.IntegerField(blank=True, null=True)

    chofer = models.ForeignKey(
        'Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vehiculos',
        limit_choices_to={'groups__name': 'Chofer'}
    )

    def __str__(self):
        if self.chofer:
            return f"{self.patente} - {self.marca} {self.modelo} ({self.chofer.first_name})"
        return f"{self.patente} - {self.marca} {self.modelo}"

class Agendamiento(models.Model):
    ESTADOS_AGENDA = [
        ('Programado', 'Programado'),
        ('Confirmado', 'Confirmado'),
        ('Cancelado', 'Cancelado'),
        ('Completado', 'Completado'),
    ]
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.PROTECT, related_name="agendamientos")
    chofer_asociado = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="agendamientos_chofer", limit_choices_to={'groups__name': 'Chofer'})
    fecha_hora_programada = models.DateTimeField()
    duracion_estimada_minutos = models.PositiveIntegerField(default=60, help_text="Duración estimada en minutos para evitar solapamientos.")
    motivo_ingreso = models.TextField(help_text="Breve descripción del motivo de la visita.")
    estado = models.CharField(max_length=50, choices=ESTADOS_AGENDA, default='Programado')
    creado_por = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="agendamientos_creados")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cita para {self.vehiculo.patente} el {self.fecha_hora_programada.strftime('%d-%m-%Y %H:%M')}"

    class Meta:
        verbose_name = "Agendamiento"
        verbose_name_plural = "Agendamientos"
        ordering = ['fecha_hora_programada']
        # 👇 MEJORA 1: Evita que el mismo vehículo sea agendado a la misma hora exacta.
        unique_together = ('vehiculo', 'fecha_hora_programada')

class Orden(models.Model):
    ESTADOS_ORDEN = [
        ('Ingresado', 'Ingresado'),
        ('En Diagnostico', 'En Diagnóstico'),
        ('En Proceso', 'En Proceso'),
        ('Pausado', 'Pausado'),
        ('Finalizado', 'Finalizado'),
    ]
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.PROTECT, related_name='ordenes')
    agendamiento_origen = models.OneToOneField(Agendamiento, on_delete=models.SET_NULL, null=True, blank=True, related_name="orden_generada")
    fecha_ingreso = models.DateTimeField(default=timezone.now)
    fecha_entrega_estimada = models.DateField(blank=True, null=True)
    fecha_entrega_real = models.DateTimeField(blank=True, null=True)
    estado = models.CharField(max_length=50, choices=ESTADOS_ORDEN, default='Ingresado')
    descripcion_falla = models.TextField("Descripción de la Falla (Cliente)")
    diagnostico_tecnico = models.TextField("Diagnóstico Técnico (Mecánico)", blank=True, null=True)
    usuario_asignado = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='ordenes_asignadas',
        limit_choices_to={'groups__name__in': ['Mecanico', 'Supervisor']}
    )
    def __str__(self):
        return f"Orden #{self.id} - {self.vehiculo.patente} ({self.estado})"

    class Meta:
        verbose_name = "Orden de Servicio"
        verbose_name_plural = "Órdenes de Servicio"

class OrdenHistorialEstado(models.Model):
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='historial_estados')
    estado = models.CharField(max_length=50)
    fecha = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    motivo = models.CharField(max_length=255, blank=True, null=True, help_text="Motivo del cambio de estado, especialmente para pausas.")
    def __str__(self):
        return f"Orden {self.orden.id}: {self.estado} el {self.fecha.strftime('%d-%m-%Y %H:%M')}"
    class Meta:
        verbose_name = "Historial de Estado de Orden"
        verbose_name_plural = "Historiales de Estado de Órdenes"

class OrdenDocumento(models.Model):
    TIPOS = [('Foto', 'Foto'), ('Informe', 'Informe'), ('PDF', 'PDF'), ('Otro', 'Otro')]
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='documentos')
    tipo = models.CharField(max_length=50, choices=TIPOS)
    descripcion = models.CharField(max_length=255, blank=True)
    archivo = models.FileField(upload_to='ordenes_documentos/%Y/%m/', help_text="Sube un archivo (foto, PDF, etc.)")
    fecha = models.DateTimeField(auto_now_add=True)
    subido_por = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    def __str__(self):
        return f"{self.get_tipo_display()} para Orden #{self.orden.id}"
    class Meta:
        verbose_name = "Documento de Orden"
        verbose_name_plural = "Documentos de Órdenes"

# -----------------------------------------------------------------------------
# MODELOS DE CATÁLOGO (Repuestos y Servicios)
# -----------------------------------------------------------------------------
class Producto(models.Model):
    sku = models.CharField(max_length=50, primary_key=True)
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    marca = models.CharField(max_length=50, blank=True, null=True)
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock = models.PositiveIntegerField(default=0)
    def __str__(self):
        return f"{self.nombre} ({self.sku})"

class Servicio(models.Model):
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    precio_base = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio base o por hora del servicio.")
    def __str__(self):
        return self.nombre

class OrdenItem(models.Model):
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey(Producto, on_delete=models.SET_NULL, blank=True, null=True)
    servicio = models.ForeignKey(Servicio, on_delete=models.SET_NULL, blank=True, null=True)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, default=1.0)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio al momento de la venta/servicio. Se autocompleta si se deja en blanco.")
    
    def clean(self):
        if (self.producto and self.servicio) or (not self.producto and not self.servicio):
            raise ValidationError("Debe especificar un producto o un servicio, pero no ambos.")
    
    # 👇 MEJORA 2: Autocompleta el precio_unitario al guardar si está vacío.
    def save(self, *args, **kwargs):
        if self._state.adding and not self.precio_unitario:
            if self.producto:
                self.precio_unitario = self.producto.precio_venta
            elif self.servicio:
                self.precio_unitario = self.servicio.precio_base
        super().save(*args, **kwargs)

    def __str__(self):
        if self.producto:
            return f"{self.producto.nombre} (x{self.cantidad})"
        else:
            return f"{self.servicio.nombre} (x{self.cantidad})"

    class Meta:
        verbose_name = "Ítem de Orden"
        verbose_name_plural = "Ítems de Órdenes"
