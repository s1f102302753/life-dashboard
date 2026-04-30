#!/usr/bin/env bash
set -eu

cd "$(dirname "$0")"

venv/bin/python manage.py migrate --noinput
venv/bin/python manage.py collectstatic --noinput
exec venv/bin/gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}
