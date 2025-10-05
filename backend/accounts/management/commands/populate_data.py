# En: backend/accounts/management/commands/populate_data.py

import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction, IntegrityError
from faker import Faker
from accounts.models import (
    Usuario, Vehiculo, Agendamiento, Orden, Producto, Servicio, OrdenItem
)
from django.contrib.auth.models import Group

class Command(BaseCommand):
    help = 'Populate the database with realistic Chilean fake data. Assumes groups are pre-loaded from a fixture.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Delete existing data before populating',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Iniciando la carga de datos ficticios...")
        
        if options['delete']:
            self.stdout.write(self.style.WARNING("Eliminando datos existentes..."))
            OrdenItem.objects.all().delete()
            Orden.objects.all().delete()
            Agendamiento.objects.all().delete()
            Vehiculo.objects.all().delete()
            Producto.objects.all().delete()
            Servicio.objects.all().delete()
            Usuario.objects.filter(is_superuser=False).delete()
            self.stdout.write(self.style.SUCCESS("Datos eliminados."))

        faker = Faker('es_CL')

        # --- Buscar Grupos (asume que ya existen desde el fixture) ---
        grupos_nombres = ['admin', 'Chofer', 'Mecánico', 'Supervisor', 'Seguridad', 'Administrativo']
        grupos = {}
        try:
            for name in grupos_nombres:
                grupos[name] = Group.objects.get(name=name)
            self.stdout.write("Grupos encontrados exitosamente.")
        except Group.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(f"Error: El grupo '{e}' no fue encontrado. Asegúrate de haber cargado el fixture 'grupos.json' primero."))
            return # Detiene la ejecución si falta un grupo

        # --- Crear o Actualizar Usuarios ---
        default_password = 'password123'

        # Admin (si no existe)
        if not Usuario.objects.filter(username='admin').exists():
            admin_user = Usuario.objects.create_superuser('admin', 'admin@taller.cl', default_password)
            admin_user.first_name = "Admin"
            admin_user.last_name = "Principal"
            admin_user.rut = faker.rut()
            admin_user.save()
            admin_user.groups.add(grupos['admin'])
            self.stdout.write(f"Superusuario 'admin' creado con contraseña '{default_password}'.")

        # Función para crear o actualizar usuarios
        def crear_o_actualizar_usuario(username, email, first_name, last_name, grupo):
            usuario, created = Usuario.objects.update_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'rut': faker.rut(),
                    'is_staff': grupo.name in ['admin', 'Supervisor'] # Opcional: dar acceso al admin
                }
            )
            if created:
                usuario.set_password(default_password)
                usuario.save()
            
            usuario.groups.clear()
            usuario.groups.add(grupo)
            return usuario

        supervisor = crear_o_actualizar_usuario('supervisor', 'supervisor@taller.cl', 'Juan', 'Pérez', grupos['Supervisor'])
        mecanico = crear_o_actualizar_usuario('mecanico', 'mecanico@taller.cl', 'Carlos', 'Soto', grupos['Mecánico'])
        seguridad = crear_o_actualizar_usuario('seguridad', 'seguridad@taller.cl', 'Ana', 'López', grupos['Seguridad'])
        administrativo = crear_o_actualizar_usuario('administrativo', 'administrativo@taller.cl', 'Maria', 'Gonzalez', grupos['Administrativo'])
        
        chofer1 = crear_o_actualizar_usuario('chofer1', 'chofer1@taller.cl', 'Luis', 'Rojas', grupos['Chofer'])
        chofer2 = crear_o_actualizar_usuario('chofer2', 'chofer2@taller.cl', 'Pedro', 'Araya', grupos['Chofer'])
        choferes = [chofer1, chofer2]
        self.stdout.write("Usuarios con roles específicos creados o actualizados.")

        # --- Crear Vehículos ---
        def generar_patente():
            letras = 'BCDFGHJKLPRSTVWXYZ'
            return f"{''.join(random.choices(letras, k=4))}-{''.join(random.choices('0123456789', k=2))}"

        vehiculos = []
        marcas_modelos = {'Chevrolet': 'Silverado', 'Ford': 'F-150', 'Toyota': 'Hilux', 'Nissan': 'NP300'}
        for i in range(4):
            marca = random.choice(list(marcas_modelos.keys()))
            vehiculo, created = Vehiculo.objects.get_or_create(
                patente=generar_patente(),
                defaults={
                    'marca': marca,
                    'modelo': marcas_modelos[marca],
                    'anio': random.randint(2018, 2024),
                    'kilometraje': random.randint(10000, 150000),
                    'chofer': choferes[i // 2]
                }
            )
            vehiculos.append(vehiculo)
        self.stdout.write("4 vehículos creados y asignados a los 2 choferes.")
        
        # --- Crear Productos y Servicios ---
        Producto.objects.get_or_create(sku='ACE-10W40', defaults={'nombre': 'Aceite Motor 10W40', 'precio_venta': 12500, 'stock': 50})
        Producto.objects.get_or_create(sku='FIL-AIRE-01', defaults={'nombre': 'Filtro de Aire Motor', 'precio_venta': 8990, 'stock': 30})
        Servicio.objects.get_or_create(nombre='Cambio de Aceite', defaults={'precio_base': 25000})
        Servicio.objects.get_or_create(nombre='Alineación y Balanceo', defaults={'precio_base': 35000})
        self.stdout.write("Productos y Servicios de ejemplo creados.")

        # --- Crear Agendamientos y Órdenes ---
        for vehiculo in vehiculos:
            if not Agendamiento.objects.filter(vehiculo=vehiculo).exists():
                agendamiento = Agendamiento.objects.create(
                    vehiculo=vehiculo,
                    chofer_asociado=vehiculo.chofer,
                    mecanico_asignado=mecanico,
                    fecha_hora_programada=timezone.now() + timedelta(days=random.randint(1, 30)),
                    motivo_ingreso=random.choice(['Mantención por kilometraje', 'Revisión de frenos', 'Falla de motor']),
                    creado_por=supervisor
                )
                
                Orden.objects.create(
                    vehiculo=vehiculo,
                    agendamiento_origen=agendamiento,
                    estado=random.choice(['Ingresado', 'En Diagnostico']),
                    descripcion_falla=agendamiento.motivo_ingreso,
                    usuario_asignado=mecanico
                )
        self.stdout.write("Agendamientos y Órdenes de Servicio creadas.")

        self.stdout.write(self.style.SUCCESS("¡Proceso de carga de datos finalizado con éxito!"))