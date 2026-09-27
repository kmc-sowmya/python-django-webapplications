import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
APP_ENV = os.environ.get("APP_ENV", "DEV").upper()
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "development-only-change-before-deployment")
if APP_ENV not in {"DEV", "SI", "QA", "UAT", "PROD"}:
    raise ImproperlyConfigured("APP_ENV must be DEV, SI, QA, UAT, or PROD.")
ALLOWED_HOSTS = [host.strip() for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",") if host.strip()]
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.environ.get(
    "CSRF_TRUSTED_ORIGINS",
    "http://127.0.0.1:5173,http://localhost:5173",
).split(",") if origin.strip()]

if not DEBUG:
    if SECRET_KEY == "development-only-change-before-deployment":
        raise ImproperlyConfigured("Set DJANGO_SECRET_KEY when DJANGO_DEBUG is false.")
    if not ALLOWED_HOSTS:
        raise ImproperlyConfigured("Set DJANGO_ALLOWED_HOSTS for deployed environments.")
    if not CSRF_TRUSTED_ORIGINS:
        raise ImproperlyConfigured("Set CSRF_TRUSTED_ORIGINS for deployed environments.")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "store",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DEBUG and not DATABASE_URL:
    raise ImproperlyConfigured("Set DATABASE_URL to a PostgreSQL database when DJANGO_DEBUG is false.")
if DATABASE_URL:
    database = dj_database_url.parse(DATABASE_URL, conn_max_age=600, ssl_require=not DEBUG)
else:
    database = {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}
DATABASES = {"default": database}

AUTH_PASSWORD_VALIDATORS = []
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"