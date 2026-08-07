#!/bin/bash
# Синхронизация досок VK/Telegram. Ставится в crontab каждые 5 минут.
set -euo pipefail
cd /var/www/rideshare
# shellcheck disable=SC1091
set -a
# читаем только нужные переменные из .env
CRON_SECRET="$(grep -E '^CRON_SECRET=' .env | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
set +a
if [ -z "${CRON_SECRET:-}" ]; then
  echo "CRON_SECRET не задан в .env" >&2
  exit 1
fi
curl -fsS "http://127.0.0.1:3000/api/cron/vk-sync?secret=${CRON_SECRET}" >/dev/null
