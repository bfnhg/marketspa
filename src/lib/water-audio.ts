// Original lo-fi instrumental generated with Web Audio; no prerecorded song.
export const RECORDING_URL: string | null = null;

export class WaterAudio {
  ctx: AudioContext | null = null; master!: GainNode; lp!: BiquadFilterNode; on = false; volume = 0.6;
  private musicTimer: number | null = null;
  private beat = 0;
  start() {
    if (this.ctx) return;
    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) throw new Error("Web Audio is not supported by this browser");
    const ctx = (this.ctx = new AudioContextConstructor());
    this.lp = ctx.createBiquadFilter(); this.lp.type = "lowpass"; this.lp.frequency.value = 18000;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    this.lp.connect(this.master).connect(ctx.destination);
    if (RECORDING_URL) {
      const el = new Audio(RECORDING_URL); el.loop = true; el.crossOrigin = "anonymous";
      ctx.createMediaElementSource(el).connect(this.lp);
      void el.play().catch((error: unknown) => console.error("Unable to play the water recording", error));
    } else this.synth();
  }
  synth() {
    const ctx = this.ctx!, len = ctx.sampleRate * 4, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.35;
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "lowpass"; bp.frequency.value = 1800;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900;
    const texture = ctx.createGain(); texture.gain.value = 0.025;
    src.connect(hp).connect(bp).connect(texture).connect(this.lp); src.start();
    this.musicTimer = window.setInterval(() => {
      if (!this.on) return;
      this.playBeat();
      this.beat = (this.beat + 1) % 16;
    }, 600);
  }
  private playBeat() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const beatInBar = this.beat % 4;
    const chord = [
      [146.83, 174.61, 220, 261.63],
      [130.81, 164.81, 196, 246.94],
      [98, 130.81, 164.81, 196],
      [110, 130.81, 164.81, 220],
    ][Math.floor(this.beat / 4)];

    if (beatInBar === 0) {
      for (const frequency of chord) this.playPad(frequency, now);
    }
    if (beatInBar === 0 || beatInBar === 2) this.playKick(now);
    if (beatInBar === 1 || beatInBar === 3) this.playSnare(now);
    this.playHat(now, beatInBar === 1 || beatInBar === 3 ? 0.018 : 0.009);

    if (this.beat % 4 === 2 && Math.random() > 0.35) {
      const melody = [392, 440, 523.25, 587.33, 659.25];
      this.playPad(melody[Math.floor(Math.random() * melody.length)], now, 0.45);
    }
  }
  private playPad(frequency: number, now: number, duration = 1.9) {
    const ctx = this.ctx!;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.018, now + 0.12);
    gain.gain.setTargetAtTime(0.0001, now + duration * 0.55, duration * 0.18);
    oscillator.connect(gain).connect(this.lp);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
  private playKick(now: number) {
    const oscillator = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(105, now);
    oscillator.frequency.exponentialRampToValueAtTime(48, now + 0.16);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.connect(gain).connect(this.lp);
    oscillator.start(now);
    oscillator.stop(now + 0.23);
  }
  private playSnare(now: number) {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * 0.14);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 0.8;
    gain.gain.value = 0.045;
    source.connect(filter).connect(gain).connect(this.lp);
    source.start(now);
    source.stop(now + 0.15);
  }
  private playHat(now: number, amplitude: number) {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * 0.045);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 6500;
    gain.gain.value = amplitude;
    source.connect(filter).connect(gain).connect(this.lp);
    source.start(now);
    source.stop(now + 0.05);
  }
  private apply() { if (this.ctx) this.master.gain.setTargetAtTime(this.on ? this.volume : 0, this.ctx.currentTime, 0.4); }
  async enable() {
    if (!this.ctx) this.start();
    const wasOff = !this.on;
    this.on = true;
    this.apply();
    try {
      await this.ctx!.resume();
      if (this.ctx!.state !== "running") throw new Error("The audio context did not start");
      if (wasOff && this.on) {
        this.beat = 0;
        this.playBeat();
        this.beat = 1;
      }
    } catch (error) {
      if (this.on) {
        this.on = false;
        this.apply();
      }
      throw error;
    }
    return this.on;
  }
  async toggle() {
    if (this.on) {
      this.on = false;
      this.apply();
      return this.on;
    }
    return this.enable();
  }
  setVolume(v: number) { this.volume = v; this.apply(); }
  muffle(v: boolean) { if (this.ctx) this.lp.frequency.setTargetAtTime(v ? 400 : 18000, this.ctx.currentTime, 0.4); }
  dispose() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.on = false;
  }
}
