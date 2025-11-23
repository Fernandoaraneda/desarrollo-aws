import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction, IntegrityError
from faker import Faker
from accounts.models import (
    Usuario,
    Vehiculo,
    Agendamiento,
    Orden,
    Producto,
    Servicio,
    OrdenItem,
    LlaveVehiculo,
    PrestamoLlave,
    Taller,
    AgendamientoHistorial,
    AgendamientoDocumento,
    LlaveHistorialEstado,
    OrdenHistorialEstado,
    OrdenDocumento,
    OrdenPausa,
    Notificacion,
    ChatRoom,
    ChatMessage,
)
from django.contrib.auth.models import Group


class Command(BaseCommand):
    help = "Popula la base de datos con datos BASE (Usuarios, Vehículos, Llaves, Catálogo). ¡ESTE SCRIPT SIEMPRE BORRA LOS DATOS ANTERIORES!"

    @transaction.atomic
    def handle(self, *args, **options):

        self.stdout.write(
            self.style.WARNING(
                "ATENCIÓN: Eliminando TODOS los datos de movimiento existentes..."
            )
        )

        OrdenItem.objects.all().delete()
        OrdenHistorialEstado.objects.all().delete()
        OrdenDocumento.objects.all().delete()
        OrdenPausa.objects.all().delete()

        AgendamientoHistorial.objects.all().delete()
        AgendamientoDocumento.objects.all().delete()

        PrestamoLlave.objects.all().delete()
        LlaveHistorialEstado.objects.all().delete()

        Orden.objects.all().delete()
        Agendamiento.objects.all().delete()

        LlaveVehiculo.objects.all().delete()

        Vehiculo.objects.all().delete()

        Taller.objects.all().delete()

        Producto.objects.all().delete()
        Servicio.objects.all().delete()

        Notificacion.objects.all().delete()

        ChatMessage.objects.all().delete()
        ChatRoom.objects.all().delete()

        Usuario.objects.filter(is_superuser=False).delete()

        self.stdout.write(self.style.SUCCESS("Datos eliminados. Creando datos base..."))

        self.stdout.write("Iniciando la carga de datos BASE...")
        faker = Faker("es_CL")

        grupos_nombres = [
            "admin",
            "Chofer",
            "Mecanico",
            "Jefetaller",
            "Seguridad",
            "Supervisor",
            "Control Llaves",
            "Repuestos",
            "Grua",
        ]
        grupos = {}
        try:
            for name in grupos_nombres:
                grupos[name] = Group.objects.get(name=name)
            self.stdout.write(f"Grupos encontrados: {list(grupos.keys())}")
        except Group.DoesNotExist as e:

            missing_group_name = str(e).split("'")[1]
            self.stdout.write(
                self.style.ERROR(
                    f"Error: El grupo '{missing_group_name}' no fue encontrado."
                )
            )
            self.stdout.write(
                self.style.ERROR(
                    "Asegúrate de haber creado los grupos (puedes usar 'python manage.py loaddata grupos.json')."
                )
            )
            return

        default_password = "password123"

        def crear_o_actualizar_usuario(username, email, first_name, last_name, grupo):
            usuario, created = Usuario.objects.update_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "rut": faker.rut(),
                    "is_staff": grupo.name in ["admin", "Jefetaller", "Control Llaves"],
                },
            )
            if created:
                usuario.set_password(default_password)
                usuario.save()

            usuario.groups.clear()
            usuario.groups.add(grupo)
            return usuario

        if not Usuario.objects.filter(username="admin").exists():
            admin_user = Usuario.objects.create_superuser(
                "admin", "admin@taller.cl", default_password
            )
            admin_user.first_name = "Admin"
            admin_user.last_name = "Principal"
            admin_user.rut = faker.rut()
            admin_user.save()
            admin_user.groups.add(grupos["admin"])
            self.stdout.write(
                f"Superusuario 'admin' creado (pass: '{default_password}')."
            )
        else:
            self.stdout.write("Superusuario 'admin' ya existía, omitiendo creación.")

        Jefetaller = crear_o_actualizar_usuario(
            "jefetaller", "Jefetaller@taller.cl", "Juan", "Pérez", grupos["Jefetaller"]
        )
        mecanico1 = crear_o_actualizar_usuario(
            "mecanico1", "mecanico1@taller.cl", "Carlos", "Soto", grupos["Mecanico"]
        )
        mecanico2 = crear_o_actualizar_usuario(
            "mecanico2", "mecanico2@taller.cl", "Miguel", "Torres", grupos["Mecanico"]
        )
        seguridad = crear_o_actualizar_usuario(
            "seguridad", "seguridad@taller.cl", "Ana", "López", grupos["Seguridad"]
        )
        Supervisor = crear_o_actualizar_usuario(
            "supervisor",
            "Supervisor@taller.cl",
            "Maria",
            "Gonzalez",
            grupos["Supervisor"],
        )
        control_llaves = crear_o_actualizar_usuario(
            "llaves", "llaves@taller.cl", "Encargado", "Pañol", grupos["Control Llaves"]
        )
        repuestos_user = crear_o_actualizar_usuario(
            "repuestos", "repuestos@taller.cl", "Diego", "Muñoz", grupos["Repuestos"]
        )
        crear_o_actualizar_usuario(
            "grua1", "grua@taller.cl", "Pedro", "Grúas", grupos["Grua"]
        )

        chofer1 = crear_o_actualizar_usuario(
            "chofer1", "chofer1@taller.cl", "Luis", "Rojas", grupos["Chofer"]
        )
        chofer2 = crear_o_actualizar_usuario(
            "chofer2", "chofer2@taller.cl", "Pedro", "Araya", grupos["Chofer"]
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Usuarios base verificados o creados (pass: '{default_password}')."
            )
        )

        self.stdout.write("Creando Taller base...")
        taller_maipu, _ = Taller.objects.get_or_create(
            nombre="Pepsico Evercrisp Maipú",
            defaults={
                "direccion": "Sta. Marta 1701, 9260081 Maipú, Región Metropolitana"
            },
        )

        self.stdout.write("Verificando vehículos base y llaves...")

        vehiculos_base = [
            {
                "patente": "BCDF10",
                "marca": "Chevrolet",
                "modelo": "Silverado",
                "chofer": chofer1,
            },
            {
                "patente": "GHJK20",
                "marca": "Ford",
                "modelo": "F-150",
                "chofer": chofer2,
            },
            {
                "patente": "XY1234",
                "marca": "Toyota",
                "modelo": "Hilux",
                "chofer": chofer1,
            },
            {
                "patente": "ZW5678",
                "marca": "Nissan",
                "modelo": "NP300",
                "chofer": chofer2,
            },
        ]

        vehiculos_creados_count = 0

        for v in vehiculos_base:

            vehiculo, created = Vehiculo.objects.get_or_create(
                patente=v["patente"],
                defaults={
                    "marca": v["marca"],
                    "modelo": v["modelo"],
                    "chofer": v["chofer"],
                    "taller": taller_maipu,
                    "anio": random.randint(2018, 2024),
                    "kilometraje": random.randint(10000, 150000),
                },
            )

            if created:
                vehiculos_creados_count += 1
                try:
                    LlaveVehiculo.objects.get_or_create(
                        vehiculo=vehiculo,
                        tipo=LlaveVehiculo.Tipo.ORIGINAL,
                        defaults={"codigo_interno": f"{vehiculo.patente}-ORI"},
                    )
                    LlaveVehiculo.objects.get_or_create(
                        vehiculo=vehiculo,
                        tipo=LlaveVehiculo.Tipo.DUPLICADO,
                        defaults={"codigo_interno": f"{vehiculo.patente}-DUP"},
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(
                            f"No se pudieron crear llaves para {vehiculo.patente}: {e}"
                        )
                    )

        self.stdout.write(
            self.style.SUCCESS(f"{vehiculos_creados_count} vehículos nuevos creados.")
        )

        Producto.objects.get_or_create(
            sku="ACE-10W40",
            defaults={
                "nombre": "Aceite Motor 10W40",
                "precio_venta": 12500,
                "stock": 50,
            },
        )
        Producto.objects.get_or_create(
            sku="FIL-AIRE-01",
            defaults={
                "nombre": "Filtro de Aire Motor",
                "precio_venta": 8990,
                "stock": 30,
            },
        )
        Producto.objects.get_or_create(
            sku="FRE-LIQ-01",
            defaults={"nombre": "Líquido de Frenos", "precio_venta": 6500, "stock": 40},
        )

        Servicio.objects.get_or_create(
            nombre="Cambio de Aceite", defaults={"precio_base": 25000}
        )
        Servicio.objects.get_or_create(
            nombre="Alineación y Balanceo", defaults={"precio_base": 35000}
        )
        self.stdout.write("Productos y Servicios de catálogo verificados o creados.")

        self.stdout.write(
            self.style.SUCCESS("\n¡Carga de datos BASE finalizada con éxito!")
        )
        self.stdout.write(
            "El sistema está limpio y listo para probar el flujo completo desde la App."
        )
