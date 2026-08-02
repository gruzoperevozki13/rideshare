import Link from "next/link";
import { Shield, HandCoins, Ban, MessageCircleWarning, Eye, PhoneCall } from "lucide-react";

const rules = [
  {
    icon: HandCoins,
    title: "Оплата только при встрече",
    text: "Деньги передавайте лично — в машине, при посадке или при передаче груза. Никаких переводов «вперёд», даже частичных.",
  },
  {
    icon: Ban,
    title: "Предоплата не нужна",
    text: "RideShare не просит оплату за бронь. Если кто-то пишет «переведите залог / за бронь / на карту курьера» — это мошенничество.",
  },
  {
    icon: MessageCircleWarning,
    title: "Не переходите по сомнительным ссылкам",
    text: "Не открывайте «кассы», «форму оплаты» и чаты вне сервиса, куда вас зовут «срочно перевести». Общайтесь в чате RideShare после заявки.",
  },
  {
    icon: Eye,
    title: "Проверяйте человека и машину",
    text: "Сверьте имя, телефон и номер авто. При сомнениях откажитесь от поездки — лучше опоздать, чем потерять деньги.",
  },
  {
    icon: PhoneCall,
    title: "Договоритесь голосом",
    text: "Короткий звонок перед встречей снижает риск. Если абонент отказывается говорить или давит на срочность — остановитесь.",
  },
];

export default function SafetyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="animate-fade-up">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <Shield className="h-3.5 w-3.5" />
          Безопасность
        </p>
        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Как не попасть на мошенников
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          RideShare — площадка для договорённостей о поездках и грузах. Мы не принимаем
          платежи и не храним ваши карты. Главное правило:{" "}
          <span className="font-medium text-foreground">
            оплата только при личной встрече
          </span>
          .
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-5 text-sm leading-relaxed text-amber-950 animate-rise">
        <p className="font-semibold">Запомните</p>
        <p className="mt-1.5">
          Настоящий попутчик или перевозчик не требует предоплату. Любая просьба
          «сначала переведите» — красный флаг. Сервис не списывает деньги сам.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {rules.map((rule, i) => (
          <article
            key={rule.title}
            className="surface flex gap-4 p-5 animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <rule.icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {rule.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {rule.text}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="surface-strong mt-10 space-y-3 p-6 sm:p-8 animate-rise">
        <h2 className="font-display text-xl font-semibold">Кратко об оферте сервиса</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            RideShare помогает найти попутчиков и попутные перевозки, но не является
            стороной сделки и не гарантирует поездку.
          </li>
          <li>
            Расчёты между пользователями — только напрямую и по договорённости при
            встрече; предоплаты через сервис нет.
          </li>
          <li>
            Вы несёте ответственность за достоверность объявлений и соблюдение ПДД и
            законов.
          </li>
          <li>
            Подозрительное поведение можно сообщить через контакты внизу сайта — поможем
            разобраться.
          </li>
        </ul>
        <p className="pt-2 text-sm text-muted-foreground">
          Регистрируясь, вы подтверждаете, что ознакомились с этими правилами и
          принимаете условия использования сервиса.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href="/register"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Зарегистрироваться
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-xl border border-border bg-white/80 px-4 text-sm font-medium"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
