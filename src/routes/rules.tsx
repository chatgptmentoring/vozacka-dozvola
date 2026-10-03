import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RULE_GROUPS, type RuleGroup } from "@/data/rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rules")({ component: RulesPage });

function RulesPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RULE_GROUPS;
    return RULE_GROUPS.map((group) => {
      const groupHit = [group.title.en, group.title.mk].join(" ").toLowerCase().includes(q);
      const items = groupHit
        ? group.items
        : group.items.filter((item) =>
            [item.value, item.unit, item.qMk, item.aMk, item.qEn, item.aEn]
              .join(" ")
              .toLowerCase()
              .includes(q),
          );
      return items.length ? { ...group, items } : null;
    }).filter((g): g is RuleGroup => Boolean(g));
  }, [query]);

  const shown = active ? groups.filter((g) => g.id === active) : groups;

  return (
    <AppShell>
      <section className="flex flex-col gap-6">
        <div>
          <p className="font-display text-sm tracking-[0.18em] text-muted uppercase">Броеви</p>
          <h1 className="font-display mt-1 text-4xl tracking-wide">Броеви од испитот</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
            Како што стои на тестот на МВР — прашањето на македонски и точниот одговор.
          </p>
        </div>

        <label className="block">
          <span className="sr-only">Барај</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(null);
            }}
            placeholder="Барај — брзина, растојание, алкохол…"
            className="h-12 w-full rounded-md bg-bg-elevated px-4 text-sm text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_12%,transparent)] outline-none placeholder:text-muted focus:shadow-[0_0_0_1px_var(--color-fg)]"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          <Chip
            on={active === null}
            onClick={() => setActive(null)}
            label="Сите"
          />
          {RULE_GROUPS.map((group) => (
            <Chip
              key={group.id}
              on={active === group.id}
              onClick={() => setActive(active === group.id ? null : group.id)}
              label={group.title.mk}
            />
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="text-sm text-muted">Нема совпаѓање за тоа пребарување.</p>
        ) : (
          shown.map((group) => (
            <article
              key={group.id}
              id={group.id}
              className="rounded-xl bg-paper p-4 text-paper-ink shadow-[0_0_0_1px_rgba(0,0,0,0.06)] sm:p-5"
            >
              <h2 className="font-display text-2xl tracking-wide">{group.title.mk}</h2>
              <ul className="mt-4 flex flex-col gap-2">
                {group.items.map((item, i) => (
                  <li
                    key={`${group.id}-${i}`}
                    className="flex gap-3 rounded-md bg-paper-ink/4 px-3 py-2.5"
                  >
                    <div className="w-[4.75rem] shrink-0 sm:w-24">
                      <p className="font-display text-2xl leading-none tracking-wide">
                        {item.value}
                      </p>
                      {item.unit ? (
                        <p className="mt-1 text-xs tracking-wide text-paper-muted">{item.unit}</p>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug font-medium">{item.qMk}</p>
                      <p className="mt-1 text-sm leading-snug text-ok">{item.aMk}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>
    </AppShell>
  );
}

function Chip({
  on,
  onClick,
  label: text,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-2 text-xs tracking-wide uppercase transition-colors duration-(--motion-quick)",
        on ? "bg-paper text-paper-ink" : "bg-bg-elevated text-muted hover:text-fg",
      )}
    >
      {text}
    </button>
  );
}
