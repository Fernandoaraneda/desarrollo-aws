# accounts/management/commands/seed_data.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from django.utils import timezone
from faker import Faker
import random
import string

from accounts.models import (
    Usuario,
    Vehiculo,
    Agendamiento,
    Orden,
    OrdenItem,
    Producto,
    Servicio,
)

fake = Faker("es_CL")  # Datos en español (Chile)

# Función para generar patentes chilenas
def generar_patente_chilena():
    if random.choice([True, False]):
        # Formato moderno 4 letras + 2 números
        letras = ''.join(random.choices(string.ascii_uppercase, k=4))
        numeros = ''.join(random.choices(string.digits, k=2))
        return letras + numeros
    else:
        # Formato antiguo 2 letras + 4 números
        letras = ''.join(random.choices(string.ascii_uppercase, k=2))
        numeros = ''.join(random.choices(string.digits, k=4))
        return letras + numeros


class Command(BaseCommand):
    help = "Genera datos falsos para pruebas"

    def handle(self, *args, **kwargs):
        # Crear grupos (roles)
        roles = ["Chofer", "Supervisor", "Mecanico", "Administrativo"]
        for rol in roles:
            Group.objects.get_or_create(name=rol)
        self.stdout.write(self.style.SUCCESS("✅ Grupos creados."))

        # Crear usuarios
        for i in range(10):
            username = f"user{i}"
            if not Usuario.objects.filter(username=username).exists():
                user = Usuario.objects.create_user(
                    username=username,
                    first_name=fake.first_name(),
                    last_name=fake.last_name(),
                    email=fake.email(),
                    rut=f"{fake.random_int(10000000, 25000000)}-{fake.random_int(0,9)}",
                    telefono=fake.phone_number(),
                    password="123456",
                )
                rol = random.choice(roles)
                group = Group.objects.get(name=rol)
                user.groups.add(group)
        self.stdout.write(self.style.SUCCESS("✅ Usuarios creados."))

        # Crear vehículos
        for i in range(15):
            patente = generar_patente_chilena()
            Vehiculo.objects.get_or_create(
                patente=patente,
                marca=fake.company(),
                modelo=fake.word(),
                anio=fake.year(),
                color=fake.color_name(),
                vin=fake.uuid4(),
                kilometraje=fake.random_int(1000, 200000),
            )
        self.stdout.write(self.style.SUCCESS("✅ Vehículos creados."))

        # Crear productos
        for i in range(20):
            Producto.objects.get_or_create(
                sku=f"P-{i}",
                nombre=fake.word().capitalize(),
                descripcion=fake.sentence(),
                marca=fake.company(),
                precio_venta=round(random.uniform(1000, 50000), 2),
                stock=random.randint(1, 100),
            )
        self.stdout.write(self.style.SUCCESS("✅ Productos creados."))

        # Crear servicios
        for i in range(5):
            Servicio.objects.get_or_create(
                nombre=f"Servicio {i+1}",
                descripcion=fake.sentence(),
                precio_base=round(random.uniform(10000, 50000), 2),
            )
        self.stdout.write(self.style.SUCCESS("✅ Servicios creados."))

        # Crear órdenes con agendamiento
        usuarios_chofer = Usuario.objects.filter(groups__name="Chofer")
        vehiculos = Vehiculo.objects.all()
        for i in range(10):
            chofer = random.choice(usuarios_chofer)
            vehiculo = random.choice(vehiculos)

            # Fecha aware para evitar warnings
            fecha_naive = fake.future_datetime(end_date="+30d")
            fecha_aware = timezone.make_aware(fecha_naive)

            ag = Agendamiento.objects.create(
                vehiculo=vehiculo,
                chofer_asociado=chofer,
                fecha_hora_programada=fecha_aware,
                motivo_ingreso=fake.text(50),
                creado_por=chofer,
            )

            orden = Orden.objects.create(
                vehiculo=vehiculo,
                agendamiento_origen=ag,
                descripcion_falla=fake.sentence(),
                estado=random.choice([e[0] for e in Orden.ESTADOS_ORDEN]),
            )

            # Añadir items a la orden
            for _ in range(random.randint(1, 3)):
                if random.choice([True, False]):
                    producto = random.choice(list(Producto.objects.all()))
                    OrdenItem.objects.create(
                        orden=orden,
                        producto=producto,
                        cantidad=random.randint(1, 3),
                        precio_unitario=producto.precio_venta,
                    )
                else:
                    servicio = random.choice(list(Servicio.objects.all()))
                    OrdenItem.objects.create(
                        orden=orden,
                        servicio=servicio,
                        cantidad=1,
                        precio_unitario=servicio.precio_base,
                    )

        self.stdout.write(self.style.SUCCESS("✅ Órdenes creadas con items."))
