import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { t } from "@/components/copy";
import { ExamReview } from "@/components/exam-review";
import { QuestionPlay, type PlayResult } from "@/components/question-play";
import { Button } from "@/components/ui/button";
import { questions } from "@/data/bank";
import { useProgress } from "@/lib/progress";
import { pick } from "@/lib/utils";

export const Route = createFileRoute("/exam")({ component: ExamPage });

const EXAM_SIZE = 20;
const PASS = 0.85;

function ExamPage() {
  const lang = useProgress((s) => s.lang);
  const recordExam = useProgress((s) => s.recordExam);
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<PlayResult | null>(null);

  const paper = useMemo(() => {
    const matching = questions.filter(
      (q) => q.type === "matching" && "signs" in q && q.signs.length <= 4,
    );
    const by = (topic: string) => questions.filter((q) => q.topic === topic && q.type === "multi");
    return pick(
      [
        ...pick(matching, 3),
        ...pick(by("signs"), 2),
        ...pick(by("junctions"), 5),
        ...pick(by("police"), 3),
        ...pick(by("lights"), 3),
        ...pick(by("roads"), 3),
        ...pick(by("theory"), 2),
      ],
      EXAM_SIZE,
    );
  }, [seed]);

  const ratio = result ? result.correct / result.total : 0;
  const passed = ratio >= PASS;

  return (
    <AppShell>
      {result ? (
        <section className="flex flex-col gap-6 pt-4">
          <p className="font-display text-sm tracking-[0.18em] text-muted uppercase">
            {t("exam", lang)}
          </p>
          <h1 className="font-display text-5xl tracking-wide">
            {passed ? t("passed", lang) : t("failed", lang)}
          </h1>
          <p className="text-muted">{t("examPass", lang)}</p>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-bg-elevated p-4">
              <dt className="text-xs text-muted uppercase">{t("score", lang)}</dt>
              <dd className="font-display mt-1 text-3xl tabular-nums">
                {Math.round(ratio * 100)}%
              </dd>
            </div>
            <div className="rounded-lg bg-bg-elevated p-4">
              <dt className="text-xs text-muted uppercase">{t("points", lang)}</dt>
              <dd className="font-display mt-1 text-3xl tabular-nums">
                {result.points}/{result.maxPoints}
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted">
            {result.correct} / {result.total} {t("correct", lang).toLowerCase()}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setResult(null);
                setSeed((n) => n + 1);
              }}
            >
              {t("tryAgain", lang)}
            </Button>
            <Button asChild variant="paper">
              <Link to="/">{t("home", lang)}</Link>
            </Button>
          </div>
          <ExamReview log={result.log} lang={lang} />
        </section>
      ) : (
        <QuestionPlay
          key={seed}
          items={paper}
          mode="exam"
          onFinished={(r) => {
            recordExam({
              correct: r.correct,
              total: r.total,
              points: r.points,
              maxPoints: r.maxPoints,
            });
            setResult(r);
          }}
        />
      )}
    </AppShell>
  );
}
