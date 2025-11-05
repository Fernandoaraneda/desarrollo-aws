import os
from pathlib import Path
from decouple import config
from datetime import timedelta
import dj_database_url
from dotenv import load_dotenv
# -----------------------------
# BASE DIR
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# -----------------------------
# SECRET KEY y DEBUG
# -----------------------------
SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)

# -----------------------------
# ALLOWED HOSTS
# -----------------------------
ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="127.0.0.1,localhost"
).split(",")

# Render define esta variable automáticamente en producción
RENDER_EXTERNAL_HOSTNAME = config('RENDER_EXTERNAL_HOSTNAME', default=None)
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

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
    'whitenoise.middleware.WhiteNoiseMiddleware',
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
DATABASES = {  # <--- ¡
    'default': dj_database_url.config(
        # config('DATABASE_URL') leerá la variable de tu archivo .env
        # o, si no existe, buscará en las variables de entorno del sistema (como en Render)
        default=config('DATABASE_URL'),
        conn_max_age=600,
        # Importante: Le decimos que use el motor de PostgreSQL
        # si la URL no lo especifica (aunque la de Render sí lo hará)
        engine='django.db.backends.postgresql' 
    )
}

# Opcional: Si quieres forzar SSL en producción (Render lo maneja bien,
# pero es una buena práctica si tu DB estuviera en otro proveedor)
if not DEBUG:
    DATABASES['default']['OPTIONS'] = {'sslmode': 'require'}

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
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
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