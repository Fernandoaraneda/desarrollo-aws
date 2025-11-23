from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Usuario, Vehiculo, Agendamiento, Orden, OrdenHistorialEstado, 
    OrdenPausa, OrdenDocumento, Producto, Servicio, OrdenItem, 
    Notificacion, Taller, LlaveVehiculo, PrestamoLlave, 
    LlaveHistorialEstado, AgendamientoHistorial, AgendamientoDocumento,
    ChatRoom, ChatMessage
)

from .forms import UsuarioCreationForm 




@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    add_form = UsuarioCreationForm
    model = Usuario
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'rut', 'password1', 'password2', 'first_name', 'last_name', 'email', 'telefono', 'groups', 'is_active', 'is_staff')
        }),
    )
    list_display = ('username', 'get_rol', 'email', 'first_name', 'last_name', 'is_staff')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Información personal', {'fields': ('first_name', 'last_name', 'email', 'rut', 'telefono')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Fechas importantes', {'fields': ('last_login', 'date_joined')}),
    )

    @admin.display(description='Rol (Grupo)')
    def get_rol(self, obj):
        return obj.groups.first().name if obj.groups.exists() else 'Sin Rol'




@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = ('patente', 'marca', 'modelo', 'chofer', 'taller', 'is_active')
    list_filter = ('is_active', 'taller', 'marca')
    search_fields = ('patente', 'marca', 'modelo', 'chofer__username')
    autocomplete_fields = ['chofer', 'taller']

@admin.register(Taller)
class TallerAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'direccion')
    search_fields = ('nombre', 'direccion')






class AgendamientoDocumentoInline(admin.TabularInline):
    model = AgendamientoDocumento
    extra = 0
    readonly_fields = ('subido_por', 'fecha', 'descripcion', 'archivo')


class AgendamientoHistorialInline(admin.TabularInline):
    model = AgendamientoHistorial
    extra = 0
    readonly_fields = ('estado', 'fecha', 'usuario', 'comentario')

@admin.register(Agendamiento)
class AgendamientoAdmin(admin.ModelAdmin):
    list_display = ('id', 'vehiculo', 'fecha_hora_programada', 'estado', 'mecanico_asignado', 'creado_por')
    list_filter = ('estado', 'fecha_hora_programada', 'es_mantenimiento', 'solicita_grua')
    search_fields = ('vehiculo__patente', 'creado_por__username', 'mecanico_asignado__username')
    autocomplete_fields = ['vehiculo', 'chofer_asociado', 'mecanico_asignado', 'creado_por']
    inlines = [
        AgendamientoDocumentoInline,
        AgendamientoHistorialInline
    ]





class OrdenItemInline(admin.TabularInline):
    model = OrdenItem
    extra = 1
    autocomplete_fields = ['producto', 'servicio']

class OrdenDocumentoInline(admin.TabularInline):
    model = OrdenDocumento
    extra = 1

class OrdenHistorialEstadoInline(admin.TabularInline):
    model = OrdenHistorialEstado
    extra = 0
    readonly_fields = ('estado', 'fecha', 'usuario', 'motivo')
    

class OrdenPausaInline(admin.TabularInline):
    model = OrdenPausa
    extra = 0
    readonly_fields = ('inicio', 'fin', 'motivo', 'usuario')

@admin.register(Orden)
class OrdenAdmin(admin.ModelAdmin):
    list_display = ('id', 'vehiculo', 'estado', 'fecha_ingreso', 'usuario_asignado', 'costo_total')
    list_filter = ('estado', 'fecha_ingreso')
    search_fields = ('id', 'vehiculo__patente', 'usuario_asignado__username')
    readonly_fields = ('fecha_ingreso', 'costo_total')
    autocomplete_fields = ['vehiculo', 'agendamiento_origen', 'usuario_asignado']
    
    inlines = [
        OrdenItemInline,
        OrdenDocumentoInline,
        OrdenHistorialEstadoInline,
        OrdenPausaInline
    ]




@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('sku', 'nombre', 'marca', 'precio_venta', 'stock')
    search_fields = ('sku', 'nombre', 'marca')

@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'precio_base')
    search_fields = ('nombre',)





class PrestamoLlaveInline(admin.TabularInline):
    """Muestra el historial de préstamos DENTRO de la llave"""
    model = PrestamoLlave
    extra = 0
    readonly_fields = ('usuario_retira', 'fecha_hora_retiro', 'fecha_hora_devolucion')

@admin.register(LlaveVehiculo)
class LlaveVehiculoAdmin(admin.ModelAdmin):
    list_display = ('codigo_interno', 'vehiculo', 'tipo', 'estado', 'poseedor_actual')
    list_filter = ('estado', 'tipo')
    search_fields = ('codigo_interno', 'vehiculo__patente', 'poseedor_actual__username')
    autocomplete_fields = ['vehiculo', 'poseedor_actual']
    inlines = [PrestamoLlaveInline]

@admin.register(PrestamoLlave)
class PrestamoLlaveAdmin(admin.ModelAdmin):
    list_display = ('llave', 'usuario_retira', 'fecha_hora_retiro', 'fecha_hora_devolucion')
    search_fields = ('llave__codigo_interno', 'usuario_retira__username')
    autocomplete_fields = ['llave', 'usuario_retira']

@admin.register(LlaveHistorialEstado)
class LlaveHistorialEstadoAdmin(admin.ModelAdmin):
    list_display = ('llave', 'estado_nuevo', 'usuario_reporta', 'fecha')
    readonly_fields = ('fecha',)
    



@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'mensaje_corto', 'leida', 'fecha')
    list_filter = ('leida', 'fecha')
    search_fields = ('usuario__username', 'mensaje')
    readonly_fields = ('fecha',)
    list_per_page = 20
    
    @admin.display(description='Mensaje')
    def mensaje_corto(self, obj):
        return (obj.mensaje[:75] + '...') if len(obj.mensaje) > 75 else obj.mensaje




class ChatMessageInline(admin.TabularInline):
    """Permite ver los mensajes dentro de la vista de la Sala de Chat."""
    model = ChatMessage
    fields = ('autor', 'contenido', 'creado_en', 'leido_por')
    readonly_fields = ('autor', 'contenido', 'creado_en', 'leido_por')
    extra = 0
    ordering = ('creado_en',)

@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'creado_en', 'actualizado_en')
    search_fields = ('nombre', 'participantes__username')
    filter_horizontal = ('participantes',)
    inlines = [ChatMessageInline]
    readonly_fields = ('creado_en', 'actualizado_en')

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'room', 'autor', 'creado_en', 'leido')
    search_fields = ('contenido', 'autor__username', 'room__nombre')
    list_filter = ('room', 'autor', 'creado_en')
    readonly_fields = ('creado_en', 'actualizado_en')
    
    @admin.display(description='Leído', boolean=True)
    def leido(self, obj):

        return obj.leido_por.exclude(id=obj.autor_id).exists()