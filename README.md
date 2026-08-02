# RideShare — попутчики и грузоперевозки

Next.js 15 · Prisma · PostgreSQL · NextAuth (email + пароль)

## Локальный запуск

Два терминала в папке проекта:

```bash
npm install
npm run db:local          # терминал 1 — PostgreSQL
npm run db:push           # терминал 2 — схема
npm run dev               # http://localhost:3000
```

Опционально: `npm run db:studio` — просмотр БД на http://localhost:5555

## Возможности

- Регистрация / вход по email, подтверждение **кодом** из письма (Mail.ru SMTP)
- Роли: водитель, пассажир, перевозчик, грузоотправитель
- Поездки, пожелания, брони, чат, отзывы
- Грузы: рейсы, заявки, фото (необяз.), чат после заявки
- Футер: сотрудничество и сообщения об ошибках

## Переменные окружения

См. `.env.example`. Минимум: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, SMTP, `CRON_SECRET`.

## Деплой в интернет

Подробно: [DEPLOY.md](./DEPLOY.md)

Кратко: облачный Postgres → env на хостинге → `prisma db push` → `npm run build`.
