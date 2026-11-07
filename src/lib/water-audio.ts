// Ocean ambience. If RECORDING_URL is set, a real looping recording is used;
// otherwise a synthesised swell (filtered noise + drips) plays as fallback.
export const RECORDING_URL: string | null = null;

export class WaterAudio {
  ctx: AudioContext | null = null; master!: GainNode; lp!: BiquadFilterNode; on = false; volume = 0.6;
  start() {
    const ctx = (this.ctx = new AudioContext());
    this.lp = ctx.createBiquadFilter(); this.lp.type = "lowpass"; this.lp.frequency.value = 18000;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    this.lp.connect(this.master).connect(ctx.destination);
    if (RECORDING_URL) {
      const el = new Audio(RECORDING_URL); el.loop = true; el.crossOrigin = "anonymous";
      ctx.createMediaElementSource(el).connect(this.lp); el.play().catch(() => {});
    } else this.synth();
  }
  synth() {
    const ctx = this.ctx!, len = ctx.sampleRate * 4, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; } }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "lowpass"; bp.frequency.value = 900;
    const swell = ctx.createGain(); swell.gain.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12; const lg = ctx.createGain(); lg.gain.value = 0.4;
    lfo.connect(lg).connect(swell.gain); lfo.start();
    src.connect(bp).connect(swell).connect(this.lp); src.start();
    window.setInterval(() => this.on && Math.random() < 0.5 && this.plink(), 900);
  }
  plink() { const c = this.ctx!, o = c.createOscillator(), g = c.createGain(), f = 900 + Math.random() * 1400;
    o.frequency.setValueAtTime(f, c.currentTime); o.frequency.exponentialRampToValueAtTime(f * 2.2, c.currentTime + 0.08);
    g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
    o.connect(g).connect(this.lp); o.start(); o.stop(c.currentTime + 0.3); }
  private apply() { if (this.ctx) this.master.gain.setTargetAtTime(this.on ? this.volume : 0, this.ctx.currentTime, 0.4); }
  toggle() { if (!this.ctx) this.start(); this.ctx!.resume(); this.on = !this.on; this.apply(); return this.on; }
  setVolume(v: number) { this.volume = v; this.apply(); }
  muffle(v: boolean) { if (this.ctx) this.lp.frequency.setTargetAtTime(v ? 400 : 18000, this.ctx.currentTime, 0.4); }
}
