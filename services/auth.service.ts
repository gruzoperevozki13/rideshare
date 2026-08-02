import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mail";

const SALT_ROUNDS = 10;
const VERIFY_TTL_MS = 30 * 60 * 1000;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

async function createUniqueCode() {
  for (let i = 0; i < 12; i++) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const clash = await prisma.verificationToken.findUnique({
      where: { token: code },
    });
    if (!clash) return code;
  }
  throw new Error("Не удалось создать код подтверждения");
}

export async function createAndSendEmailVerification(email: string) {
  const code = await createUniqueCode();
  const expires = new Date(Date.now() + VERIFY_TTL_MS);

  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: code,
      expires,
    },
  });

  await sendVerificationEmail(email, code);
}

export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  phone: string;
}) {
  const email = data.email.toLowerCase().trim();
  const name = data.name.trim();
  const phone = data.phone.trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    throw new Error("Пользователь с таким email уже зарегистрирован");
  }

  if (existing && !existing.passwordHash) {
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        name: name || existing.name,
        phone: phone || existing.phone,
      },
    });

    if (!user.emailVerified) {
      await createAndSendEmailVerification(email);
    }

    return { user, needsVerification: !user.emailVerified };
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      phone,
      passwordHash,
      emailVerified: null,
    },
  });

  await createAndSendEmailVerification(email);
  return { user, needsVerification: true };
}

export async function verifyEmailCode(emailRaw: string, codeRaw: string) {
  const email = emailRaw.toLowerCase().trim();
  const code = codeRaw.replace(/\s/g, "").trim();

  if (!/^\d{6}$/.test(code)) {
    throw new Error("Введите 6-значный код из письма");
  }

  const record = await prisma.verificationToken.findFirst({
    where: { identifier: email, token: code },
  });

  if (!record) {
    throw new Error("Неверный код или он уже использован");
  }

  if (record.expires.getTime() < Date.now()) {
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    throw new Error("Срок кода истёк — запросите новый");
  }

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
}

/** @deprecated оставлен для старых ссылок — используйте verifyEmailCode */
export async function verifyEmailToken(emailRaw: string, token: string) {
  return verifyEmailCode(emailRaw, token);
}

export async function resendVerificationEmail(emailRaw: string) {
  const email = emailRaw.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user?.passwordHash) {
    throw new Error("Аккаунт не найден");
  }
  if (user.emailVerified) {
    throw new Error("Email уже подтверждён — можно входить");
  }

  await createAndSendEmailVerification(email);
}
