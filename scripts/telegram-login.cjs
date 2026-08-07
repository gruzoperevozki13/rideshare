/**
 * Одноразовый вход второго аккаунта Telegram (GramJS).
 * На сервере: npm run tg:login
 */
const fs = require("fs");
const path = require("path");
const { createInterface } = require("readline");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(String(answer || "").trim());
    });
  });
}

async function main() {
  loadEnvFile();

  const apiId = Number(
    process.env.TELEGRAM_API_ID || (await ask("API ID (my.telegram.org): "))
  );
  const apiHash =
    process.env.TELEGRAM_API_HASH || (await ask("API Hash: "));

  if (!apiId || !apiHash) {
    console.error("Нужны TELEGRAM_API_ID и TELEGRAM_API_HASH");
    process.exit(1);
  }

  const client = new TelegramClient(
    new StringSession(process.env.TELEGRAM_SESSION || ""),
    apiId,
    apiHash,
    { connectionRetries: 5 }
  );

  await client.start({
    phoneNumber: async () =>
      process.env.TELEGRAM_PHONE || (await ask("Телефон (+7...): ")),
    password: async () => {
      const p =
        process.env.TELEGRAM_2FA_PASSWORD ||
        (await ask("Облачный пароль 2FA (если нет — Enter): "));
      return p || undefined;
    },
    phoneCode: async () => await ask("Код из Telegram/SMS: "),
    onError: (err) => console.error(err),
  });

  const session = client.session.save();
  console.log("\n=== ГОТОВО ===");
  console.log("Добавь / обнови в .env:\n");
  console.log(`TELEGRAM_API_ID="${apiId}"`);
  console.log(`TELEGRAM_API_HASH="${apiHash}"`);
  console.log(`TELEGRAM_SESSION="${session}"`);
  console.log(
    `\nЧаты (username без @ или id):\nTELEGRAM_RIDES_CHATS="chat1,chat2"\nTELEGRAM_CARGO_CHATS="chat3"`
  );
  console.log("\nПотом: systemctl restart rideshare");

  await client.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
