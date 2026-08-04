import dns from "dns/promises";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

async function resolveSmtpHost(host: string): Promise<string> {
  try {
    const v6 = await dns.resolve6(host);
    if (v6[0]) return v6[0];
  } catch {
    // IPv6 недоступен в DNS — оставляем имя хоста
  }
  return host;
}

async function getTransport() {
  const host = process.env.EMAIL_SERVER_HOST || "smtp.mail.ru";
  const port = Number(process.env.EMAIL_SERVER_PORT || 465);
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Не настроен SMTP: заполните EMAIL_SERVER_USER и EMAIL_SERVER_PASSWORD в .env"
    );
  }

  // На Timeweb VPS IPv4 до Mail.ru зависает; openssl ходит по IPv6 —
  // подключаемся к AAAA-адресу напрямую, SNI оставляем на имя хоста.
  const connectHost = await resolveSmtpHost(host);

  const options: SMTPTransport.Options = {
    host: connectHost,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    tls: {
      minVersion: "TLSv1.2",
      servername: host,
    },
  };

  return nodemailer.createTransport(options);
}

export async function sendVerificationEmail(email: string, code: string) {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER;
  if (!from) {
    throw new Error("Укажите EMAIL_FROM в .env");
  }

  const transport = await getTransport();

  await transport.sendMail({
    from: `RideShare <${from}>`,
    to: email,
    subject: "Код подтверждения RideShare",
    text: `Здравствуйте!\n\nВаш код подтверждения RideShare: ${code}\n\nКод действует 30 минут.\nЕсли вы не регистрировались — просто проигнорируйте письмо.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
        <h1 style="font-size:22px;margin:0 0 12px">RideShare</h1>
        <p style="margin:0 0 16px;line-height:1.5">Введите этот код на сайте, чтобы подтвердить email:</p>
        <p style="margin:0 0 8px;font-size:32px;letter-spacing:0.35em;font-weight:700;color:#0b6bcb">${code}</p>
        <p style="margin:20px 0 0;font-size:13px;color:#64748b;line-height:1.5">
          Код действует 30 минут.<br/>
          Если вы не регистрировались — просто проигнорируйте письмо.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, code: string) {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER;
  if (!from) {
    throw new Error("Укажите EMAIL_FROM в .env");
  }

  const transport = await getTransport();

  await transport.sendMail({
    from: `RideShare <${from}>`,
    to: email,
    subject: "Восстановление пароля RideShare",
    text: `Здравствуйте!\n\nКод для сброса пароля RideShare: ${code}\n\nКод действует 30 минут.\nЕсли вы не запрашивали сброс — просто проигнорируйте письмо.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
        <h1 style="font-size:22px;margin:0 0 12px">RideShare</h1>
        <p style="margin:0 0 16px;line-height:1.5">Введите этот код на сайте, чтобы задать новый пароль:</p>
        <p style="margin:0 0 8px;font-size:32px;letter-spacing:0.35em;font-weight:700;color:#0b6bcb">${code}</p>
        <p style="margin:20px 0 0;font-size:13px;color:#64748b;line-height:1.5">
          Код действует 30 минут.<br/>
          Если вы не запрашивали сброс — просто проигнорируйте письмо.
        </p>
      </div>
    `,
  });
}
