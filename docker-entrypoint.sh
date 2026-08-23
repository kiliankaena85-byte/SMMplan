#!/bin/sh
set -e

# Миграции БД перед стартом (без --accept-data-loss!)
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running Prisma migrations..."
  ./node_modules/.bin/prisma migrate deploy || npx prisma migrate deploy
fi

exec "$@"
