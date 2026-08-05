export function adminEmailsFromEnv(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isEmailAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailsFromEnv().has(email.toLowerCase().trim());
}
