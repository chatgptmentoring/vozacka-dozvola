import { Check, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import { t } from "@/components/copy";
import { SignFrame } from "@/components/sign-frame";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Lang, MatchingQuestion, MultiQuestion, Question } from "@/data/types";
import { label } from "@/data/types";
import { topicMeta } from "@/data/topics";
import { useProgress } from "@/lib/progress";
import { asset, cn } from "@/lib/utils";

type PlayMode = "practice" | "exam";

export type PlayLogEntry = {
  n: number;
  question: Question;
  ok: boolean;
  pickedAnswerId: string | null;
  matchPicks: Record<string, string>;
};

export type PlayResult = {
  correct: number;
  total: number;
  points: number;
  maxPoints: number;
  log: PlayLogEntry[];
};

type Props = {
  items: Question[];
  mode: PlayMode;
  startIndex?: number;
  onIndexChange?: (index: number) => void;
  onFinished?: (result: PlayResult) => void;
};

type MatchState = {
  signIndex: number;
  picks: Record<string, string>;
  revealed: Record<string, boolean>;
};

export function QuestionPlay({
  items,
  mode,
  startIndex = 0,
  onIndexChange,
  onFinished,
}: Props) {
  const lang = useProgress((s) => s.lang);
  const recordQuestion = useProgress((s) => s.recordQuestion);
  const recordSign = useProgress((s) => s.recordSign);

  const [index, setIndex] = useState(startIndex);
  const [correctCount, setCorrectCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [graded, setGraded] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [log, setLog] = useState<PlayLogEntry[]>([]);
  const [match, setMatch] = useState<MatchState>({
    signIndex: 0,
    picks: {},
    revealed: {},
  });

  const question = items[index];
  const maxPoints = useMemo(
    () => items.reduce((sum, q) => sum + Number(q.points || 0), 0),
    [items],
  );

  if (!question) return null;

  const total = items.length;
  const isPractice = mode === "practice";

  function go(
    nextIndex: number,
    wasCorrect: boolean,
    qPoints: number,
    extra?: { pickedAnswerId?: string | null; matchPicks?: Record<string, string> },
  ) {
    if (isPractice) recordQuestion(question!.id, wasCorrect);
    const entry: PlayLogEntry = {
      n: index,
      question: question!,
      ok: wasCorrect,
      pickedAnswerId: extra?.pickedAnswerId ?? picked,
      matchPicks: extra?.matchPicks ?? match.picks,
    };
    const nextLog = [...log, entry];
    const nextCorrect = correctCount + (wasCorrect ? 1 : 0);
    const nextPoints = points + (wasCorrect ? qPoints : 0);
    setLog(nextLog);
    setCorrectCount(nextCorrect);
    setPoints(nextPoints);
    setGraded(null);
    setPicked(null);
    setMatch({ signIndex: 0, picks: {}, revealed: {} });
    if (nextIndex >= items.length) {
      onFinished?.({
        correct: nextCorrect,
        total: items.length,
        points: nextPoints,
        maxPoints,
        log: nextLog,
      });
      return;
    }
    setIndex(nextIndex);
    onIndexChange?.(items[nextIndex]?.id ?? nextIndex + 1);
  }

  function gradeMulti(q: MultiQuestion, answerId: string) {
    const answer = q.answers.find((a) => a.id === answerId);
    const ok = Boolean(answer?.correct);
    if (isPractice) {
      setPicked(answerId);
      setGraded(ok);
      return;
    }
    go(index + 1, ok, Number(q.points || 0), { pickedAnswerId: answerId });
  }

  function confirmMatch(q: MatchingQuestion) {
    const allRight = q.signs.every(
      (s) => match.picks[s.id] === s.correctNumber,
    );
    q.signs.forEach((s) => {
      recordSign(s.id, match.picks[s.id] === s.correctNumber);
    });
    go(index + 1, allRight, Number(q.points || 0), { matchPicks: match.picks });
  }

  const topicName = question.topic
    ? label(topicMeta(question.topic).title.mk, topicMeta(question.topic).title.en, lang)
    : null;
  const wideImage = question.topic !== "signs" && question.topic !== "theory";
  const progressValue = ((index + (graded !== null ? 0.5 : 0)) / total) * 100;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-sm tracking-[0.16em] text-muted uppercase">
            {t("question", lang)} {index + 1} {t("of", lang)} {total}
          </p>
          <p className="text-xs text-muted">
            {topicName ? `${topicName} · ` : null}
            {t("category", lang)} {question.categories} · {question.points}{" "}
            {t("points", lang)}
          </p>
        </div>
        {mode === "exam" ? (
          <p className="tabular-nums text-sm text-muted">
            {total - index} {t("remaining", lang)}
          </p>
        ) : null}
      </div>
      <Progress value={progressValue} />

      <article className="rounded-xl bg-paper p-4 text-paper-ink shadow-[0_0_0_1px_rgba(0,0,0,0.06)] sm:p-6">
        <Prompt lang={lang} mk={question.promptMk} en={question.promptEn} />
        {question.image ? (
          <div className="mt-4 flex justify-center">
            <img
              src={asset(question.image)}
              alt=""
              className={
                wideImage
                  ? "max-h-[22rem] w-auto max-w-full rounded-md bg-white object-contain p-1 outline outline-1 -outline-offset-1 outline-black/10 sm:max-h-[28rem]"
                  : "max-h-64 w-auto max-w-full rounded-md bg-white object-contain p-2 outline outline-1 -outline-offset-1 outline-black/10"
              }
            />
          </div>
        ) : null}

        {question.type === "matching" ? (
          <MatchingBody
            question={question}
            lang={lang}
            mode={mode}
            state={match}
            setState={setMatch}
            onConfirm={() => confirmMatch(question)}
          />
        ) : (
          <MultiBody
            question={question}
            lang={lang}
            picked={picked}
            graded={graded}
            practice={isPractice}
            onPick={(id) => gradeMulti(question, id)}
          />
        )}
      </article>

      {question.type === "multi" && isPractice && graded !== null ? (
        <div className="flex flex-col gap-3">
          <Feedback ok={graded} lang={lang} />
          <Button size="lg" onClick={() => go(index + 1, graded, Number(question.points || 0))}>
            {index + 1 >= total ? t("finish", lang) : t("next", lang)}
            <ChevronRight />
          </Button>
        </div>
      ) : null}

      {question.type === "multi" && isPractice && graded === null ? (
        <Button
          variant="ghost"
          onClick={() => go(index + 1, false, 0)}
          className="self-start text-muted"
        >
          {t("skip", lang)}
        </Button>
      ) : null}
    </div>
  );
}

function Prompt({ lang, mk, en }: { lang: Lang; mk: string; en: string }) {
  const primary = lang === "mk" ? mk : en;
  const secondary = lang === "mk" ? en : mk;
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-lg leading-snug font-bold sm:text-xl">{primary}</h2>
      <p className="text-sm leading-snug text-paper-muted">{secondary}</p>
    </div>
  );
}

function Feedback({ ok, lang }: { ok: boolean; lang: Lang }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
        ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad",
      )}
    >
      {ok ? <Check className="size-4" /> : <X className="size-4" />}
      {ok ? t("correct", lang) : t("incorrect", lang)}
    </div>
  );
}

function MultiBody({
  question,
  lang,
  picked,
  graded,
  practice,
  onPick,
}: {
  question: MultiQuestion;
  lang: Lang;
  picked: string | null;
  graded: boolean | null;
  practice: boolean;
  onPick: (id: string) => void;
}) {
  const hasImages = question.answers.some((a) => a.image);
  return (
    <ul className={cn("mt-5 grid gap-2", hasImages && "grid-cols-1 sm:grid-cols-3")}>
      {question.answers.map((answer, i) => {
        const selected = picked === answer.id;
        const show = practice && graded !== null;
        const isRight = answer.correct;
        return (
          <li key={answer.id}>
            <button
              type="button"
              disabled={show}
              onClick={() => onPick(answer.id)}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm leading-snug transition-colors duration-(--motion-quick)",
                "shadow-[0_0_0_1px_rgba(28,31,36,0.12)]",
                !show && "hover:bg-paper-ink/5",
                selected && !show && "bg-paper-ink text-paper",
                show && isRight && "bg-ok-soft text-ok shadow-[0_0_0_1px_var(--color-ok)]",
                show && selected && !isRight && "bg-bad-soft text-bad shadow-[0_0_0_1px_var(--color-bad)]",
                hasImages && "flex-col text-center",
              )}
            >
              {answer.image ? (
                <SignFrame src={answer.image} alt="" size="sm" className="h-24 w-24" />
              ) : (
                <span className="font-display w-6 shrink-0 text-base opacity-60">
                  {String.fromCharCode(65 + i)}
                </span>
              )}
              <span className="flex-1">
                {label(answer.mk, answer.en, lang)}
                {lang === "en" && answer.mk !== answer.en ? (
                  <span className="mt-0.5 block text-xs opacity-70">{answer.mk}</span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MatchingBody({
  question,
  lang,
  mode,
  state,
  setState,
  onConfirm,
}: {
  question: MatchingQuestion;
  lang: Lang;
  mode: PlayMode;
  state: MatchState;
  setState: (next: MatchState) => void;
  onConfirm: () => void;
}) {
  const sign = question.signs[state.signIndex];
  if (!sign) return null;
  const option = question.options.find((o) => o.number === sign.correctNumber);
  const picked = state.picks[sign.id];
  const revealed = state.revealed[sign.id];
  const isPractice = mode === "practice";
  const last = state.signIndex >= question.signs.length - 1;
  const allPicked = question.signs.every((s) => state.picks[s.id]);

  function choose(number: string) {
    const nextPicks = { ...state.picks, [sign.id]: number };
    if (isPractice) {
      setState({
        ...state,
        picks: nextPicks,
        revealed: { ...state.revealed, [sign.id]: true },
      });
      return;
    }
    setState({
      ...state,
      picks: nextPicks,
      signIndex: last ? state.signIndex : state.signIndex + 1,
    });
  }

  function advance() {
    if (last) {
      onConfirm();
      return;
    }
    setState({
      ...state,
      signIndex: state.signIndex + 1,
    });
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-paper-muted">
        <span>
          {t("signOf", lang)} {state.signIndex + 1} {t("of", lang)} {question.signs.length}
        </span>
        <span>{t("pickName", lang)}</span>
      </div>
      <div className="flex justify-center">
        <SignFrame src={sign.image} alt="" size="lg" />
      </div>
      <ul className="grid gap-2">
        {question.options.map((opt) => {
          const selected = picked === opt.number;
          const isRight = opt.number === sign.correctNumber;
          const show = isPractice && revealed;
          return (
            <li key={opt.id}>
              <button
                type="button"
                disabled={Boolean(show)}
                onClick={() => choose(opt.number)}
                className={cn(
                  "flex min-h-12 w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm leading-snug transition-colors duration-(--motion-quick)",
                  "shadow-[0_0_0_1px_rgba(28,31,36,0.12)]",
                  !show && "hover:bg-paper-ink/5",
                  selected && !show && "bg-paper-ink text-paper",
                  show && isRight && "bg-ok-soft text-ok shadow-[0_0_0_1px_var(--color-ok)]",
                  show && selected && !isRight && "bg-bad-soft text-bad shadow-[0_0_0_1px_var(--color-bad)]",
                )}
              >
                <span className="font-display w-5 shrink-0 tabular-nums opacity-60">
                  {opt.number}
                </span>
                <span className="flex-1">
                  {label(opt.mk, opt.en, lang)}
                  {lang === "en" ? (
                    <span className="mt-0.5 block text-xs opacity-70">{opt.mk}</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {isPractice && revealed ? (
        <div className="flex flex-col gap-3">
          <Feedback ok={picked === sign.correctNumber} lang={lang} />
          {picked !== sign.correctNumber && option ? (
            <p className="text-sm text-paper-muted">
              {label(option.mk, option.en, lang)}
            </p>
          ) : null}
          <Button size="lg" onClick={advance}>
            {last ? t("next", lang) : t("nextSign", lang)}
            <ChevronRight />
          </Button>
        </div>
      ) : null}
      {!isPractice && last && allPicked ? (
        <Button size="lg" onClick={onConfirm}>
          {t("submit", lang)}
          <ChevronRight />
        </Button>
      ) : null}
    </div>
  );
}
