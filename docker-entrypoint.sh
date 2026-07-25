#!/bin/sh
set -e

echo "Starting deployment checks..."

# Fail-fast: критические переменные окружения
: "${JWT_SECRET:?FATAL: JWT_SECRET is not set}"
: "${APP_ENCRYPTION_KEY:?FATAL: APP_ENCRYPTION_KEY is not set}"
: "${DATABASE_URL:?FATAL: DATABASE_URL is not set}"
: "${REDIS_URL:?FATAL: REDIS_URL is not set}"

# Валидация длины JWT_SECRET (минимум 32 символа)
if [ ${#JWT_SECRET} -lt 32 ]; then
  echo "FATAL: JWT_SECRET must be at least 32 characters"
  exit 1
fi

# Валидация APP_ENCRYPTION_KEY (64 hex символа = 32 байта)
if [ ${#APP_ENCRYPTION_KEY} -ne 64 ]; then
  echo "FATAL: APP_ENCRYPTION_KEY must be exactly 64 hex characters"
  exit 1
fi

echo "Environment validation passed."

# Run database migrations
# This will safely apply any pending migrations to the PostgreSQL database
echo "Executing Prisma migrations..."
npx prisma migrate deploy

echo "Starting Next.js application..."
exec "$@"

