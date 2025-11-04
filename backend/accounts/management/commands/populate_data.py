# En: backend/accounts/management/commands/populate_data.py

import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction, IntegrityError
from faker import Faker
from accounts.models import (
    Usuario, Vehiculo, Agendamiento, Orden, Producto, Servicio, OrdenItem,
    LlaveVehiculo, PrestamoLlave  # Importamos los nuevos modelos
)
from django.contrib.auth.models import Group

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
            # Borramos en orden de dependencia
            OrdenItem.objects.all().delete()
            OrdenHistorialEstado.objects.all().delete()
            OrdenDocumento.objects.all().delete()
            OrdenPausa.objects.all().delete()
            Orden.objects.all().delete()
            PrestamoLlave.objects.all().delete() # <-- NUEVO
            LlaveVehiculo.objects.all().delete() # <-- NUEVO
            Agendamiento.objects.all().delete() # (Aunque no debería haber, por si acaso)
            Vehiculo.objects.all().delete()
            Producto.objects.all().delete()
            Servicio.objects.all().delete()
            Notificacion.objects.all().delete()
            Usuario.objects.filter(is_superuser=False).delete()
            self.stdout.write(self.style.SUCCESS("Datos eliminados. Creando datos base..."))

        faker = Faker('es_CL')

        # --- 1. Buscar Grupos ---
        # (Asegúrate de haber creado el grupo 'Control Llaves' en el Admin)
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
            self.stdout.write(self.style.ERROR(f"Error: El grupo '{e}' no fue encontrado. Asegúrate de haberlo creado en el Admin de Django."))
            return

        # --- 2. Crear Usuarios ---
        default_password = 'password123'

        # Función auxiliar
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

        # Admin (si no existe)
        if not Usuario.objects.filter(username='admin').exists():
            admin_user = Usuario.objects.create_superuser('admin', 'admin@taller.cl', default_password)
            admin_user.first_name = "Admin"
            admin_user.last_name = "Principal"
            admin_user.rut = faker.rut()
            admin_user.save()
            admin_user.groups.add(grupos['admin'])
            self.stdout.write(f"Superusuario 'admin' creado (pass: '{default_password}').")

        # Usuarios de Roles
        supervisor = crear_o_actualizar_usuario('supervisor', 'supervisor@taller.cl', 'Juan', 'Pérez', grupos['Supervisor'])
        
        # Dos Mecanicos
        mecanico1 = crear_o_actualizar_usuario('mecanico1', 'mecanico1@taller.cl', 'Carlos', 'Soto', grupos['Mecanico'])
        mecanico2 = crear_o_actualizar_usuario('mecanico2', 'mecanico2@taller.cl', 'Miguel', 'Torres', grupos['Mecanico'])
        
        seguridad = crear_o_actualizar_usuario('seguridad', 'seguridad@taller.cl', 'Ana', 'López', grupos['Seguridad'])
        administrativo = crear_o_actualizar_usuario('administrativo', 'administrativo@taller.cl', 'Maria', 'Gonzalez', grupos['Administrativo'])
        
        # Nuevo Rol
        control_llaves = crear_o_actualizar_usuario('llaves', 'llaves@taller.cl', 'Encargado', 'Pañol', grupos['Control Llaves'])
        
        # Dos Choferes
        chofer1 = crear_o_actualizar_usuario('chofer1', 'chofer1@taller.cl', 'Luis', 'Rojas', grupos['Chofer'])
        chofer2 = crear_o_actualizar_usuario('chofer2', 'chofer2@taller.cl', 'Pedro', 'Araya', grupos['Chofer'])
        choferes = [chofer1, chofer2]
        self.stdout.write(self.style.SUCCESS(f"Usuarios base creados (pass: '{default_password}')."))

        # --- 3. Crear Vehículos y sus Llaves ---
        def generar_patente():
            letras = 'BCDFGHJKLPRSTVWXYZ'
            return f"{''.join(random.choices(letras, k=4))}-{''.join(random.choices('0123456789', k=2))}"

        marcas_modelos = {'Chevrolet': 'Silverado', 'Ford': 'F-150', 'Toyota': 'Hilux', 'Nissan': 'NP300'}
        patentes_creadas = set()
        vehiculos = []

        for i in range(4):
            # Asegurar patente única
            patente = generar_patente()
            while patente in patentes_creadas:
                patente = generar_patente()
            patentes_creadas.add(patente)
            
            marca = random.choice(list(marcas_modelos.keys()))
            
            vehiculo, created = Vehiculo.objects.get_or_create(
                patente=patente,
                defaults={
                    'marca': marca,
                    'modelo': marcas_modelos[marca],
                    'anio': random.randint(2018, 2024),
                    'kilometraje': random.randint(10000, 150000),
                    'chofer': choferes[i % len(choferes)] # Asigna un chofer a cada vehiculo
                }
            )
            vehiculos.append(vehiculo)

            # --- Lógica de creación de llaves ---
            if created:
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
        
        self.stdout.write(self.style.SUCCESS(f"{len(vehiculos)} vehículos creados (con 2 llaves cada uno) y asignados."))
        
        # --- 4. Crear Productos y Servicios (Catálogo) ---
        Producto.objects.get_or_create(sku='ACE-10W40', defaults={'nombre': 'Aceite Motor 10W40', 'precio_venta': 12500, 'stock': 50})
        Producto.objects.get_or_create(sku='FIL-AIRE-01', defaults={'nombre': 'Filtro de Aire Motor', 'precio_venta': 8990, 'stock': 30})
        Servicio.objects.get_or_create(nombre='Cambio de Aceite', defaults={'precio_base': 25000})
        Servicio.objects.get_or_create(nombre='Alineación y Balanceo', defaults={'precio_base': 35000})
        self.stdout.write("Productos y Servicios de catálogo creados.")

        # --- NO SE CREAN AGENDAMIENTOS NI ÓRDENES ---
        
        self.stdout.write(self.style.SUCCESS("\n¡Carga de datos BASE finalizada con éxito!"))
        self.stdout.write("El sistema está limpio y listo para probar el flujo completo desde la App.")