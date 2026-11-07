// Synthesised ocean ambience: filtered noise with slow swell LFO + occasional drips.
export class WaterAudio {
  ctx: AudioContext | null = null; master!: GainNode; lp!: BiquadFilterNode; on = false; drip?: number;
  start() {
    const ctx = (this.ctx = new AudioContext());
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "lowpass"; bp.frequency.value = 900;
    const swell = ctx.createGain(); swell.gain.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12; const lg = ctx.createGain(); lg.gain.value = 0.4;
    lfo.connect(lg).connect(swell.gain); lfo.start();
    this.lp = ctx.createBiquadFilter(); this.lp.type = "lowpass"; this.lp.frequency.value = 18000;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    src.connect(bp).connect(swell).connect(this.lp).connect(this.master).connect(ctx.destination); src.start();
    this.drip = window.setInterval(() => this.on && Math.random() < 0.5 && this.plink(), 900);
  }
  plink() { const c = this.ctx!, o = c.createOscillator(), g = c.createGain(), f = 900 + Math.random() * 1400;
    o.frequency.setValueAtTime(f, c.currentTime); o.frequency.exponentialRampToValueAtTime(f * 2.2, c.currentTime + 0.08);
    g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
    o.connect(g).connect(this.lp); o.start(); o.stop(c.currentTime + 0.3); }
  toggle() { if (!this.ctx) this.start(); this.ctx!.resume(); this.on = !this.on;
    this.master.gain.setTargetAtTime(this.on ? 0.5 : 0, this.ctx!.currentTime, 0.6); return this.on; }
  muffle(v: boolean) { if (this.ctx) this.lp.frequency.setTargetAtTime(v ? 400 : 18000, this.ctx.currentTime, 0.4); }
}
