import manifest from "./voice-manifest.json";

/* =====================================================================
 * Audio engine: three channels (voice, effects, music) + master mute.
 * - Voice uses pre-generated natural recordings (see voice-manifest.json);
 *   only phrases without a recording fall back to the browser voice.
 * - Only one narration and one animal sound play at a time.
 * - A compressor on the output keeps everything at a gentle level.
 * ===================================================================== */

type Manifest = { pt: Record<string, string>; en: Record<string, string>; animals: Record<string, string> };
const M = manifest as Manifest;

export type AudioSettings = { muted: boolean; voice: number; fx: number; music: number; musicOn: boolean };

const STORAGE_KEY = "toca-toca-audio-v2";

export const settings: AudioSettings = { muted: false, voice: 1, fx: 0.7, music: 0.2, musicOn: true };

const listeners = new Set<() => void>();
export function subscribeSettings(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function notify() {
  listeners.forEach((l) => l());
}

export function loadSettings() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(settings, JSON.parse(raw) as Partial<AudioSettings>);
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

/* ---------------- graph ---------------- */
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let fxGain: GainNode | null = null;
let voiceGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let speaking = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 6;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    out = ctx.createGain();
    comp.connect(out).connect(ctx.destination);
    fxGain = ctx.createGain();
    voiceGain = ctx.createGain();
    musicGain = ctx.createGain();
    fxGain.connect(comp);
    voiceGain.connect(comp);
    musicGain.connect(comp);
    applyVolume();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function musicLevel() {
  if (!settings.musicOn) return 0;
  return settings.music * 0.35 * (speaking ? 0.35 : 1);
}

function applyVolume() {
  if (!ctx) return;
  const t = ctx.currentTime;
  out?.gain.setTargetAtTime(settings.muted ? 0 : 0.9, t, 0.03);
  fxGain?.gain.setTargetAtTime(settings.fx * 0.8, t, 0.03);
  voiceGain?.gain.setTargetAtTime(settings.voice, t, 0.03);
  musicGain?.gain.setTargetAtTime(musicLevel(), t, 0.25);
}

export function setMuted(on: boolean) {
  settings.muted = on;
  getCtx();
  applyVolume();
  if (on) stopVoice();
  persist();
  notify();
}
export function setChannel(ch: "voice" | "fx" | "music", v: number) {
  settings[ch] = Math.max(0, Math.min(1, v));
  applyVolume();
  persist();
  notify();
}
export function setMusicOn(on: boolean) {
  settings.musicOn = on;
  getCtx();
  applyVolume();
  if (on) startMusic();
  persist();
  notify();
}

export function unlockAudio() {
  getCtx();
  applyVolume();
  if (settings.musicOn) startMusic();
  preload();
}

/* ---------------- sample loading ---------------- */
const buffers = new Map<string, Promise<AudioBuffer | null>>();
function load(url: string): Promise<AudioBuffer | null> {
  const c = getCtx();
  if (!c) return Promise.resolve(null);
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => c.decodeAudioData(b))
      .catch(() => null);
    buffers.set(url, p);
  }
  return p;
}

let preloaded = false;
function preload() {
  if (preloaded) return;
  preloaded = true;
  const urls = [...Object.values(M.animals), ...Object.values(M.pt).slice(0, 40)];
  let i = 0;
  const next = () => {
    const u = urls[i++];
    if (!u) return;
    void load(u).then(next);
  };
  next();
  next();
}

function playBuffer(buf: AudioBuffer, dest: AudioNode, gain = 1) {
  const c = getCtx();
  if (!c) return null;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g).connect(dest);
  src.start();
  return src;
}

/* ---------------- voice ---------------- */
export type SpeechPart = string | { en: string };

export const voiceKey = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

let voiceToken = 0;
let voiceSrc: AudioBufferSourceNode | null = null;
let lastSig = "";
let lastAt = 0;

function setSpeaking(on: boolean) {
  speaking = on;
  applyVolume();
}

function stopVoice() {
  voiceToken++;
  try {
    voiceSrc?.stop();
  } catch {
    /* ignore */
  }
  voiceSrc = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  setSpeaking(false);
}

function fallbackSpeak(text: string, en: boolean, token: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || token !== voiceToken) return resolve();
    if (import.meta.env.DEV) console.debug("[voice] sem gravação:", en ? "en" : "pt", text);
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = en ? "en-US" : "pt-BR";
      const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith(en ? "en" : "pt"));
      if (v) u.voice = v;
      u.rate = 0.9;
      u.pitch = 1.2;
      u.volume = Math.min(1, settings.voice * 0.9);
      const done = () => resolve();
      u.onend = done;
      u.onerror = done;
      window.setTimeout(done, 4000);
      window.speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });
}

async function sayPart(part: SpeechPart, token: number) {
  const en = typeof part !== "string";
  const text = en ? part.en : part;
  if (!text) return;
  const url = (en ? M.en : M.pt)[voiceKey(text)];
  if (!url) return fallbackSpeak(text, en, token);
  const buf = await load(url);
  if (token !== voiceToken) return;
  if (!buf || !voiceGain) return fallbackSpeak(text, en, token);
  await new Promise<void>((resolve) => {
    const src = playBuffer(buf, voiceGain!);
    if (!src) return resolve();
    voiceSrc = src;
    src.onended = () => resolve();
  });
}

/**
 * Narrate one or more parts in order (a string is Portuguese, `{ en }` is English).
 * Starting a new narration stops the previous one; an identical request within
 * 1.5 s is ignored. Resolves true when it finished without being interrupted.
 */
export function speak(...parts: SpeechPart[]): Promise<boolean> {
  if (typeof window === "undefined" || settings.muted || settings.voice <= 0) return Promise.resolve(false);
  const sig = JSON.stringify(parts);
  const now = Date.now();
  if (sig === lastSig && now - lastAt < 1500) return Promise.resolve(false);
  lastSig = sig;
  lastAt = now;
  getCtx();
  stopVoice();
  const token = voiceToken;
  setSpeaking(true);
  return (async () => {
    for (const p of parts) {
      if (token !== voiceToken) return false;
      await sayPart(p, token);
      if (parts.length > 1) await new Promise((r) => window.setTimeout(r, 120));
    }
    if (token !== voiceToken) return false;
    setSpeaking(false);
    return true;
  })();
}

export function speakEn(text: string) {
  return speak({ en: text });
}

/* ---------------- synth effects ---------------- */
type ToneOpts = {
  freq: number;
  to?: number;
  duration?: number;
  type?: OscillatorType;
  delay?: number;
  gain?: number;
  vibrato?: number;
};

export function tone({ freq, to, duration = 0.28, type = "sine", delay = 0, gain = 0.2, vibrato }: ToneOpts) {
  const c = getCtx();
  if (!c || !fxGain || settings.muted) return;
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
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(fxGain);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playTone(freq: number, duration = 0.28, type: OscillatorType = "sine", delay = 0) {
  tone({ freq, duration, type, delay });
}

export function playMelody(notes: number[], step = 0.13, type: OscillatorType = "triangle", gain = 0.16) {
  notes.forEach((n, i) => tone({ freq: n, duration: step * 1.6, type, delay: i * step, gain }));
}

function noise(duration = 0.3, delay = 0, gain = 0.1, freq = 700, type: BiquadFilterType = "lowpass") {
  const c = getCtx();
  if (!c || !fxGain || settings.muted) return;
  const t0 = c.currentTime + delay;
  const frames = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 3);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(fxGain);
  src.start(t0);
}

/** Avoid the same effect stacking up when a child taps very fast. */
const lastFx = new Map<string, number>();
const once = (name: string, gap: number, fn: () => void) => () => {
  const now = Date.now();
  if (now - (lastFx.get(name) ?? 0) < gap) return;
  lastFx.set(name, now);
  fn();
};

export const sounds = {
  /** bubble pop */
  pop: once("pop", 60, () => {
    tone({ freq: 380, to: 1400, duration: 0.09, type: "sine", gain: 0.22 });
    noise(0.05, 0, 0.05, 3000, "highpass");
  }),
  /** balloon pop: airy burst */
  balloon: once("balloon", 60, () => {
    noise(0.18, 0, 0.16, 1800, "bandpass");
    tone({ freq: 700, to: 160, duration: 0.12, type: "triangle", gain: 0.1 });
  }),
  tap: once("tap", 60, () => tone({ freq: 520, duration: 0.1, type: "triangle", gain: 0.14 })),
  swipe: once("swipe", 120, () => noise(0.22, 0, 0.05, 1200, "bandpass")),
  /** drag-and-fit click */
  snap: once("snap", 100, () => {
    tone({ freq: 1200, to: 800, duration: 0.05, type: "square", gain: 0.06 });
    tone({ freq: 660, duration: 0.14, type: "sine", delay: 0.05, gain: 0.18 });
    tone({ freq: 990, duration: 0.18, type: "sine", delay: 0.1, gain: 0.12 });
  }),
  /** correct answer: soft bells */
  yay: once("yay", 400, () => playMelody([659, 784, 1046], 0.1, "sine", 0.16)),
  /** end of an activity */
  cheer: once("cheer", 800, () => {
    playMelody([523, 659, 784, 1046, 1318], 0.1, "sine", 0.15);
    tone({ freq: 2093, duration: 0.5, type: "sine", delay: 0.5, gain: 0.05 });
  }),
  /** "not that one" - playful, never negative */
  gentle: once("gentle", 300, () => tone({ freq: 330, to: 440, duration: 0.18, type: "sine", gain: 0.12 })),
  /** star / magic */
  sparkle: once("sparkle", 200, () => playMelody([1568, 1976, 2349, 3136], 0.06, "sine", 0.07)),
  /** open box: pop + surprise */
  box: once("box", 300, () => {
    tone({ freq: 300, to: 900, duration: 0.12, type: "sine", gain: 0.2 });
    playMelody([784, 988, 1175, 1568], 0.07, "triangle", 0.1);
  }),
  /** between activities */
  transition: once("transition", 500, () => {
    noise(0.4, 0, 0.03, 900, "bandpass");
    tone({ freq: 440, to: 880, duration: 0.35, type: "sine", gain: 0.06 });
  }),
};

/* ---------------- animals ---------------- */
const ANIMAL_FILE: Record<string, string> = {
  cachorro: "dog",
  gato: "cat",
  vaca: "cow",
  pato: "duck",
  passarinho: "bird",
  sapo: "frog",
  ovelha: "sheep",
};

/** Synthesized, deliberately soft sounds for animals without a recording. */
export const animalSounds: Record<string, () => void> = {
  leao: () => {
    tone({ freq: 150, to: 95, duration: 0.7, type: "triangle", gain: 0.14, vibrato: 10 });
    noise(0.6, 0, 0.04, 350);
  },
  elefante: () => tone({ freq: 260, to: 560, duration: 0.6, type: "triangle", gain: 0.12, vibrato: 6 }),
  peixe: () => {
    tone({ freq: 700, to: 1300, duration: 0.1, type: "sine", gain: 0.1 });
    tone({ freq: 850, to: 1500, duration: 0.1, type: "sine", delay: 0.16, gain: 0.1 });
  },
  macaco: () => {
    [0, 0.14, 0.28].forEach((d) => tone({ freq: 700, to: 1100, duration: 0.12, type: "triangle", delay: d, gain: 0.12 }));
  },
};

let animalSrc: AudioBufferSourceNode | null = null;
let lastAnimalAt = 0;

/** Play the animal's own sound. Only one animal sound at a time. */
export async function playAnimalSound(id: string) {
  const now = Date.now();
  if (now - lastAnimalAt < 500) return;
  lastAnimalAt = now;
  const file = ANIMAL_FILE[id];
  const url = file ? M.animals[file] : undefined;
  if (url && fxGain) {
    const buf = await load(url);
    if (buf && fxGain && !settings.muted) {
      try {
        animalSrc?.stop();
      } catch {
        /* ignore */
      }
      animalSrc = playBuffer(buf, fxGain, 0.9);
      return;
    }
  }
  const fn = animalSounds[id];
  if (fn) fn();
  else sounds.pop();
}

export const thingSounds: Record<string, () => void> = {
  carro: () => {
    tone({ freq: 520, duration: 0.14, type: "triangle", gain: 0.12 });
    tone({ freq: 520, duration: 0.2, type: "triangle", delay: 0.2, gain: 0.12 });
  },
  onibus: () => tone({ freq: 294, duration: 0.45, type: "triangle", gain: 0.12 }),
  aviao: () => noise(1, 0, 0.05, 700, "bandpass"),
  barco: () => tone({ freq: 196, duration: 0.8, type: "triangle", gain: 0.14 }),
  trem: () => {
    tone({ freq: 600, duration: 0.25, type: "triangle", gain: 0.12 });
    tone({ freq: 750, duration: 0.4, type: "triangle", delay: 0.28, gain: 0.12 });
  },
  bola: () => tone({ freq: 300, to: 150, duration: 0.15, type: "sine", gain: 0.2 }),
  boneca: () => playMelody([784, 988, 1175], 0.12, "sine"),
  ursinho: () => tone({ freq: 250, to: 200, duration: 0.4, type: "triangle", vibrato: 5, gain: 0.14 }),
  blocos: () => {
    tone({ freq: 500, duration: 0.07, type: "square", gain: 0.06 });
    tone({ freq: 400, duration: 0.07, type: "square", delay: 0.12, gain: 0.06 });
  },
};

/* ---------------- calm ambient music (original, several themes) ---------------- */
const THEMES: { notes: number[]; step: number; wave: OscillatorType }[] = [
  { notes: [523, 659, 784, 659, 587, 698, 880, 698], step: 2.2, wave: "sine" },
  { notes: [392, 494, 587, 494, 440, 523, 659, 523], step: 2.6, wave: "triangle" },
  { notes: [659, 587, 523, 587, 659, 784, 659, 523], step: 2.4, wave: "sine" },
];
let theme = 0;
let musicStep = 0;
let musicTimer: number | null = null;

function musicTick() {
  const c = getCtx();
  if (!c || !musicGain || !settings.musicOn || settings.muted) return;
  const th = THEMES[theme % THEMES.length]!;
  const base = th.notes[musicStep % th.notes.length]!;
  [base, base / 2].forEach((f, i) => {
    const t0 = c.currentTime + i * 0.03;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = th.wave;
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(i === 0 ? 0.35 : 0.25, t0 + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + th.step);
    osc.connect(g).connect(musicGain!);
    osc.start(t0);
    osc.stop(t0 + th.step + 0.1);
  });
  musicStep++;
  // a short breath of silence every 8 notes so it never feels constant
  const wait = musicStep % 8 === 0 ? th.step * 2.5 : th.step;
  musicTimer = window.setTimeout(musicTick, wait * 1000);
}

export function startMusic() {
  if (typeof window === "undefined" || musicTimer !== null) return;
  musicTick();
}
export function stopMusic() {
  if (musicTimer !== null) {
    window.clearTimeout(musicTimer);
    musicTimer = null;
  }
}
/** Change to another calm theme (called between rounds). */
export function nextMusicTheme() {
  theme = (theme + 1) % THEMES.length;
  musicStep = 0;
}
