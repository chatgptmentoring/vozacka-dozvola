import { Check, X } from "lucide-react";
import { t } from "@/components/copy";
import type { PlayLogEntry } from "@/components/question-play";
import { SignFrame } from "@/components/sign-frame";
import type { Lang, MatchingQuestion, MultiQuestion } from "@/data/types";
import { label } from "@/data/types";
import { topicMeta } from "@/data/topics";
import { asset, cn } from "@/lib/utils";

export function ExamReview({
  log,
  lang,
}: {
  log: PlayLogEntry[];
  lang: Lang;
}) {
  const misses = log.filter((entry) => !entry.ok);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl tracking-wide">{t("learnMisses", lang)}</h2>
        <p className="mt-1 text-sm text-muted">
          {misses.length === 0
            ? t("cleanSheet", lang)
            : `${misses.length} ${t("toReview", lang)}`}
        </p>
      </div>

      {misses.map((entry) => (
        <MissCard key={`${entry.n}-${entry.question.id}`} entry={entry} lang={lang} />
      ))}
    </section>
  );
}

function MissCard({ entry, lang }: { entry: PlayLogEntry; lang: Lang }) {
  const q = entry.question;
  const topic = q.topic
    ? label(topicMeta(q.topic).title.mk, topicMeta(q.topic).title.en, lang)
    : null;
  const wide = q.topic !== "signs" && q.topic !== "theory";

  return (
    <article className="rounded-xl bg-paper p-4 text-paper-ink shadow-[0_0_0_1px_rgba(0,0,0,0.06)] sm:p-5">
      <p className="font-display text-xs tracking-[0.16em] text-paper-muted uppercase">
        {t("question", lang)} {entry.n + 1}
        {topic ? ` · ${topic}` : null}
      </p>
      <h3 className="mt-2 text-base leading-snug font-bold sm:text-lg">
        {label(q.promptMk, q.promptEn, lang)}
      </h3>
      {lang === "en" && q.promptMk !== q.promptEn ? (
        <p className="mt-1 text-sm leading-snug text-paper-muted">{q.promptMk}</p>
      ) : null}

      {q.image ? (
        <div className="mt-3 flex justify-center">
          <img
            src={asset(q.image)}
            alt=""
            className={
              wide
                ? "max-h-52 w-auto max-w-full rounded-md bg-white object-contain p-1 outline outline-1 -outline-offset-1 outline-black/10"
                : "max-h-40 w-auto max-w-full rounded-md bg-white object-contain p-2 outline outline-1 -outline-offset-1 outline-black/10"
            }
          />
        </div>
      ) : null}

      {q.type === "multi" ? (
        <MultiMiss question={q} pickedId={entry.pickedAnswerId} lang={lang} />
      ) : (
        <MatchMiss question={q} picks={entry.matchPicks} lang={lang} />
      )}
    </article>
  );
}

function MultiMiss({
  question,
  pickedId,
  lang,
}: {
  question: MultiQuestion;
  pickedId: string | null;
  lang: Lang;
}) {
  const yours = question.answers.find((a) => a.id === pickedId);
  const right = question.answers.find((a) => a.correct);
  const yoursIndex = question.answers.findIndex((a) => a.id === pickedId);
  const rightIndex = question.answers.findIndex((a) => a.correct);

  return (
    <div className="mt-4 grid gap-2">
      <AnswerRow
        tone="bad"
        kicker={t("yourAnswer", lang)}
        letter={yoursIndex >= 0 ? String.fromCharCode(65 + yoursIndex) : "—"}
        text={yours ? label(yours.mk, yours.en, lang) : t("noAnswer", lang)}
        image={yours?.image ?? null}
        mk={lang === "en" ? yours?.mk : undefined}
      />
      <AnswerRow
        tone="ok"
        kicker={t("rightAnswer", lang)}
        letter={rightIndex >= 0 ? String.fromCharCode(65 + rightIndex) : "—"}
        text={right ? label(right.mk, right.en, lang) : "—"}
        image={right?.image ?? null}
        mk={lang === "en" ? right?.mk : undefined}
      />
    </div>
  );
}

function MatchMiss({
  question,
  picks,
  lang,
}: {
  question: MatchingQuestion;
  picks: Record<string, string>;
  lang: Lang;
}) {
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {question.signs.map((sign) => {
        const picked = picks[sign.id];
        const ok = picked === sign.correctNumber;
        const yours = question.options.find((o) => o.number === picked);
        const right = question.options.find((o) => o.number === sign.correctNumber);
        return (
          <li
            key={sign.id}
            className="flex gap-3 rounded-md bg-paper-ink/4 p-2.5"
          >
            <SignFrame src={sign.image} alt="" size="sm" className="h-16 w-16 shrink-0" />
            <div className="min-w-0 flex-1 text-sm">
              {ok ? (
                <p className="flex items-center gap-1.5 font-medium text-ok">
                  <Check className="size-3.5 shrink-0" />
                  {right ? label(right.mk, right.en, lang) : sign.correctNumber}
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="flex items-start gap-1.5 text-bad">
                    <X className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      <span className="block text-xs tracking-wide uppercase opacity-80">
                        {t("youSaid", lang)}
                      </span>
                      {yours ? label(yours.mk, yours.en, lang) : t("noAnswer", lang)}
                    </span>
                  </p>
                  <p className="flex items-start gap-1.5 text-ok">
                    <Check className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      <span className="block text-xs tracking-wide uppercase opacity-80">
                        {t("rightAnswer", lang)}
                      </span>
                      {right ? label(right.mk, right.en, lang) : sign.correctNumber}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AnswerRow({
  tone,
  kicker,
  letter,
  text,
  image,
  mk,
}: {
  tone: "ok" | "bad";
  kicker: string;
  letter: string;
  text: string;
  image: string | null;
  mk?: string;
}) {
  const ok = tone === "ok";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md px-3 py-2.5",
        ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad",
      )}
    >
      {ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <X className="mt-0.5 size-4 shrink-0" />}
      {image ? <SignFrame src={image} alt="" size="sm" className="h-16 w-16 shrink-0" /> : null}
      <div className="min-w-0 flex-1">
        <p className="text-xs tracking-wide uppercase opacity-80">{kicker}</p>
        <p className="mt-0.5 text-sm leading-snug font-medium">
          {image ? null : (
            <span className="font-display mr-1.5 opacity-70">{letter} </span>
          )}
          {text || (image ? "" : "—")}
        </p>
        {mk && mk !== text ? <p className="mt-0.5 text-xs opacity-70">{mk}</p> : null}
      </div>
    </div>
  );
}
