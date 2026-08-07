import { PublicBoardTabs } from "@/features/home/public-board-tabs";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const sp = await searchParams;
  const kind = sp.kind === "CARGO" ? "CARGO" : "RIDES";

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,hsl(199_89%_55%/_0.45),transparent_55%),linear-gradient(165deg,#0b3d6b_0%,#0b6bcb_50%,#7dd3fc_100%)]" />
        <div className="absolute inset-0 hero-scrim" />
        <div className="relative container mx-auto max-w-4xl px-4 pb-12 pt-14 sm:pb-14 sm:pt-20">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/75">
            RideShare
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Доски объявлений
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
            Поиск по объявлениям из групп ВКонтакте. Ссылка на пост в VK доступна после
            входа на сайт.
          </p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <PublicBoardTabs initialKind={kind} />
      </div>
    </div>
  );
}
