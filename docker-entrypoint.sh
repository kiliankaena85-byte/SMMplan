#!/bin/sh
set -e

# Миграции БД перед стартом (без --accept-data-loss!)
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
fi

exec "$@"
