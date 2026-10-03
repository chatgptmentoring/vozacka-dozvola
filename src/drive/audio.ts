export class DriveAudio {
  private ctx: AudioContext | null = null;
  private engine: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  muted = false;

  unlock() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 48;
    filter.type = "lowpass";
    filter.frequency.value = 280;
    gain.gain.value = 0;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    this.engine = osc;
    this.filter = filter;
    this.gain = gain;
  }

  setEngine(speed: number, driving: boolean) {
    if (!this.ctx || !this.engine || !this.gain || !this.filter || this.muted) return;
    const t = this.ctx.currentTime;
    const n = Math.min(1, speed / 210);
    this.engine.frequency.setTargetAtTime(46 + n * 90, t, 0.08);
    this.filter.frequency.setTargetAtTime(240 + n * 420, t, 0.08);
    this.gain.gain.setTargetAtTime(driving ? 0.012 + n * 0.028 : 0, t, 0.12);
  }

  beep(kind: "ok" | "bad" | "tick" | "horn") {
    if (!this.ctx || this.muted) return;
    void this.ctx.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.ctx.destination);
    if (kind === "ok") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(740, t + 0.16);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.start(t);
      osc.stop(t + 0.3);
    } else if (kind === "bad") {
      osc.type = "square";
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.35);
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.42);
    } else if (kind === "horn") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(310, t);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.24);
    } else {
      osc.type = "square";
      osc.frequency.value = 880;
      g.gain.setValueAtTime(0.03, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  stop() {
    this.setEngine(0, false);
  }
}
