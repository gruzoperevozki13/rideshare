export default function VerifyPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="surface-strong max-w-md space-y-3 p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">Код из письма</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Мы отправили 6-значный код на ваш email. Вернитесь на страницу регистрации или
          входа и введите код там — ссылки в письме больше нет.
        </p>
      </div>
    </div>
  );
}
