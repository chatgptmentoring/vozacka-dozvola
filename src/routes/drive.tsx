import { createFileRoute, Link } from "@tanstack/react-router";
import { CarFront, ChevronLeft, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { t } from "@/components/copy";
import { Button } from "@/components/ui/button";
import { DriveGame } from "@/drive/game";
import { SCENARIOS } from "@/drive/scenarios";
import type { Hud } from "@/drive/types";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/drive")({ component: DrivePage });

function DrivePage() {
  const lang = useProgress((s) => s.lang);
  const setLang = useProgress((s) => s.setLang);
  const recordDrive = useProgress((s) => s.recordDrive);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<DriveGame | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);

  useEffect(() => {
    void useProgress.persist.rehydrate();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new DriveGame();
    gameRef.current = game;
    const off = game.onHud(setHud);
    game.attach(canvas);
    return () => {
      off();
      game.detach();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (hud?.phase === "complete") {
      recordDrive({ correct: hud.score, total: hud.total });
    }
  }, [hud?.phase, hud?.score, hud?.total, recordDrive]);

  const g = gameRef.current;
  const scene = SCENARIOS[hud?.index ?? 0];

  return (
    <div className="relative h-dvh overflow-hidden bg-[#1d241c] text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block touch-none"
        style={{ width: "100%", height: "100%", touchAction: "none" }}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-2">
          <Button asChild variant="ink" size="sm">
            <Link to="/">
              <ChevronLeft />
              {t("home", lang)}
            </Link>
          </Button>
          <Button
            variant="ink"
            size="sm"
            onClick={() => setLang(lang === "en" ? "mk" : "en")}
            aria-label="Toggle language"
          >
            <Languages />
            {lang === "en" ? "MK" : "EN"}
          </Button>
        </div>
        {hud && hud.phase !== "menu" ? (
          <div className="rounded-md bg-bg/80 px-3 py-2 text-right shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)] backdrop-blur-sm">
            <p className="font-display text-xs tracking-[0.16em] text-muted uppercase">
              {t("drive", lang)} {hud.index + 1}/{hud.total}
            </p>
            <p className="tabular-nums text-sm">
              {hud.score} {t("clean", lang)}
            </p>
          </div>
        ) : null}
      </header>

      {hud?.phase === "menu" || !hud ? (
        <div className="absolute inset-0 z-20 flex items-end bg-bg/55 sm:items-center">
          <div className="mx-auto mb-8 w-full max-w-md px-5 sm:mb-0">
            <p className="font-display text-sm tracking-[0.2em] text-muted uppercase">
              {t("drive", lang)}
            </p>
            <h1 className="font-display mt-2 text-5xl leading-none">{t("driveTitle", lang)}</h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              {t("driveLead", lang)}
            </p>
            <ul className="mt-4 space-y-1 text-sm text-fg/80">
              <li>{t("driveCtrl1", lang)}</li>
              <li>{t("driveCtrl2", lang)}</li>
              <li>{t("driveCtrl3", lang)}</li>
            </ul>
            <Button
              size="xl"
              className="mt-6 w-full"
              onClick={() => gameRef.current?.startLesson()}
            >
              <CarFront />
              {t("startLesson", lang)}
            </Button>
          </div>
        </div>
      ) : null}

      {hud && (hud.phase === "brief" || hud.phase === "drive") && scene ? (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center px-4">
          <div
            className={cn(
              "max-w-md rounded-lg bg-paper px-4 py-3 text-paper-ink shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
              hud.waiting && "bg-bad-soft",
              hud.yourTurn && hud.phase === "drive" && "bg-ok-soft",
            )}
          >
            <p className="font-display text-xs tracking-[0.16em] text-paper-muted uppercase">
              {lang === "mk" ? scene.titleMk : scene.titleEn}
            </p>
            <p className="mt-1 text-sm leading-snug font-bold">
              {lang === "mk" ? hud.coachMk : hud.coachEn}
            </p>
          </div>
        </div>
      ) : null}

      {hud?.phase === "pass" || hud?.phase === "fail" ? (
        <div className="absolute inset-0 z-20 flex items-end bg-bg/40 sm:items-center">
          <div className="mx-auto mb-28 w-full max-w-md px-5 sm:mb-0">
            <p
              className={cn(
                "font-display text-4xl",
                hud.phase === "pass" ? "text-ok-soft" : "text-bad-soft",
              )}
            >
              {hud.phase === "pass" ? t("cleanPass", lang) : t("fault", lang)}
            </p>
            <p className="mt-2 text-base leading-relaxed">
              {hud.phase === "fail"
                ? lang === "mk"
                  ? hud.failMk
                  : hud.failEn
                : lang === "mk"
                  ? hud.coachMk
                  : hud.coachEn}
            </p>
            <div className="mt-5 flex gap-2">
              {hud.phase === "fail" ? (
                <Button size="lg" onClick={() => g?.retry()}>
                  {t("tryAgain", lang)}
                </Button>
              ) : null}
              <Button
                size="lg"
                variant={hud.phase === "fail" ? "paper" : "default"}
                onClick={() => g?.nextScene()}
              >
                {t("nextScene", lang)}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {hud?.phase === "complete" ? (
        <div className="absolute inset-0 z-20 flex items-center bg-bg/70">
          <div className="mx-auto w-full max-w-md px-5">
            <p className="font-display text-sm tracking-[0.2em] text-muted uppercase">
              {t("drive", lang)}
            </p>
            <h1 className="font-display mt-2 text-5xl">{t("lessonDone", lang)}</h1>
            <p className="font-display mt-3 text-3xl tabular-nums">
              {hud.score}/{hud.total}
            </p>
            <p className="mt-2 text-sm text-muted">{t("driveEnd", lang)}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button size="lg" onClick={() => g?.startLesson()}>
                {t("tryAgain", lang)}
              </Button>
              <Button asChild size="lg" variant="paper">
                <Link to="/junctions">{t("junctions", lang)}</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {hud && (hud.phase === "drive" || hud.phase === "brief") ? (
        <Controls
          lang={lang}
          onSteer={(v) => g?.setTouch({ steer: v })}
          onGas={(v) => g?.setTouch({ throttle: v })}
          onBrake={(v) => g?.setTouch({ brake: v })}
        />
      ) : null}
    </div>
  );
}

function Controls({
  lang,
  onSteer,
  onGas,
  onBrake,
}: {
  lang: "en" | "mk";
  onSteer: (v: number) => void;
  onGas: (v: number) => void;
  onBrake: (v: number) => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex gap-2">
        <Pedal
          label={t("left", lang)}
          onDown={() => onSteer(1)}
          onUp={() => onSteer(0)}
        />
        <Pedal
          label={t("right", lang)}
          onDown={() => onSteer(-1)}
          onUp={() => onSteer(0)}
        />
      </div>
      <div className="flex gap-2">
        <Pedal
          label={t("brake", lang)}
          tone="bad"
          onDown={() => onBrake(1)}
          onUp={() => onBrake(0)}
        />
        <Pedal
          label={t("gas", lang)}
          tone="ok"
          onDown={() => onGas(1)}
          onUp={() => onGas(0)}
        />
      </div>
    </div>
  );
}

function Pedal({
  label,
  tone,
  onDown,
  onUp,
}: {
  label: string;
  tone?: "ok" | "bad";
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "h-16 min-w-16 rounded-lg px-4 text-sm font-bold select-none",
        "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_14%,transparent)]",
        "bg-bg/80 text-fg backdrop-blur-sm active:scale-[0.98]",
        tone === "ok" && "bg-ok text-fg",
        tone === "bad" && "bg-bad text-fg",
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        onDown();
      }}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {label}
    </button>
  );
}
