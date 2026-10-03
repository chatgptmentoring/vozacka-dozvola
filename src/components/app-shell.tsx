import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, CarFront, Hash, House, Languages, Timer } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { t } from "@/components/copy";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", icon: House, key: "home" as const },
  { to: "/drive", icon: CarFront, key: "drive" as const },
  { to: "/practice", icon: BookOpen, key: "practice" as const },
  { to: "/rules", icon: Hash, key: "rules" as const },
  { to: "/exam", icon: Timer, key: "exam" as const },
];

export function AppShell({ children }: { children: ReactNode }) {
  const lang = useProgress((s) => s.lang);
  const setLang = useProgress((s) => s.setLang);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    void useProgress.persist.rehydrate();
  }, []);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-fg/8 bg-bg/85 px-4 py-3 backdrop-blur-md">
        <Link to="/" className="flex items-baseline gap-2 no-underline">
          <span className="font-display text-xl tracking-[0.14em] text-fg">
            VOZACKA
          </span>
          <span className="hidden text-xs text-muted sm:inline">MK</span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {nav.slice(1).map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm no-underline transition-colors duration-(--motion-quick)",
                  active ? "bg-fg/8 text-fg" : "text-muted hover:text-fg",
                )}
              >
                {t(item.key, lang)}
              </Link>
            );
          })}
        </nav>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLang(lang === "en" ? "mk" : "en")}
          aria-label="Toggle language"
        >
          <Languages />
          {lang === "en" ? "MK" : "EN"}
        </Button>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5 sm:pb-10">
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-fg/8 bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
        <ul className="grid grid-cols-5">
          {nav.map((item) => {
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] no-underline",
                    active ? "text-fg" : "text-muted",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                  {t(item.key, lang)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
