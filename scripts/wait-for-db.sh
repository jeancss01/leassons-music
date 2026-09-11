#!/usr/bin/env bash
set -euo pipefail

echo "Waiting for Postgres..."
for _ in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U violao -d violao_diario >/dev/null 2>&1; then
    echo "Postgres is ready."
    exit 0
  fi
  sleep 1
done

echo "Postgres did not become ready in time." >&2
exit 1
