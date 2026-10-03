import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { t } from "@/components/copy";
import { QuestionPlay } from "@/components/question-play";
import { Button } from "@/components/ui/button";
import { junctionQuestions } from "@/data/bank";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/junctions")({ component: JunctionsPage });

function JunctionsPage() {
  const lang = useProgress((s) => s.lang);
  const lastJunctionId = useProgress((s) => s.lastJunctionId);
  const setLastJunctionId = useProgress((s) => s.setLastJunctionId);
  const [done, setDone] = useState<{ correct: number; total: number } | null>(null);

  const startIndex = useMemo(() => {
    const idx = junctionQuestions.findIndex((q) => q.id === lastJunctionId);
    return idx >= 0 ? idx : 0;
  }, [lastJunctionId]);

  return (
    <AppShell>
      {done ? (
        <div className="flex flex-col gap-5 pt-6">
          <p className="font-display text-sm tracking-[0.18em] text-muted uppercase">
            {t("junctions", lang)}
          </p>
          <h1 className="font-display text-4xl">
            {done.correct}/{done.total}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setLastJunctionId(junctionQuestions[0]?.id ?? 163);
                setDone(null);
              }}
            >
              {t("fromStart", lang)}
            </Button>
            <Button asChild variant="paper">
              <Link to="/">{t("home", lang)}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">{t("orderHint", lang)}</p>
          <QuestionPlay
            items={junctionQuestions}
            mode="practice"
            startIndex={startIndex}
            onIndexChange={setLastJunctionId}
            onFinished={(r) => {
              setLastJunctionId(junctionQuestions[0]?.id ?? 163);
              setDone(r);
            }}
          />
        </>
      )}
    </AppShell>
  );
}
