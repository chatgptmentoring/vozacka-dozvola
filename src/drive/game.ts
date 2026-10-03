import { DriveAudio } from "./audio";
import { SCENARIOS } from "./scenarios";
import type { ActorKind, Dir, Hud, Phase, Scenario, SignKind, Turn } from "./types";

const LANE = 32;
const HALF = 64;
const SPAWN = 340;
const EXIT = 200;
const MAX_SPEED = 180;
const NPC_SPEED = 92;
const TURN_RATE = 2.5;
const STEP = 1 / 60;
const VIEW_H = 780;

type Pt = { x: number; y: number };

type Car = {
  x: number;
  y: number;
  heading: number;
  speed: number;
  color: string;
  label: string;
  kind: ActorKind;
  order: number;
  turn: Turn;
  from: Dir;
  path: Pt[];
  pi: number;
  done: boolean;
  waiting: boolean;
  flash: number;
  w: number;
  h: number;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function angDiff(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function headingOf(from: Dir): number {
  if (from === "S") return 0;
  if (from === "E") return Math.PI / 2;
  if (from === "N") return Math.PI;
  return -Math.PI / 2;
}

function exitHeading(from: Dir, turn: Turn): number {
  const start = headingOf(from);
  if (turn === "left") return start + Math.PI / 2;
  if (turn === "right") return start - Math.PI / 2;
  return start;
}

function pathFor(from: Dir, turn: Turn): Pt[] {
  const far = SPAWN;
  const out = SPAWN + 120;
  const s = from === "S" ? { x: LANE, y: far } : from === "N" ? { x: -LANE, y: -far } : from === "E" ? { x: far, y: -LANE } : { x: -far, y: LANE };
  if (turn === "straight") {
    const e =
      from === "S"
        ? { x: LANE, y: -far }
        : from === "N"
          ? { x: -LANE, y: far }
        : from === "E"
          ? { x: -out, y: -LANE }
          : { x: out, y: LANE };
    return [s, e];
  }
  if (turn === "left") {
    const mid =
      from === "S"
        ? { x: LANE, y: LANE }
        : from === "N"
          ? { x: -LANE, y: -LANE }
          : from === "E"
            ? { x: -LANE, y: -LANE }
            : { x: LANE, y: LANE };
    const e =
      from === "S"
        ? { x: -out, y: LANE }
        : from === "N"
          ? { x: out, y: -LANE }
          : from === "E"
            ? { x: -LANE, y: out }
            : { x: LANE, y: -out };
    return [s, mid, e];
  }
  const mid =
    from === "S"
      ? { x: LANE, y: -LANE }
      : from === "N"
        ? { x: -LANE, y: LANE }
        : from === "E"
          ? { x: LANE, y: -LANE }
          : { x: -LANE, y: LANE };
  const e =
    from === "S"
      ? { x: out, y: -LANE }
      : from === "N"
        ? { x: -out, y: LANE }
        : from === "E"
          ? { x: LANE, y: -out }
          : { x: -LANE, y: out };
  return [s, mid, e];
}

function carSize(kind: ActorKind): { w: number; h: number } {
  if (kind === "bus") return { w: 30, h: 58 };
  if (kind === "van") return { w: 26, h: 42 };
  if (kind === "moped") return { w: 16, h: 26 };
  if (kind === "ambulance") return { w: 26, h: 44 };
  return { w: 24, h: 40 };
}

export class DriveGame {
  canvas: HTMLCanvasElement | null = null;
  phase: Phase = "menu";
  index = 0;
  score = 0;
  scenario: Scenario = SCENARIOS[0]!;
  player: Car = this.makePlayer();
  npcs: Car[] = [];
  ped: { x: number; y: number; t: number; done: boolean } | null = null;
  stoppedHold = 0;
  hesitate = 0;
  briefT = 0;
  resultT = 0;
  shake = 0;
  time = 0;
  coachEn = "";
  coachMk = "";
  failEn = "";
  failMk = "";
  keys = new Set<string>();
  qaKeys: Set<string> | null = null;
  touch = { throttle: 0, steer: 0, brake: 0 };
  particles: { x: number; y: number; vx: number; vy: number; life: number; c: string }[] = [];
  audio = new DriveAudio();
  hudListeners = new Set<(h: Hud) => void>();
  private hudClock = 0;
  private acc = 0;
  private last = 0;
  private raf = 0;
  private running = false;

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bind();
    this.running = true;
    this.last = performance.now();
    this.loop(this.last);
    this.emit();
    this.exposeProbe();
  }

  detach() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.unbind();
    this.audio.stop();
    if (import.meta.env.DEV || new URLSearchParams(location.search).has("qa")) {
      delete window.__controlsTest;
    }
  }

  onHud(fn: (h: Hud) => void) {
    this.hudListeners.add(fn);
    fn(this.hud());
    return () => this.hudListeners.delete(fn);
  }

  startLesson() {
    this.score = 0;
    this.index = 0;
    this.audio.unlock();
    this.load(0, true);
  }

  nextScene() {
    if (this.index + 1 >= SCENARIOS.length) {
      this.phase = "complete";
      this.emit();
      return;
    }
    this.load(this.index + 1, true);
  }

  retry() {
    this.load(this.index, true);
  }

  setTouch(partial: Partial<{ throttle: number; steer: number; brake: number }>) {
    Object.assign(this.touch, partial);
  }

  private bind() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onBlur);
  }

  private unbind() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const gameKeys = new Set([
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
    ]);
    if (gameKeys.has(e.code)) e.preventDefault();
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => {
    this.keys.clear();
  };

  private exposeProbe() {
    window.__controlsTest = {
      getYaw: () => this.player.heading,
      getSpeed: () => this.player.speed,
      setSteer: (v: number) => {
        this.touch.steer = v;
      },
      setKeys: (codes: string[]) => {
        this.qaKeys = new Set(codes);
        if (this.phase === "menu" || this.phase === "complete") this.startLesson();
        if (this.phase === "brief") {
          this.phase = "drive";
          this.coachEn = this.scenario.briefEn;
          this.coachMk = this.scenario.briefMk;
          this.emit();
        }
      },
    };
  }

  private makePlayer(): Car {
    return {
      x: LANE,
      y: SPAWN + 50,
      heading: 0,
      speed: 0,
      color: "#efe6d6",
      label: "YOU",
      kind: "car",
      order: 1,
      turn: "straight",
      from: "S",
      path: pathFor("S", "straight"),
      pi: 0,
      done: false,
      waiting: false,
      flash: 0,
      ...carSize("car"),
    };
  }

  private load(i: number, brief: boolean) {
    this.index = i;
    this.scenario = SCENARIOS[i]!;
    const sc = this.scenario;
    this.player = this.makePlayer();
    this.player.turn = sc.playerTurn;
    this.player.order = sc.playerOrder;
    this.player.path = pathFor("S", sc.playerTurn);
    this.npcs = sc.npcs.map((n) => {
      const path = pathFor(n.from, n.turn);
      const start = path[0]!;
      return {
        x: start.x,
        y: start.y,
        heading: headingOf(n.from),
        speed: 0,
        color: n.color,
        label: n.label,
        kind: n.kind,
        order: n.order,
        turn: n.turn,
        from: n.from,
        path,
        pi: 0,
        done: false,
        waiting: n.order > sc.playerOrder,
        flash: 0,
        ...carSize(n.kind),
      };
    });
    this.ped = sc.pedestrian
      ? { x: 78, y: 36, t: 0, done: false }
      : null;
    this.stoppedHold = 0;
    this.hesitate = 0;
    this.briefT = 0;
    this.resultT = 0;
    this.shake = 0;
    this.time = 0;
    this.failEn = "";
    this.failMk = "";
    this.particles = [];
    this.phase = brief ? "brief" : "drive";
    this.coachEn = sc.briefEn;
    this.coachMk = sc.briefMk;
    this.emit();
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private held(code: string) {
    if (this.qaKeys) return this.qaKeys.has(code);
    return this.keys.has(code);
  }

  private actions() {
    let throttle = this.touch.throttle;
    let steer = this.touch.steer;
    let brake = this.touch.brake;
    if (this.held("KeyW") || this.held("ArrowUp")) throttle = 1;
    if (this.held("KeyS") || this.held("ArrowDown") || this.held("Space")) brake = 1;
    if (this.held("KeyA") || this.held("ArrowLeft")) steer += 1;
    if (this.held("KeyD") || this.held("ArrowRight")) steer -= 1;
    return {
      throttle: clamp(throttle, 0, 1),
      steer: clamp(steer, -1, 1),
      brake: clamp(brake, 0, 1),
    };
  }

  private step(dt: number) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 2.4);
    if (this.phase === "brief") {
      this.briefT += dt;
      const skip = this.actions().throttle > 0.4 && this.briefT > 0.35;
      if (this.briefT > 2.4 || skip) {
        this.phase = "drive";
        this.emit();
      }
      return;
    }
    if (this.phase === "pass" || this.phase === "fail") {
      this.resultT += dt;
      this.audio.setEngine(0, false);
      return;
    }
    if (this.phase !== "drive") {
      this.audio.setEngine(0, false);
      return;
    }

    const a = this.actions();
    const p = this.player;
    const nearBox = Math.abs(p.x) < 90 && Math.abs(p.y) < 130;
    const inBox = Math.abs(p.x) < HALF + 6 && Math.abs(p.y) < HALF + 6;
    const atLine = p.y > HALF - 4 && p.y < 118 && Math.abs(p.x) < 40;

    if (a.brake > 0.2) p.speed -= 280 * a.brake * dt;
    else if (a.throttle > 0) p.speed += 150 * a.throttle * dt;
    else p.speed -= 55 * dt;
    p.speed = clamp(p.speed, 0, MAX_SPEED);

    const speedF = clamp(p.speed / 90, 0, 1);
    p.heading += a.steer * TURN_RATE * (0.25 + speedF) * dt;

    if (!inBox) {
      if (Math.abs(a.steer) < 0.25) {
        p.x = lerp(p.x, LANE, 1 - Math.exp(-1.8 * dt));
        p.heading += angDiff(p.heading, 0) * (1 - Math.exp(-1.2 * dt));
      }
    } else if (p.speed > 20) {
      const target = exitHeading("S", p.turn);
      p.heading += angDiff(p.heading, target) * (1 - Math.exp(-2.4 * dt));
    }

    p.x += -Math.sin(p.heading) * p.speed * dt;
    p.y += -Math.cos(p.heading) * p.speed * dt;

    if (p.speed > 40) {
      this.particles.push({
        x: p.x + Math.sin(p.heading) * 14,
        y: p.y + Math.cos(p.heading) * 14,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 0.35,
        c: "rgba(30,32,28,0.28)",
      });
    }

    if (this.scenario.mustStop && atLine && p.speed < 8) this.stoppedHold += dt;
    if (this.scenario.mustStop && p.y < HALF - 2 && this.stoppedHold < 0.4) {
      this.fail("You must come to a full stop.", "Мора целосно да застанете.");
      return;
    }
    if (this.scenario.light === "red" && p.y < HALF - 2) {
      this.fail("Red light — do not enter the junction.", "Црвено светло — не влегувајте во крстосницата.");
      return;
    }
    if (this.scenario.light === "red" && atLine && p.speed < 10) {
      this.hesitate += dt;
      if (this.hesitate > 2.1) {
        this.pass();
        return;
      }
    }

    const blockers = this.npcs.filter((n) => n.order < p.order && !n.done);
    const pedBlocking = this.ped && !this.ped.done && this.ped.y > -20;
    if ((blockers.length > 0 || pedBlocking) && inBox && p.speed > 16) {
      this.crash();
      this.fail("You had to give way.", "Мораше да отстапите првенство.");
      return;
    }

    if (p.order === 1 && atLine && p.speed < 12 && this.scenario.light !== "red") {
      this.hesitate += dt;
      if (this.hesitate > 4.2) {
        this.fail("You had right of way — go.", "Имавте првенство — поминете.");
        return;
      }
    } else if (!(p.order === 1 && atLine && p.speed < 12)) {
      if (this.scenario.light !== "red") this.hesitate = Math.max(0, this.hesitate - dt);
    }

    this.stepNpcs(dt, inBox);
    this.stepPed(dt);

    for (const n of this.npcs) {
      if (n.done) continue;
      const dx = n.x - p.x;
      const dy = n.y - p.y;
      if (Math.hypot(dx, dy) < (n.w + p.w) * 0.62) {
        this.crash();
        this.fail("Collision — you moved at the wrong time.", "Судир — тргнавте во погрешен момент.");
        return;
      }
    }
    if (this.ped && !this.ped.done && Math.hypot(this.ped.x - p.x, this.ped.y - p.y) < 22) {
      this.crash();
      this.fail("Give way to the pedestrian.", "Пропуштете го пешакот.");
      return;
    }

    const exited =
      (p.turn === "straight" && p.y < -EXIT) ||
      (p.turn === "left" && p.x < -EXIT) ||
      (p.turn === "right" && p.x > EXIT);
    if (exited && blockers.every((n) => n.done) && (!this.ped || this.ped.done || this.ped.y < -8)) {
      this.pass();
      return;
    }

    if (Math.abs(p.x) > 520 || Math.abs(p.y) > 520) {
      this.fail("You left the lesson area.", "Излеговте од зоната на вежбата.");
      return;
    }

    this.audio.setEngine(p.speed, nearBox || p.speed > 4);
    this.coachFor(atLine, blockers.length > 0 || Boolean(pedBlocking));
    this.hudClock += dt;
    if (this.hudClock > 0.12) {
      this.hudClock = 0;
      this.emit();
    }

    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
  }

  private stepNpcs(dt: number, playerInBox: boolean) {
    const p = this.player;
    for (const n of this.npcs) {
      if (n.done) continue;
      const earlierBusy = this.npcs.some((o) => o !== n && o.order < n.order && !o.done);
      const waitForPlayer = n.order > p.order && !p.done && p.y > -HALF && !playerInBox;
      const playerBlocking = n.order > p.order && playerInBox && p.y > -20;
      n.waiting = earlierBusy || waitForPlayer || playerBlocking;
      if (n.waiting) {
        n.speed = lerp(n.speed, 0, 1 - Math.exp(-10 * dt));
        if (n.speed < 4) n.speed = 0;
        continue;
      }
      const target = n.path[Math.min(n.pi + 1, n.path.length - 1)]!;
      const dx = target.x - n.x;
      const dy = target.y - n.y;
      const dist = Math.hypot(dx, dy) || 1;
      const want = Math.atan2(-dx, -dy);
      n.heading += angDiff(n.heading, want) * (1 - Math.exp(-6 * dt));
      n.speed = lerp(n.speed, NPC_SPEED, 1 - Math.exp(-3 * dt));
      n.x += -Math.sin(n.heading) * n.speed * dt;
      n.y += -Math.cos(n.heading) * n.speed * dt;
      if (dist < 18) n.pi = Math.min(n.pi + 1, n.path.length - 1);
      if (n.pi >= n.path.length - 1 && dist < 24) n.done = true;
      n.flash += dt;
    }
  }

  private stepPed(dt: number) {
    if (!this.ped || this.ped.done) return;
    const p = this.player;
    const wait = p.order < 2 && p.y > -HALF && p.speed > 8 && Math.abs(p.x) < 90;
    if (wait) return;
    this.ped.y -= 38 * dt;
    if (this.ped.y < -48) this.ped.done = true;
  }

  private coachFor(atLine: boolean, mustWait: boolean) {
    const sc = this.scenario;
    if (mustWait && atLine) {
      this.coachEn = "Hold the brake. Let them pass.";
      this.coachMk = "Држете ја сопирачката. Пропуштете ги.";
      this.player.waiting = true;
    } else if (mustWait) {
      this.coachEn = "Slow down — you must give way.";
      this.coachMk = "Успорете — мора да отстапите првенство.";
      this.player.waiting = true;
    } else if (atLine && sc.playerOrder === 1 && sc.light !== "red") {
      this.coachEn = "Clear — your turn. Go.";
      this.coachMk = "Слободно — вашиот ред. Поминете.";
      this.player.waiting = false;
    } else if (sc.light === "red") {
      this.coachEn = "Red. Stay behind the line.";
      this.coachMk = "Црвено. Останете зад линијата.";
    } else {
      this.coachEn = sc.briefEn;
      this.coachMk = sc.briefMk;
      this.player.waiting = false;
    }
  }

  private pass() {
    this.phase = "pass";
    this.score += 1;
    this.player.done = true;
    this.player.speed = 0;
    this.audio.beep("ok");
    this.coachEn = this.scenario.ruleEn;
    this.coachMk = this.scenario.ruleMk;
    this.emit();
  }

  private fail(en: string, mk: string) {
    this.phase = "fail";
    this.failEn = en;
    this.failMk = mk;
    this.player.speed = 0;
    this.audio.beep("bad");
    this.shake = 1;
    this.emit();
  }

  private crash() {
    this.shake = 1;
    for (let i = 0; i < 18; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: (Math.random() - 0.5) * 140,
        vy: (Math.random() - 0.5) * 140,
        life: 0.5 + Math.random() * 0.4,
        c: "#c9a227",
      });
    }
  }

  hud(): Hud {
    return {
      phase: this.phase,
      index: this.index,
      total: SCENARIOS.length,
      score: this.score,
      speed: this.player.speed,
      heading: this.player.heading,
      coachEn: this.coachEn,
      coachMk: this.coachMk,
      failEn: this.failEn,
      failMk: this.failMk,
      waiting: this.player.waiting,
      yourTurn: this.phase === "drive" && this.player.order === 1 && !this.player.waiting,
    };
  }

  private emit() {
    const h = this.hud();
    this.hudListeners.forEach((fn) => fn(h));
  }

  private draw() {
    const canvas = this.canvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(280, rect.width || canvas.clientWidth || 390);
    const h = Math.max(400, rect.height || canvas.clientHeight || 700);
    const bw = Math.floor(w * dpr);
    const bh = Math.floor(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const p = this.player;
    const look = 96;
    const camX = p.x - Math.sin(p.heading) * look;
    const camY = p.y - Math.cos(p.heading) * look;
    const sx = this.shake * this.shake * (Math.random() - 0.5) * 12;
    const sy = this.shake * this.shake * (Math.random() - 0.5) * 12;

    ctx.save();
    ctx.translate(w / 2 + sx, h * 0.72 + sy);
    ctx.scale(h / VIEW_H, h / VIEW_H);
    ctx.rotate(-p.heading);
    ctx.translate(-camX, -camY);
    this.drawWorld(ctx);
    ctx.restore();
    this.drawMinimap(ctx, w, h);
  }

  private drawMinimap(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const s = Math.min(148, Math.max(112, w * 0.22));
    const x = 12;
    const y = h - s - 88;
    const sc = 0.16;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(17,20,23,0.78)";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(238,241,244,0.18)";
    ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
    ctx.beginPath();
    ctx.rect(6, 6, s - 12, s - 12);
    ctx.clip();
    ctx.translate(s / 2, s / 2);
    ctx.fillStyle = "#3a3f45";
    ctx.fillRect(-HALF * sc, -90, HALF * 2 * sc, 180);
    ctx.fillRect(-90, -HALF * sc, 180, HALF * 2 * sc);
    ctx.strokeStyle = "#d8d2c4";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-HALF * sc + 2, HALF * sc);
    ctx.lineTo(HALF * sc - 2, HALF * sc);
    ctx.stroke();
    const plot = (cx: number, cy: number, color: string, r = 4) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx * sc, cy * sc, r, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const n of this.npcs) {
      if (!n.done) plot(n.x, n.y, n.color, n.kind === "bus" ? 5 : 4);
    }
    if (this.ped && !this.ped.done) plot(this.ped.x, this.ped.y, "#efe6d6", 3);
    const p = this.player;
    ctx.save();
    ctx.translate(p.x * sc, p.y * sc);
    ctx.rotate(p.heading);
    ctx.fillStyle = "#efe6d6";
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  private drawWorld(ctx: CanvasRenderingContext2D) {
    const sc = this.scenario;
    ctx.fillStyle = "#1d241c";
    ctx.fillRect(-900, -900, 1800, 1800);
    this.drawBlocks(ctx);
    this.drawRoads(ctx);
    this.drawMarkings(ctx);
    if (sc.zebra) this.drawZebra(ctx);
    this.drawSigns(ctx);
    for (const pt of this.particles) {
      ctx.globalAlpha = clamp(pt.life * 2, 0, 0.5);
      ctx.fillStyle = pt.c;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const n of this.npcs) this.drawCar(ctx, n, false);
    if (this.ped && !this.ped.done) this.drawPed(ctx);
    this.drawCar(ctx, this.player, true);
  }

  private drawBlocks(ctx: CanvasRenderingContext2D) {
    const g = HALF + 16;
    ctx.fillStyle = "#2a3128";
    const cells = [
      [-220, -220],
      [g, -220],
      [-220, g],
      [g, g],
    ];
    for (const [x, y] of cells) {
      ctx.fillStyle = "#2a3128";
      ctx.fillRect(x, y, 204, 204);
      ctx.fillStyle = "#313831";
      ctx.fillRect(x + 22, y + 28, 64, 88);
      ctx.fillRect(x + 102, y + 22, 56, 54);
    }
  }

  private drawRoads(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#3a3f45";
    ctx.fillRect(-HALF, -820, HALF * 2, 1640);
    ctx.fillRect(-820, -HALF, 1640, HALF * 2);
    ctx.fillStyle = "#4a5056";
    ctx.fillRect(-HALF, -HALF, HALF * 2, HALF * 2);
    ctx.strokeStyle = "#2e3338";
    ctx.lineWidth = 10;
    ctx.strokeRect(-HALF - 5, -820, 10, 1640);
    ctx.strokeRect(HALF - 5, -820, 10, 1640);
    ctx.strokeRect(-820, -HALF - 5, 1640, 10);
    ctx.strokeRect(-820, HALF - 5, 1640, 10);
  }

  private drawMarkings(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "#d8d2c4";
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 16]);
    ctx.beginPath();
    ctx.moveTo(0, HALF + 8);
    ctx.lineTo(0, 800);
    ctx.moveTo(0, -HALF - 8);
    ctx.lineTo(0, -800);
    ctx.moveTo(HALF + 8, 0);
    ctx.lineTo(800, 0);
    ctx.moveTo(-HALF - 8, 0);
    ctx.lineTo(-800, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(4, HALF);
    ctx.lineTo(HALF - 4, HALF);
    ctx.moveTo(-HALF + 4, HALF);
    ctx.lineTo(-4, HALF);
    ctx.stroke();
    if (this.scenario.sign === "yield" || this.scenario.sign === "stop") {
      ctx.beginPath();
      ctx.moveTo(6, HALF + 10);
      ctx.lineTo(LANE, HALF + 28);
      ctx.lineTo(HALF - 6, HALF + 10);
      ctx.closePath();
      ctx.stroke();
    }
  }

  private drawZebra(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#e7e1d4";
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(HALF + 6, -HALF + 8 + i * 12, 18, 7);
    }
  }

  private drawSigns(ctx: CanvasRenderingContext2D) {
    const x = HALF + 22;
    const y = HALF + 36;
    this.pole(ctx, x, y, this.scenario.sign, this.scenario.light);
    if (this.scenario.sign === "yield") this.pole(ctx, -x, -HALF - 36, "priority", "off");
    if (this.scenario.sign === "priority") this.pole(ctx, -x, -HALF - 36, "yield", "off");
  }

  private pole(ctx: CanvasRenderingContext2D, x: number, y: number, sign: SignKind, light: Scenario["light"]) {
    ctx.fillStyle = "#6d7378";
    ctx.fillRect(x - 2, y - 46, 4, 52);
    if (sign === "yield") {
      ctx.save();
      ctx.translate(x, y - 52);
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(14, -12);
      ctx.lineTo(-14, -12);
      ctx.closePath();
      ctx.fillStyle = "#c43b2c";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(8, -8);
      ctx.lineTo(-8, -8);
      ctx.closePath();
      ctx.fillStyle = "#f4f1ea";
      ctx.fill();
      ctx.restore();
    } else if (sign === "stop") {
      this.octagon(ctx, x, y - 54, 15, "#b33a2b");
      ctx.fillStyle = "#f4f1ea";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("STOP", x, y - 54);
    } else if (sign === "priority") {
      ctx.save();
      ctx.translate(x, y - 54);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#111417";
      ctx.fillRect(-13, -13, 26, 26);
      ctx.fillStyle = "#e2c44d";
      ctx.fillRect(-10, -10, 20, 20);
      ctx.restore();
    } else if (sign === "lights") {
      ctx.fillStyle = "#1c1f24";
      ctx.fillRect(x - 9, y - 78, 18, 44);
      const on = light;
      const flash = on === "amber-flash" && Math.sin(this.time * 8) > 0;
      this.lamp(ctx, x, y - 68, on === "red");
      this.lamp(ctx, x, y - 56, on === "amber-flash" ? flash : false, "#d4a017");
      this.lamp(ctx, x, y - 44, on === "green", "#2f6f4e");
    }
  }

  private lamp(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean, color = "#b33a2b") {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = on ? color : "#2a2e32";
    ctx.fill();
  }

  private octagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 8) + (i * Math.PI) / 4;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#f4f1ea";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawCar(ctx: CanvasRenderingContext2D, c: Car, you: boolean) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.heading);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(-c.w / 2 + 2, -c.h / 2 + 3, c.w, c.h);
    roundRect(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 5);
    ctx.fillStyle = c.color;
    ctx.fill();
    if (c.kind === "ambulance") {
      ctx.fillStyle = "#b33a2b";
      ctx.fillRect(-c.w / 2, -6, c.w, 8);
    }
    if (c.kind === "police") {
      ctx.fillStyle = "#1c1f24";
      ctx.fillRect(-c.w / 2, -8, c.w, 5);
    }
    ctx.fillStyle = you ? "#8aa0b8" : "#1c1f24";
    roundRect(ctx, -c.w / 2 + 3, -c.h / 2 + 6, c.w - 6, c.h * 0.34, 3);
    ctx.fill();
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(-c.w / 2 + 3, -c.h / 2 + 2, 5, 3);
    ctx.fillRect(c.w / 2 - 8, -c.h / 2 + 2, 5, 3);
    ctx.fillStyle = c.speed < 12 && this.phase === "drive" ? "#b33a2b" : "#6a3030";
    ctx.fillRect(-c.w / 2 + 3, c.h / 2 - 4, 5, 3);
    ctx.fillRect(c.w / 2 - 8, c.h / 2 - 4, 5, 3);
    if (c.kind === "ambulance" && Math.sin(this.time * 14) > 0) {
      ctx.fillStyle = "#3d6ea8";
      ctx.fillRect(-6, -c.h / 2 - 4, 5, 4);
      ctx.fillStyle = "#b33a2b";
      ctx.fillRect(1, -c.h / 2 - 4, 5, 4);
    }
    const badge = you ? "YOU" : c.label;
    ctx.fillStyle = "#111417";
    ctx.beginPath();
    ctx.arc(0, 6, you ? 9 : 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4f1ea";
    ctx.font = you ? "bold 6px sans-serif" : "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badge, 0, 6.5);
    ctx.restore();
  }

  private drawPed(ctx: CanvasRenderingContext2D) {
    const ped = this.ped!;
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.fillStyle = "#1c1f24";
    ctx.beginPath();
    ctx.arc(0, 2, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#efe6d6";
    ctx.beginPath();
    ctx.arc(0, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setSteer?: (v: number) => void;
      setKeys?: (codes: string[]) => void;
    };
  }
}
