let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicTimer: number | null = null;

type Settings = { sound: boolean; music: boolean; volume: number };

const STORAGE_KEY = "toca-toca-settings";

export const settings: Settings = { sound: true, music: true, volume: 0.7 };

const listeners = new Set<() => void>();

export function subscribeSettings(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((l) => l());
}

export function loadSettings() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(settings, JSON.parse(raw) as Partial<Settings>);
  } catch {
    /* ignore */
  }
  applyVolume();
  notify();
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = settings.sound ? settings.volume : 0;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = settings.music && settings.sound ? settings.volume * 0.12 : 0;
    musicGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function applyVolume() {
  if (master) master.gain.value = settings.sound ? settings.volume : 0;
  if (musicGain) musicGain.gain.value = settings.music && settings.sound ? settings.volume * 0.12 : 0;
}

export function setSound(on: boolean) {
  settings.sound = on;
  getCtx();
  applyVolume();
  persist();
  notify();
  if (!on) window.speechSynthesis?.cancel();
}

export function setMusic(on: boolean) {
  settings.music = on;
  getCtx();
  applyVolume();
  if (on) startMusic();
  persist();
  notify();
}

export function setVolume(v: number) {
  settings.volume = v;
  applyVolume();
  persist();
  notify();
}

export function unlockAudio() {
  getCtx();
  applyVolume();
  if (settings.music) startMusic();
}

type ToneOpts = {
  freq: number;
  to?: number;
  duration?: number;
  type?: OscillatorType;
  delay?: number;
  gain?: number;
  vibrato?: number;
};

export function tone({
  freq,
  to,
  duration = 0.28,
  type = "sine",
  delay = 0,
  gain = 0.25,
  vibrato,
}: ToneOpts) {
  const c = getCtx();
  if (!c || !master || !settings.sound) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + duration);
  if (vibrato) {
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = vibrato;
    lfoGain.gain.value = freq * 0.06;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + duration + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playTone(freq: number, duration = 0.28, type: OscillatorType = "sine", delay = 0) {
  tone({ freq, duration, type, delay });
}

export function playMelody(notes: number[], step = 0.13, type: OscillatorType = "triangle") {
  notes.forEach((n, i) => tone({ freq: n, duration: step * 1.6, type, delay: i * step }));
}

function noise(duration = 0.3, delay = 0, gain = 0.12, freq = 700) {
  const c = getCtx();
  if (!c || !master || !settings.sound) return;
  const t0 = c.currentTime + delay;
  const frames = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
}

export const sounds = {
  pop: () => tone({ freq: 520, to: 900, duration: 0.16, type: "sine" }),
  tap: () => tone({ freq: 440, duration: 0.12, type: "triangle" }),
  swipe: () => tone({ freq: 300, to: 900, duration: 0.25, type: "sine", gain: 0.15 }),
  snap: () => {
    tone({ freq: 700, duration: 0.1, type: "square", gain: 0.15 });
    tone({ freq: 1046, duration: 0.18, type: "sine", delay: 0.08 });
  },
  yay: () => playMelody([523, 659, 784, 1046]),
  cheer: () => {
    playMelody([523, 659, 784, 1046, 1318], 0.11);
    noise(0.5, 0.1, 0.06, 2500);
  },
  gentle: () => playMelody([392, 440], 0.14, "sine"),
  sparkle: () => playMelody([1318, 1568, 2093], 0.07, "sine"),
};

export const animalSounds: Record<string, () => void> = {
  cachorro: () => {
    tone({ freq: 320, to: 180, duration: 0.16, type: "sawtooth", gain: 0.2 });
    tone({ freq: 300, to: 170, duration: 0.16, type: "sawtooth", delay: 0.22, gain: 0.2 });
  },
  gato: () => tone({ freq: 500, to: 760, duration: 0.5, type: "sawtooth", gain: 0.14, vibrato: 7 }),
  vaca: () => tone({ freq: 160, to: 110, duration: 0.9, type: "sawtooth", gain: 0.16 }),
  pato: () => {
    tone({ freq: 420, to: 320, duration: 0.12, type: "square", gain: 0.14 });
    tone({ freq: 420, to: 300, duration: 0.12, type: "square", delay: 0.18, gain: 0.14 });
  },
  leao: () => {
    tone({ freq: 120, to: 70, duration: 0.8, type: "sawtooth", gain: 0.18, vibrato: 12 });
    noise(0.7, 0, 0.1, 400);
  },
  elefante: () => tone({ freq: 240, to: 620, duration: 0.7, type: "square", gain: 0.13 }),
  passarinho: () => {
    tone({ freq: 1400, to: 2100, duration: 0.1, type: "sine", gain: 0.12 });
    tone({ freq: 1600, to: 2400, duration: 0.1, type: "sine", delay: 0.15, gain: 0.12 });
    tone({ freq: 1500, to: 2000, duration: 0.1, type: "sine", delay: 0.3, gain: 0.12 });
  },
  peixe: () => {
    tone({ freq: 800, to: 1400, duration: 0.12, type: "sine", gain: 0.1 });
    tone({ freq: 900, to: 1500, duration: 0.12, type: "sine", delay: 0.16, gain: 0.1 });
  },
  ovelha: () => tone({ freq: 380, to: 340, duration: 0.7, type: "sawtooth", gain: 0.13, vibrato: 18 }),
};

/* ---------- gentle ambient music ---------- */
const MUSIC_NOTES = [523, 587, 659, 784, 880, 784, 659, 587];
let musicStep = 0;

function musicTick() {
  const c = getCtx();
  if (!c || !musicGain || !settings.music || !settings.sound) return;
  const base = MUSIC_NOTES[musicStep % MUSIC_NOTES.length]!;
  [base, base / 2].forEach((f, i) => {
    const t0 = c.currentTime + i * 0.02;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    osc.connect(g).connect(musicGain!);
    osc.start(t0);
    osc.stop(t0 + 1.7);
  });
  musicStep++;
}

export function startMusic() {
  if (typeof window === "undefined") return;
  if (musicTimer !== null) return;
  musicTick();
  musicTimer = window.setInterval(musicTick, 1700);
}

export function stopMusic() {
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!settings.sound) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = 0.9;
    u.pitch = 1.4;
    u.volume = settings.volume;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
