import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Bus,
  ChevronRight,
  GitFork,
  Hash,
  Layers,
  Route as RouteIcon,
  Shield,
  Signpost,
  TrafficCone,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { t } from "@/components/copy";
import { QuestionPlay } from "@/components/question-play";
import { Button } from "@/components/ui/button";
import { questionsByTopic, topicCounts, TOTAL_QUESTIONS } from "@/data/bank";
import { isTopic, TOPICS, topicMeta } from "@/data/topics";
import type { Topic } from "@/data/types";
import { label } from "@/data/types";
import { useProgress } from "@/lib/progress";

type PracticeSearch = { topic?: Topic | "all" };

export const Route = createFileRoute("/practice")({
  validateSearch: (raw: Record<string, unknown>): PracticeSearch => {
    if (raw.topic === "all" || isTopic(raw.topic)) return { topic: raw.topic };
    return {};
  },
  component: PracticePage,
});

const ICONS = {
  signpost: Signpost,
  fork: GitFork,
  shield: Shield,
  traffic: TrafficCone,
  road: RouteIcon,
  book: BookOpen,
  truck: Truck,
  bus: Bus,
};

function PracticePage() {
  const { topic } = Route.useSearch();
  if (!topic) return <TopicHub />;
  return <TopicPlay topic={topic} />;
}

function TopicHub() {
  const lang = useProgress((s) => s.lang);
  const stats = useProgress((s) => s.questionStats);
  const counts = topicCounts();

  const rows = [
    {
      id: "all" as const,
      to: "/practice" as const,
      search: { topic: "all" as const },
      icon: Layers,
      title: t("allQuestions", lang),
      lead: t("allLead", lang),
      count: TOTAL_QUESTIONS,
      done: Object.values(stats).filter((s) => s.seen > 0).length,
    },
    ...TOPICS.map((meta) => {
      const Icon = ICONS[meta.icon];
      const items = questionsByTopic(meta.id);
      const done = items.filter((q) => (stats[String(q.id)]?.seen ?? 0) > 0).length;
      return {
        id: meta.id,
        to: "/practice" as const,
        search: { topic: meta.id },
        icon: Icon,
        title: label(meta.title.mk, meta.title.en, lang),
        lead: label(meta.lead.mk, meta.lead.en, lang),
        count: counts[meta.id] ?? 0,
        done,
      };
    }),
  ];

  return (
    <AppShell>
      <section className="flex flex-col gap-6">
        <div>
          <p className="font-display text-sm tracking-[0.18em] text-muted uppercase">
            {t("practice", lang)}
          </p>
          <h1 className="font-display mt-1 text-4xl tracking-wide">{t("pickTopic", lang)}</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            {t("practiceLead", lang)}
          </p>
        </div>

        <Link
          to="/rules"
          className="flex items-center gap-4 rounded-xl bg-paper p-4 text-paper-ink no-underline shadow-[0_0_0_1px_rgba(0,0,0,0.06)]"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-paper-ink/6">
            <Hash className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-base font-bold">{t("rulesTitle", lang)}</span>
            <span className="mt-0.5 block text-sm text-paper-muted">{t("rulesLead", lang)}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 opacity-50" />
        </Link>

        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <Link
                key={row.id}
                to={row.to}
                search={row.search}
                className="group flex items-center gap-4 rounded-xl bg-bg-elevated p-4 no-underline shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)] transition-colors duration-(--motion-quick) hover:bg-line"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-fg/6">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-base font-bold">{row.title}</span>
                    <span className="font-display text-sm tabular-nums text-muted">
                      {row.done}/{row.count}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{row.lead}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted transition-transform duration-(--motion-quick) group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>

        <Button asChild variant="paper">
          <Link to="/signs">{t("flashcards", lang)}</Link>
        </Button>
      </section>
    </AppShell>
  );
}

function TopicPlay({ topic }: { topic: Topic | "all" }) {
  const lang = useProgress((s) => s.lang);
  const lastByTopic = useProgress((s) => s.lastByTopic);
  const setLastForTopic = useProgress((s) => s.setLastForTopic);
  const [done, setDone] = useState<{ correct: number; total: number } | null>(null);

  const items = useMemo(() => questionsByTopic(topic), [topic]);
  const meta = topic === "all" ? null : topicMeta(topic);
  const title = meta
    ? label(meta.title.mk, meta.title.en, lang)
    : t("allQuestions", lang);

  const startIndex = useMemo(() => {
    const last = lastByTopic[topic];
    const idx = items.findIndex((q) => q.id === last);
    return idx >= 0 ? idx : 0;
  }, [items, lastByTopic, topic]);

  return (
    <AppShell>
      {done ? (
        <div className="flex flex-col gap-5 pt-6">
          <p className="font-display text-sm tracking-[0.18em] text-muted uppercase">{title}</p>
          <h1 className="font-display text-4xl">
            {done.correct}/{done.total}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setLastForTopic(topic, items[0]?.id ?? 1);
                setDone(null);
              }}
            >
              {t("fromStart", lang)}
            </Button>
            <Button asChild variant="paper">
              <Link to="/practice">{t("pickTopic", lang)}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-sm tracking-[0.16em] text-muted uppercase">{title}</p>
            <Button asChild variant="ghost" size="sm">
              <Link to="/practice">{t("back", lang)}</Link>
            </Button>
          </div>
          <QuestionPlay
            key={topic}
            items={items}
            mode="practice"
            startIndex={startIndex}
            onIndexChange={(id) => setLastForTopic(topic, id)}
            onFinished={(r) => {
              setLastForTopic(topic, items[0]?.id ?? 1);
              setDone(r);
            }}
          />
        </div>
      )}
    </AppShell>
  );
}
