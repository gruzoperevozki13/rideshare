# Деплой RideShare на VPS (Россия)

Оплата российской картой. Пример: Timeweb, Selectel, FirstVDS, Beget, REG.RU.

Минимум: **1–2 GB RAM**, Ubuntu **22.04** или **24.04**, ~300–600 ₽/мес.

---

## Шаг 1. Купить VPS

1. Зарегистрируйтесь у хостера, оплатите VPS.
2. Выберите образ: **Ubuntu 22.04/24.04**.
3. Сохраните:
   - IP (например `185.xxx.xxx.xxx`)
   - логин (часто `root`)
   - пароль или SSH-ключ

Проверка с вашего ПК (PowerShell / cmd):

```cmd
ssh root@ВАШ_IP
```

Если зашли в Linux — сервер ваш. Дальше все команды **на сервере**, если не сказано иначе.

---

## Шаг 2. Базовая настройка сервера

Скопируйте и выполните на VPS (одним блоком):

```bash
apt update && apt upgrade -y
apt install -y curl git nginx ufw

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PostgreSQL
apt install -y postgresql postgresql-contrib

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

node -v
psql --version
```

---

## Шаг 3. База данных

```bash
sudo -u postgres psql <<'SQL'
CREATE USER rideshare WITH PASSWORD 'ПРИДУМАЙТЕ_СИЛЬНЫЙ_ПАРОЛЬ';
CREATE DATABASE rideshare OWNER rideshare;
GRANT ALL PRIVILEGES ON DATABASE rideshare TO rideshare;
SQL
```

Строка подключения (запомните):

```
postgresql://rideshare:ПРИДУМАЙТЕ_СИЛЬНЫЙ_ПАРОЛЬ@localhost:5432/rideshare?schema=public
```

---

## Шаг 4. Код с GitHub

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/gruzoperevozki13/rideshare.git
cd rideshare
npm ci
```

Если репозиторий **private** — на сервере нужен [Personal Access Token](https://github.com/settings/tokens) вместо пароля, либо SSH-ключ GitHub.

---

## Шаг 5. Файл `.env` на сервере

```bash
nano /var/www/rideshare/.env
```

Вставьте (подставьте свои значения):

```env
DATABASE_URL="postgresql://rideshare:ПАРОЛЬ@localhost:5432/rideshare?schema=public"
NEXTAUTH_URL="http://ВАШ_IP"
NEXTAUTH_SECRET="длинная-случайная-строка"
CRON_SECRET="другая-случайная-строка"
EMAIL_SERVER_HOST="smtp.mail.ru"
EMAIL_SERVER_PORT="465"
EMAIL_SERVER_USER="rideshare@mail.ru"
EMAIL_SERVER_PASSWORD="пароль-приложения-mailru"
EMAIL_FROM="rideshare@mail.ru"
```

Сохранить: `Ctrl+O`, Enter, `Ctrl+X`.

Секрет можно сгенерировать:

```bash
openssl rand -base64 32
```

---

## Шаг 6. Сборка и таблицы

```bash
cd /var/www/rideshare
npx prisma db push
npm run build
```

---

## Шаг 7. Автозапуск (systemd)

```bash
nano /etc/systemd/system/rideshare.service
```

Содержимое:

```ini
[Unit]
Description=RideShare Next.js
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/rideshare
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Запуск:

```bash
systemctl daemon-reload
systemctl enable rideshare
systemctl start rideshare
systemctl status rideshare
```

Сайт пока: `http://ВАШ_IP:3000` (если порт открыт). Лучше через Nginx ниже.

---

## Шаг 8. Nginx (сайт на 80 порту)

```bash
nano /etc/nginx/sites-available/rideshare
```

```nginx
server {
    listen 80;
    server_name ВАШ_IP;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/rideshare /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Откройте в браузере: `http://ВАШ_IP`

В `.env` должно быть `NEXTAUTH_URL="http://ВАШ_IP"`, затем:

```bash
systemctl restart rideshare
```

---

## Шаг 9. Домен и HTTPS (когда купите домен)

1. У регистратора домена: A-запись → IP сервера.
2. В Nginx `server_name` замените на `ваш-домен.ru`.
3. HTTPS:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d ваш-домен.ru
```

4. В `.env`: `NEXTAUTH_URL="https://ваш-домен.ru"` → `systemctl restart rideshare`.

---

## Обновление сайта после правок в коде

На своём ПК:

```cmd
cd C:\Users\HP\бла
git add -A
git commit -m "описание изменений"
git push
```

На сервере:

```bash
cd /var/www/rideshare
git pull
npm ci
npx prisma db push
npm run build
systemctl restart rideshare
```

---

## Частые проблемы

| Проблема | Что сделать |
|----------|-------------|
| `502 Bad Gateway` | `systemctl status rideshare` — приложение не запустилось |
| Нет писем | пароль приложения Mail.ru, порт 465 |
| Не логинит | проверьте `NEXTAUTH_URL` и `NEXTAUTH_SECRET` |
| Нет фото после рестарта | файлы в `/var/www/rideshare/public/uploads` — на VPS они остаются |

---

## Чеклист

- [ ] VPS куплен, `ssh root@IP` работает
- [ ] Node + Postgres + Nginx установлены
- [ ] Репозиторий склонирован, `.env` заполнен
- [ ] `npm run build` без ошибок
- [ ] `systemctl status rideshare` — active
- [ ] Сайт открывается по `http://IP`
