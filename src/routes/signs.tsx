import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { t } from "@/components/copy";
import { SignFrame } from "@/components/sign-frame";
import { Button } from "@/components/ui/button";
import { signs } from "@/data/bank";
import type { Lang, SignCard } from "@/data/types";
import { label } from "@/data/types";
import { useProgress } from "@/lib/progress";
import { cn, pick, shuffle } from "@/lib/utils";

export const Route = createFileRoute("/signs")({ component: SignsPage });

type Tab = "drill" | "atlas" | "weak";

function SignsPage() {
  const lang = useProgress((s) => s.lang);
  const [tab, setTab] = useState<Tab>("drill");
  const tabs: { id: Tab; label: string }[] = [
    { id: "drill", label: t("drill", lang) },
    { id: "atlas", label: t("atlas", lang) },
    { id: "weak", label: t("weak", lang) },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-4xl tracking-wide">{t("signs", lang)}</h1>
          <p className="mt-1 text-sm text-muted">{t("signsLead", lang)}</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-bg-elevated p-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "h-10 flex-1 rounded-md text-sm font-medium transition-colors duration-(--motion-quick)",
                tab === item.id ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        {tab === "drill" ? <SignDrill lang={lang} /> : null}
        {tab === "atlas" ? <SignAtlas lang={lang} cards={signs} /> : null}
        {tab === "weak" ? <WeakList lang={lang} /> : null}
      </div>
    </AppShell>
  );
}

function SignDrill({ lang }: { lang: Lang }) {
  const recordSign = useProgress((s) => s.recordSign);
  const [order, setOrder] = useState(() => shuffle(signs.map((s) => s.id)));
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const current = signs.find((s) => s.id === order[cursor % order.length]);
  const options = useMemo(() => {
    if (!current) return [];
    const pool = signs.filter((s) => s.mk !== current.mk);
    return shuffle([current, ...pick(pool, 3)]);
  }, [current]);

  if (!current) return null;
  const revealed = picked !== null;
  const ok = picked === current.id;

  function choose(id: string) {
    if (picked) return;
    setPicked(id);
    recordSign(current!.id, id === current!.id);
  }

  function next() {
    setPicked(null);
    if (cursor + 1 >= order.length) {
      setOrder(shuffle(signs.map((s) => s.id)));
      setCursor(0);
      return;
    }
    setCursor((c) => c + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted tabular-nums">
        {t("signOf", lang)} {(cursor % order.length) + 1} {t("of", lang)} {order.length}
      </p>
      <div className="rounded-xl bg-paper p-5 text-paper-ink">
        <p className="mb-4 text-sm text-paper-muted">{t("pickName", lang)}</p>
        <div className="mb-5 flex justify-center">
          <SignFrame src={current.image} alt="" size="lg" />
        </div>
        <ul className="grid gap-2">
          {options.map((opt) => {
            const selected = picked === opt.id;
            const isRight = opt.id === current.id;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  disabled={revealed}
                  onClick={() => choose(opt.id)}
                  className={cn(
                    "flex min-h-12 w-full flex-col items-start rounded-md px-3 py-2.5 text-left text-sm leading-snug",
                    "shadow-[0_0_0_1px_rgba(28,31,36,0.12)]",
                    !revealed && "hover:bg-paper-ink/5",
                    selected && !revealed && "bg-paper-ink text-paper",
                    revealed && isRight && "bg-ok-soft text-ok shadow-[0_0_0_1px_var(--color-ok)]",
                    revealed && selected && !isRight && "bg-bad-soft text-bad shadow-[0_0_0_1px_var(--color-bad)]",
                  )}
                >
                  <span>{label(opt.mk, opt.en, lang)}</span>
                  {lang === "en" ? (
                    <span className="mt-0.5 text-xs opacity-70">{opt.mk}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {revealed ? (
        <Button size="lg" onClick={next}>
          {ok ? t("correct", lang) : t("incorrect", lang)} · {t("nextSign", lang)}
        </Button>
      ) : null}
    </div>
  );
}

function SignAtlas({ lang, cards }: { lang: Lang; cards: SignCard[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((card) => {
        const shown = open === card.id;
        return (
          <li key={card.id}>
            <button
              type="button"
              onClick={() => setOpen(shown ? null : card.id)}
              className="flex w-full flex-col items-center gap-2 rounded-lg bg-bg-elevated p-3 text-center shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_8%,transparent)]"
            >
              <SignFrame src={card.image} alt={card.en} size="sm" className="h-20 w-20" />
              <span className="min-h-10 text-xs leading-snug text-fg">
                {shown ? (
                  <>
                    <span className="block font-bold">{label(card.mk, card.en, lang)}</span>
                    <span className="block text-muted">
                      {lang === "en" ? card.mk : card.en}
                    </span>
                  </>
                ) : (
                  <span className="text-muted">{t("seeAnswer", lang)}</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function WeakList({ lang }: { lang: Lang }) {
  const signStats = useProgress((s) => s.signStats);
  const weak = signs
    .filter((s) => {
      const st = signStats[s.id];
      return st && st.wrong > st.right;
    })
    .sort((a, b) => (signStats[b.id]?.wrong ?? 0) - (signStats[a.id]?.wrong ?? 0));

  if (weak.length === 0) {
    return <p className="py-10 text-sm text-muted">{t("emptyWrong", lang)}</p>;
  }
  return <SignAtlas lang={lang} cards={weak} />;
}
