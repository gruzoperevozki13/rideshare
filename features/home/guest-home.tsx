import { PublicBoardTabs } from "@/features/home/public-board-tabs";

export function GuestHome() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,hsl(199_89%_55%/_0.5),transparent_55%),linear-gradient(165deg,#0b3d6b_0%,#0b6bcb_50%,#7dd3fc_100%)]" />
        <div className="absolute inset-0 hero-scrim" />
        <div className="relative container mx-auto max-w-4xl px-4 pb-14 pt-16 sm:pb-16 sm:pt-24">
          <p className="animate-fade-in text-sm font-semibold uppercase tracking-[0.24em] text-white/75">
            RideShare
          </p>
          <h1 className="font-display mt-4 max-w-2xl text-4xl font-semibold leading-[1.08] text-white sm:text-5xl animate-fade-up">
            Доски объявлений из VK
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-white/80 animate-fade-up stagger-1">
            Смотрите свежие объявления попутчиков и грузоперевозок без регистрации. Чтобы
            разместить своё или договориться — войдите в сервис.
          </p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <PublicBoardTabs />
      </div>
    </div>
  );
}
