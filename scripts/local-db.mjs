import EmbeddedPostgres from "embedded-postgres";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const databaseDir = path.join(root, "data", "db");
const lockFile = path.join(root, "data", "postgres.pid");

const PORT = 5432;
const USER = "postgres";
const PASSWORD = "postgres";
const DB_NAME = "rideshare";

async function main() {
  fs.mkdirSync(path.join(root, "data"), { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
  });

  const alreadyInitialized = fs.existsSync(path.join(databaseDir, "PG_VERSION"));
  if (!alreadyInitialized) {
    console.log("Инициализация локальной PostgreSQL...");
    await pg.initialise();
  }

  console.log(`Запуск PostgreSQL на порту ${PORT}...`);
  await pg.start();

  try {
    await pg.createDatabase(DB_NAME);
    console.log(`База "${DB_NAME}" создана.`);
  } catch {
    console.log(`База "${DB_NAME}" уже существует.`);
  }

  fs.writeFileSync(lockFile, String(process.pid));

  console.log("");
  console.log("✓ Локальная PostgreSQL запущена на этом ПК");
  console.log(`  DATABASE_URL=postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}?schema=public`);
  console.log("");
  console.log("Оставь этот терминал открытым. В другом терминале:");
  console.log("  npm run db:push");
  console.log("  npm run dev");
  console.log("");
  console.log("Ctrl+C — остановить базу.");

  // Периодическая очистка просроченных поездок/пожеланий (если Next запущен)
  const cleanupTimer = setInterval(() => {
    fetch("http://127.0.0.1:3000/api/cron/cleanup").catch(() => {});
  }, 5 * 60 * 1000);

  const shutdown = async () => {
    clearInterval(cleanupTimer);
    console.log("\nОстановка PostgreSQL...");
    try {
      await pg.stop();
    } catch {
      // ignore
    }
    try {
      fs.unlinkSync(lockFile);
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep process alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("Ошибка запуска локальной БД:", err);
  process.exit(1);
});
