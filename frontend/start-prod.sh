#!/usr/bin/env bash
set -eu

cd "$(dirname "$0")"

exec npm run start -- --hostname 0.0.0.0 --port "${PORT:-3000}"
