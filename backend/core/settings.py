import os
from pathlib import Path
from decouple import config
from datetime import timedelta
import dj_database_url

# -----------------------------
# BASE DIR
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# -----------------------------
# SECRET KEY y DEBUG
# -----------------------------
SECRET_KEY = config("SECRET_KEY", default="dev-secret")
DEBUG = config("DEBUG", default=True, cast=bool)

# -----------------------------
# ALLOWED HOSTS
# -----------------------------
ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="127.0.0.1,localhost"
).split(",")

# -----------------------------
# INSTALLED APPS
# -----------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Terceros
    'rest_framework',
    'corsheaders',

    # Apps propias
    'accounts',
]

# -----------------------------
# MIDDLEWARE
# -----------------------------
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# -----------------------------
# ROOT URLS / WSGI
# -----------------------------
ROOT_URLCONF = 'core.urls'
WSGI_APPLICATION = 'core.wsgi.application'

# -----------------------------
# TEMPLATES
# -----------------------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "templates"],  # opcional: carpeta de templates
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# -----------------------------
# DATABASES
# -----------------------------
# Usa DATABASE_URL en ambos entornos
# .env.local -> mysql://root:pass@127.0.0.1:3306/mi_db_local
# .env.production -> mysql://root:pass@host:puerto/railway
if DEBUG:
    # MODO DESARROLLO (tu PC)
    # Sigue usando tu variable DATABASE_URL de tu archivo .env local
    # Ejemplo .env: DATABASE_URL=mysql://root:tu_pass_local@127.0.0.1:3306/capstone_db_local
    DATABASES = {
        "default": dj_database_url.config(
            default=config("DATABASE_URL"),
            conn_max_age=600,
        )
    }
else:
    # MODO PRODUCCIÓN (Render)
    # Usa las variables de entorno separadas que configuraremos 
    # en el panel de Render.
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'HOST': config('DB_HOST'),
            'PORT': config('DB_PORT', cast=int), # Asegúrate de castear a entero
            'USER': config('DB_USER'),
            'PASSWORD': config('DB_PASSWORD'),
            'NAME': config('DB_NAME'),
            'OPTIONS': {
                # Esta es la parte clave para forzar el SSL que SkySQL requiere
                'ssl': {
                    # Render tiene los certificados CA en esta ruta estándar
                    'ca': '/etc/ssl/certs/ca-certificates.crt',
                }
            }
        }
    }

# -----------------------------
# PASSWORD VALIDATION
# -----------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# -----------------------------
# INTERNACIONALIZACIÓN
# -----------------------------
LANGUAGE_CODE = 'es-es'
TIME_ZONE = 'America/Santiago'
USE_I18N = True
USE_TZ = True

# -----------------------------
# ARCHIVOS ESTÁTICOS
# -----------------------------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / "staticfiles"

# -----------------------------
# AUTO FIELD
# -----------------------------
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# -----------------------------
# REST FRAMEWORK
# -----------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

# -----------------------------
# USUARIO CUSTOM
# -----------------------------
AUTH_USER_MODEL = "accounts.Usuario"

# -----------------------------
# EMAIL
# -----------------------------
EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend"
)

# -----------------------------
# CORS   CORS_ALLOW_ALL_ORIGINS = config("CORS_ALLOW_ALL_ORIGINS", default=True, cast=bool)


    #CORS_ALLOWED_ORIGINS = [
#    "http://localhost:5173",
#   "http://127.0.0.1:5173",
#    ]
# -----------------------------
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173,http://127.0.0.1:5173"
).split(",")

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'content-type',
    'authorization',
    'accept',
    'origin',
    'x-requested-with',
]

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS 
# -----------------------------
# JWT CONFIG
# -----------------------------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=365),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}


MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# ----------------------------------------------------------------------
# CONFIGURACIÓN DE CORREO ELECTRÓNICO (SendGrid / Consola)
# ----------------------------------------------------------------------

# DEBUG ya está definido arriba en tu archivo

if DEBUG:
    # MODO DESARROLLO (DEBUG=True, en tu PC)
    # Los correos se imprimirán en la consola donde corre "runserver"
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    DEFAULT_FROM_EMAIL = 'desarrollo-local@tallerpepsico.com'
    
else:
    # MODO PRODUCCIÓN (DEBUG=False, en Render)
    # Usaremos el backend de SendGrid. Asegúrate de tener
    # 'django-sendgrid-v5' en tu requirements.txt
    EMAIL_BACKEND = 'sendgrid_backend.SendgridBackend'
    
    # Estas variables DEBEN estar en tu entorno de Render
    SENDGRID_API_KEY = config('SENDGRID_API_KEY') 
    DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL') # (Render usará 'fer.araneda@duocuc.cl' aquí)
    
    # Opcional: para ver los envíos en los logs de Render
    SENDGRID_ECHO_TO_STDOUT = True