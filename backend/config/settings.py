from datetime import timedelta
from pathlib import Path
import importlib.util
import os
import re
from urllib.parse import parse_qs, unquote, urlparse


BASE_DIR = Path(__file__).resolve().parent.parent


def _load_env_file():
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return

    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        # Project-local .env should drive local runtime values.
        os.environ[key] = value


_load_env_file()

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-secret-key")
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = [host.strip() for host in os.getenv("ALLOWED_HOSTS", "*").split(",") if host.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "apps.accounts.apps.AccountsConfig",
    "apps.vendors.apps.VendorsConfig",
    "apps.products.apps.ProductsConfig",
    "apps.orders.apps.OrdersConfig",
    "apps.analytics.apps.AnalyticsConfig",
]

USE_SUPABASE_STORAGE = os.getenv("USE_SUPABASE_STORAGE", "False").lower() == "true"
if USE_SUPABASE_STORAGE:
    INSTALLED_APPS.append("storages")

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

if importlib.util.find_spec("whitenoise") is not None:
    MIDDLEWARE.insert(2, "whitenoise.middleware.WhiteNoiseMiddleware")

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

def _postgres_db_config():
    db_url = os.getenv("DATABASE_URL", "").strip()
    if db_url:
        parsed = urlparse(db_url)
        query = parse_qs(parsed.query)
        sslmode = query.get("sslmode", [os.getenv("DB_SSLMODE", "")])[0]
        options = {"sslmode": sslmode} if sslmode else {}
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/") or os.getenv("DB_NAME", "ecommerce_db"),
            "USER": unquote(parsed.username or os.getenv("DB_USER", "postgres")),
            "PASSWORD": unquote(parsed.password or os.getenv("DB_PASSWORD", "postgres")),
            "HOST": parsed.hostname or os.getenv("DB_HOST", "localhost"),
            "PORT": str(parsed.port or os.getenv("DB_PORT", "5432")),
            "OPTIONS": options,
        }

    sslmode = os.getenv("DB_SSLMODE", "").strip()
    options = {"sslmode": sslmode} if sslmode else {}
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "ecommerce_db"),
        "USER": os.getenv("DB_USER", "postgres"),
        "PASSWORD": os.getenv("DB_PASSWORD", "postgres"),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
        "OPTIONS": options,
    }


DATABASES = {"default": _postgres_db_config()}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
if importlib.util.find_spec("whitenoise") is not None:
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

if USE_SUPABASE_STORAGE:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
        },
        "staticfiles": {
            "BACKEND": (
                "whitenoise.storage.CompressedManifestStaticFilesStorage"
                if importlib.util.find_spec("whitenoise") is not None
                else "django.contrib.staticfiles.storage.StaticFilesStorage"
            ),
        },
    }

    AWS_ACCESS_KEY_ID = os.getenv("SUPABASE_S3_ACCESS_KEY", "")
    AWS_SECRET_ACCESS_KEY = os.getenv("SUPABASE_S3_SECRET_KEY", "")
    AWS_STORAGE_BUCKET_NAME = os.getenv("SUPABASE_STORAGE_BUCKET", "product-images")
    AWS_S3_REGION_NAME = os.getenv("SUPABASE_S3_REGION", "us-east-1")
    AWS_S3_ENDPOINT_URL = os.getenv("SUPABASE_S3_ENDPOINT", "")
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    AWS_S3_ADDRESSING_STYLE = "path"
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False

    # Supabase public object URLs should be used in frontend-facing image links.
    supabase_public_base = os.getenv("SUPABASE_PUBLIC_BASE_URL", "").rstrip("/")
    if not supabase_public_base and AWS_S3_ENDPOINT_URL:
        parsed = urlparse(AWS_S3_ENDPOINT_URL)
        host = parsed.netloc
        match = re.match(r"^(?P<ref>[^.]+)\.storage\.supabase\.co$", host)
        if match:
            supabase_public_base = f"https://{match.group('ref')}.supabase.co"

    if supabase_public_base:
        AWS_S3_CUSTOM_DOMAIN = f"{supabase_public_base}/storage/v1/object/public/{AWS_STORAGE_BUCKET_NAME}"
        AWS_S3_URL_PROTOCOL = "https:"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.CustomUser"

CORS_ALLOWED_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
