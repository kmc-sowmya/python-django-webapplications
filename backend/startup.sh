#!/usr/bin/env bash
set -euo pipefail

python manage.py migrate --noinput
exec gunicorn --bind="0.0.0.0:${PORT:-8000}" --workers=2 --timeout=600 config.wsgi:application