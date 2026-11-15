// Soft lounge instrumental generated with Web Audio; no prerecorded song.
export const RECORDING_URL: string | null = null;

export class WaterAudio {
  ctx: AudioContext | null = null;
  master!: GainNode;
  lp!: BiquadFilterNode;
  on = false;
  volume = 0.6;
  private musicTimer: number | null = null;
  private beat = 0;
  start() {
    if (this.ctx) return;
    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) throw new Error("Web Audio is not supported by this browser");
    const ctx = (this.ctx = new AudioContextConstructor());
    this.lp = ctx.createBiquadFilter();
    this.lp.type = "lowpass";
    this.lp.frequency.value = 5200;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.28;
    const echo = ctx.createGain();
    echo.gain.value = 0.14;
    this.lp.connect(this.master).connect(ctx.destination);
    this.lp.connect(delay);
    delay.connect(echo).connect(delay);
    delay.connect(this.master);
    if (RECORDING_URL) {
      const el = new Audio(RECORDING_URL);
      el.loop = true;
      el.crossOrigin = "anonymous";
      ctx.createMediaElementSource(el).connect(this.lp);
      void el
        .play()
        .catch((error: unknown) => console.error("Unable to play the water recording", error));
    } else this.synth();
  }
  synth() {
    this.musicTimer = window.setInterval(() => {
      if (!this.on) return;
      this.playBeat();
      this.beat = (this.beat + 1) % 16;
    }, 790);
  }
  private playBeat() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const beatInBar = this.beat % 4;
    const progression = [
      { bass: 73.42, notes: [146.83, 174.61, 220, 261.63, 329.63] },
      { bass: 98, notes: [146.83, 164.81, 174.61, 220, 293.66] },
      { bass: 65.41, notes: [130.81, 164.81, 196, 246.94, 293.66] },
      { bass: 55, notes: [110, 130.81, 164.81, 196, 246.94] },
    ][Math.floor(this.beat / 4)];

    if (beatInBar === 0 && progression) {
      this.playPad(progression.bass, now, 3.5, 0.007);
      for (const frequency of progression.notes) this.playPad(frequency, now, 3.6, 0.0045);
    }
    const melody = [
      null,
      null,
      null,
      523.25,
      null,
      null,
      null,
      493.88,
      null,
      null,
      440,
      null,
      392,
      null,
      440,
      null,
      null,
    ];
    const note = melody[this.beat];
    if (note != null) this.playPad(note, now, 1.7, 0.007);
  }
  private playPad(frequency: number, now: number, duration = 2.8, level = 0.01) {
    const ctx = this.ctx!;
    const oscillator = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    const gain = ctx.createGain();
    oscillator.type = "triangle";
    overtone.type = "sine";
    oscillator.frequency.value = frequency;
    overtone.frequency.value = frequency * 2;
    overtoneGain.gain.value = 0.16;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.035);
    gain.gain.setTargetAtTime(0.0001, now + 0.12, duration * 0.42);
    oscillator.connect(gain).connect(this.lp);
    overtone.connect(overtoneGain).connect(gain);
    oscillator.start(now);
    overtone.start(now);
    oscillator.stop(now + duration);
    overtone.stop(now + duration);
  }
  private apply() {
    if (this.ctx)
      this.master.gain.setTargetAtTime(this.on ? this.volume : 0, this.ctx.currentTime, 0.4);
  }
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
  setVolume(v: number) {
    this.volume = v;
    this.apply();
  }
  muffle(v: boolean) {
    if (this.ctx) this.lp.frequency.setTargetAtTime(v ? 400 : 5200, this.ctx.currentTime, 0.4);
  }
  dispose() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.on = false;
  }
}
