# En: backend/accounts/management/commands/populate_data.py
# --- VERSIÓN CORREGIDA ---

import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction, IntegrityError
from faker import Faker
from accounts.models import (
    Usuario, Vehiculo, Agendamiento, Orden, Producto, Servicio, OrdenItem,
    LlaveVehiculo, PrestamoLlave
)
from django.contrib.auth.models import Group

# Importamos los modelos que faltaban en tu 'delete'
from accounts.models import OrdenHistorialEstado, OrdenDocumento, OrdenPausa, Notificacion


class Command(BaseCommand):
    help = 'Popula la base de datos con datos BASE (Usuarios, Vehículos, Llaves, Catálogo). Sin Órdenes ni Agendamientos.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Elimina todos los datos existentes antes de popular.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Iniciando la carga de datos BASE...")
        
        if options['delete']:
            self.stdout.write(self.style.WARNING("Eliminando TODOS los datos existentes..."))
            # Borramos en orden de dependencia (corregido)
            OrdenItem.objects.all().delete()
            OrdenHistorialEstado.objects.all().delete()
            OrdenDocumento.objects.all().delete()
            OrdenPausa.objects.all().delete()
            Orden.objects.all().delete()
            PrestamoLlave.objects.all().delete() 
            LlaveVehiculo.objects.all().delete() 
            Agendamiento.objects.all().delete() 
            Vehiculo.objects.all().delete()
            Producto.objects.all().delete()
            Servicio.objects.all().delete()
            Notificacion.objects.all().delete()
            Usuario.objects.filter(is_superuser=False).delete()
            self.stdout.write(self.style.SUCCESS("Datos eliminados. Creando datos base..."))

        faker = Faker('es_CL')

        # --- 1. Buscar Grupos ---
        grupos_nombres = [
            'admin', 'Chofer', 'Mecanico', 'Supervisor', 
            'Seguridad', 'Administrativo', 'Control Llaves'
        ]
        grupos = {}
        try:
            for name in grupos_nombres:
                grupos[name] = Group.objects.get(name=name)
            self.stdout.write(f"Grupos encontrados: {list(grupos.keys())}")
        except Group.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(f"Error: El grupo '{e}' no fue encontrado. Asegúrate de haber creado los grupos en el admin de Django (o con tu archivo grupos.json)."))
            return

        # --- 2. Crear Usuarios ---
        default_password = 'password123'

        # Función auxiliar (esta ya era correcta)
        def crear_o_actualizar_usuario(username, email, first_name, last_name, grupo):
            usuario, created = Usuario.objects.update_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'rut': faker.rut(),
                    'is_staff': grupo.name in ['admin', 'Supervisor', 'Control Llaves']
                }
            )
            if created:
                usuario.set_password(default_password)
                usuario.save()
            
            usuario.groups.clear()
            usuario.groups.add(grupo)
            return usuario

        # Admin (esta ya era correcta)
        if not Usuario.objects.filter(username='admin').exists():
            admin_user = Usuario.objects.create_superuser('admin', 'admin@taller.cl', default_password)
            admin_user.first_name = "Admin"
            admin_user.last_name = "Principal"
            admin_user.rut = faker.rut()
            admin_user.save()
            admin_user.groups.add(grupos['admin'])
            self.stdout.write(f"Superusuario 'admin' creado (pass: '{default_password}').")

        # Usuarios de Roles (esta ya era correcta)
        supervisor = crear_o_actualizar_usuario('supervisor', 'supervisor@taller.cl', 'Juan', 'Pérez', grupos['Supervisor'])
        mecanico1 = crear_o_actualizar_usuario('mecanico1', 'mecanico1@taller.cl', 'Carlos', 'Soto', grupos['Mecanico'])
        mecanico2 = crear_o_actualizar_usuario('mecanico2', 'mecanico2@taller.cl', 'Miguel', 'Torres', grupos['Mecanico'])
        seguridad = crear_o_actualizar_usuario('seguridad', 'seguridad@taller.cl', 'Ana', 'López', grupos['Seguridad'])
        administrativo = crear_o_actualizar_usuario('administrativo', 'administrativo@taller.cl', 'Maria', 'Gonzalez', grupos['Administrativo'])
        control_llaves = crear_o_actualizar_usuario('llaves', 'llaves@taller.cl', 'Encargado', 'Pañol', grupos['Control Llaves'])
        chofer1 = crear_o_actualizar_usuario('chofer1', 'chofer1@taller.cl', 'Luis', 'Rojas', grupos['Chofer'])
        chofer2 = crear_o_actualizar_usuario('chofer2', 'chofer2@taller.cl', 'Pedro', 'Araya', grupos['Chofer'])
        self.stdout.write(self.style.SUCCESS(f"Usuarios base verificados o creados (pass: '{default_password}')."))

        
        # --- 3. Crear Vehículos y sus Llaves (LÓGICA CORREGIDA) ---
        # Usamos patentes FIJAS para que 'get_or_create' no cree duplicados.
        # Estas patentes cumplen tu formato LLLLDD o LLDDDD.
        
        self.stdout.write("Verificando vehículos base...")

        vehiculos_base = [
            {'patente': 'BCDF10', 'marca': 'Chevrolet', 'modelo': 'Silverado', 'chofer': chofer1},
            {'patente': 'GHJK20', 'marca': 'Ford', 'modelo': 'F-150', 'chofer': chofer2},
            {'patente': 'XY1234', 'marca': 'Toyota', 'modelo': 'Hilux', 'chofer': chofer1},
            {'patente': 'ZW5678', 'marca': 'Nissan', 'modelo': 'NP300', 'chofer': chofer2},
        ]

        vehiculos_creados_count = 0
        vehiculos_actualizados_count = 0

        for v in vehiculos_base:
            vehiculo, created = Vehiculo.objects.get_or_create(
                patente=v['patente'], # <-- CLAVE: La patente ahora es fija
                defaults={
                    'marca': v['marca'],
                    'modelo': v['modelo'],
                    'chofer': v['chofer'],
                    # Los 'defaults' solo se usan si el vehículo es NUEVO
                    'anio': random.randint(2018, 2024),
                    'kilometraje': random.randint(10000, 150000),
                }
            )

            if created:
                vehiculos_creados_count += 1
          
                try:
                    LlaveVehiculo.objects.get_or_create(
                        vehiculo=vehiculo,
                        tipo=LlaveVehiculo.Tipo.ORIGINAL,
                        defaults={'codigo_interno': f"{vehiculo.patente}-ORI"}
                    )
                    LlaveVehiculo.objects.get_or_create(
                        vehiculo=vehiculo,
                        tipo=LlaveVehiculo.Tipo.DUPLICADO,
                        defaults={'codigo_interno': f"{vehiculo.patente}-DUP"}
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"No se pudieron crear llaves para {vehiculo.patente}: {e}"))
            else:
                vehiculos_actualizados_count += 1
        
        self.stdout.write(self.style.SUCCESS(f"{vehiculos_creados_count} vehículos nuevos creados, {vehiculos_actualizados_count} vehículos existentes verificados."))

        
   
        Producto.objects.get_or_create(sku='ACE-10W40', defaults={'nombre': 'Aceite Motor 10W40', 'precio_venta': 12500, 'stock': 50})
        Producto.objects.get_or_create(sku='FIL-AIRE-01', defaults={'nombre': 'Filtro de Aire Motor', 'precio_venta': 8990, 'stock': 30})
        Servicio.objects.get_or_create(nombre='Cambio de Aceite', defaults={'precio_base': 25000})
        Servicio.objects.get_or_create(nombre='Alineación y Balanceo', defaults={'precio_base': 35000})
        self.stdout.write("Productos y Servicios de catálogo verificados o creados.")

        
        self.stdout.write(self.style.SUCCESS("\n¡Carga de datos BASE finalizada con éxito!"))
        self.stdout.write("El sistema está limpio y listo para probar el flujo completo desde la App.") 