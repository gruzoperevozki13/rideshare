# Деплой RideShare на GitHub + Railway

Как вы уже делали раньше: код на GitHub → Railway подтягивает репозиторий → Postgres + веб-сервис.

## 1. Подготовка кода

В папке проекта:

```powershell
cd C:\Users\HP\бла
git init
git add .
git commit -m "Initial commit: RideShare ready for Railway"
```

Создайте репозиторий на GitHub (через сайт или `gh`):

```powershell
gh repo create rideshare --private --source=. --remote=origin --push
```

Или вручную: GitHub → New repository → затем:

```powershell
git remote add origin https://github.com/ВАШ_ЛОГИН/rideshare.git
git branch -M main
git push -u origin main
```

**Не коммитьте** `.env` — он уже в `.gitignore`.

## 2. Railway

1. Зайдите на [railway.app](https://railway.app) → **New Project**.
2. **Add PostgreSQL** (Database → PostgreSQL).
3. **Deploy from GitHub** → выберите репозиторий `rideshare`.
4. В сервисе приложения: **Variables** → добавьте:

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | из Postgres: **Connect** → `DATABASE_URL` (или Reference Variable `${{Postgres.DATABASE_URL}}`) |
| `NEXTAUTH_URL` | `https://ваш-проект.up.railway.app` (после выдачи домена — обновите) |
| `NEXTAUTH_SECRET` | длинная случайная строка (см. ниже) |
| `CRON_SECRET` | другая случайная строка |
| `EMAIL_SERVER_HOST` | `smtp.mail.ru` |
| `EMAIL_SERVER_PORT` | `465` |
| `EMAIL_SERVER_USER` | ваш mail.ru |
| `EMAIL_SERVER_PASSWORD` | пароль приложения Mail.ru |
| `EMAIL_FROM` | тот же email |

Секреты локально (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Или на [generate-secret.vercel.app](https://generate-secret.vercel.app/32).

5. **Settings → Networking → Generate Domain** — скопируйте URL в `NEXTAUTH_URL`.
6. Дождитесь деплоя. При старте выполняется `prisma db push` (таблицы создадутся сами).

## 3. Фото (аватары, груз, авто)

Файлы пишутся в `public/uploads`. На Railway без тома они пропадут при редеплое.

Опционально: **Settings → Volumes** → mount path `/app/public/uploads`.

Без тома сайт работает, но загрузки недолговечны.

## 4. Cron очистки объявлений

В Railway → Cron Job или внешний cron (например cron-job.org):

```http
GET https://ваш-домен/api/cron/cleanup
Authorization: Bearer ВАШ_CRON_SECRET
```

Раз в сутки достаточно.

## 5. Проверка

- [ ] Открывается главная по HTTPS
- [ ] Регистрация → код на Mail.ru
- [ ] Вход, выбор роли, создание поездки/запроса
- [ ] Карта и чат после брони

## Важно

- После смены домена обновите `NEXTAUTH_URL` и сделайте Redeploy.
- Локальная БД (`npm run db:local`) в проде не нужна — только Railway Postgres.
- Prisma Studio в интернет не выставляйте.
