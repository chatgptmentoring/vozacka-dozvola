import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CarFront, ChevronRight, GitFork, Hash, Signpost, Timer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { t } from "@/components/copy";
import { Button } from "@/components/ui/button";
import { questions, signs, TOTAL_JUNCTIONS, TOTAL_QUESTIONS, TOTAL_SIGNS } from "@/data/bank";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const lang = useProgress((s) => s.lang);
  const questionStats = useProgress((s) => s.questionStats);
  const signStats = useProgress((s) => s.signStats);
  const lastPracticeId = useProgress((s) => s.lastPracticeId);
  const reset = useProgress((s) => s.reset);

  const answered = Object.values(questionStats).filter((s) => s.seen > 0).length;
  const rightQs = Object.values(questionStats).filter((s) => s.right > 0).length;
  const seenSigns = Object.values(signStats).filter((s) => s.seen > 0).length;
  const drives = useProgress((s) => s.drives);
  const lastDrive = drives[0];

  const modes = [
    {
      to: "/drive" as const,
      icon: CarFront,
      title: t("drive", lang),
      lead: t("driveLead", lang),
      meta: "∞",
    },
    {
      to: "/practice" as const,
      icon: BookOpen,
      title: t("practice", lang),
      lead: t("practiceLead", lang),
      meta: `${TOTAL_QUESTIONS}`,
    },
    {
      to: "/rules" as const,
      icon: Hash,
      title: t("rules", lang),
      lead: t("rulesLead", lang),
      meta: "130",
    },
    {
      to: "/junctions" as const,
      icon: GitFork,
      title: t("junctions", lang),
      lead: t("junctionsLead", lang),
      meta: `${TOTAL_JUNCTIONS}`,
    },
    {
      to: "/signs" as const,
      icon: Signpost,
      title: t("signs", lang),
      lead: t("signsLead", lang),
      meta: `${TOTAL_SIGNS}`,
    },
    {
      to: "/exam" as const,
      icon: Timer,
      title: t("exam", lang),
      lead: t("examLead", lang),
      meta: "20",
    },
  ];

  return (
    <AppShell>
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 pt-2">
          <p className="font-display text-sm tracking-[0.22em] text-muted uppercase">
            {lang === "en" ? "Driving theory" : "Теоретски испит"}
          </p>
          <h1 className="font-display text-5xl leading-none tracking-[0.04em] sm:text-6xl">
            VOZACKA
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted">
            {t("tagline", lang)}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-2">
          {[
            { k: t("practice", lang), v: `${rightQs}/${questions.length}` },
            { k: t("learned", lang), v: `${seenSigns}/${signs.length}` },
            {
              k: t("drive", lang),
              v: lastDrive ? `${lastDrive.correct}/${lastDrive.total}` : "—",
            },
          ].map((stat) => (
            <div
              key={stat.k}
              className="rounded-lg bg-bg-elevated px-3 py-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_8%,transparent)]"
            >
              <dt className="text-[11px] tracking-wide text-muted uppercase">{stat.k}</dt>
              <dd className="font-display mt-1 text-2xl tabular-nums">{stat.v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-3">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <Link
                key={mode.to}
                to={mode.to}
                className="group flex items-center gap-4 rounded-xl bg-bg-elevated p-4 no-underline shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)] transition-colors duration-(--motion-quick) hover:bg-line"
              >
                <span className="flex size-12 items-center justify-center rounded-md bg-fg/6 text-fg">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-base font-bold">{mode.title}</span>
                    <span className="font-display text-sm tabular-nums text-muted">
                      {mode.meta}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{mode.lead}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted transition-transform duration-(--motion-quick) group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>

        {answered > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="paper">
              <Link to="/practice">
                {t("resume", lang)} · {t("question", lang)} {lastPracticeId}
              </Link>
            </Button>
            <Button variant="ghost" onClick={reset}>
              {t("reset", lang)}
            </Button>
          </div>
        ) : null}

        <p className="text-xs leading-relaxed text-muted">{t("source", lang)}</p>
      </section>
    </AppShell>
  );
}
