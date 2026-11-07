import manifest from "./voice-manifest.json";

/* =====================================================================
 * Audio engine: three channels (voice, effects, music) + master mute.
 * - Voice uses pre-generated natural recordings (see voice-manifest.json);
 *   only phrases without a recording fall back to the browser voice.
 * - Only one narration and one animal sound play at a time.
 * - A compressor on the output keeps everything at a gentle level.
 * ===================================================================== */

type Manifest = { pt: Record<string, string[]>; en: Record<string, string[]>; animals: Record<string, string> };
const M = manifest as unknown as Manifest;
const lastTake: Record<string, string> = {};
function pickTake(list: string[] | undefined, k: string): string | undefined {
  if (!list || list.length === 0) return undefined;
  const opts = list.length > 1 ? list.filter((u) => u !== lastTake[k]) : list;
  const u = opts[Math.floor(Math.random() * opts.length)];
  if (u) lastTake[k] = u;
  return u;
}

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
const speechListeners = new Set<() => void>();
export const isNarrating = () => speaking;
export const subscribeNarration = (fn: () => void) => {
  speechListeners.add(fn);
  return () => { speechListeners.delete(fn); };
};
type NarrationJob = { parts: SpeechPart[]; sig: string; resolve: (ok: boolean) => void };
const narrationQueue: NarrationJob[] = [];
let activeSig = "";
let activeNarration: Promise<boolean> | null = null;
export async function waitForNarration() {
  while (activeNarration) await activeNarration;
}

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
  if (on) {
    stopVoice();
    stopMusic();
  } else if (settings.musicOn) {
    startMusic();
  }
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
  if (on && !settings.muted) startMusic();
  else stopMusic();
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
  const urls = [...Object.values(M.animals), ...Object.values(M.pt).flat().slice(0, 40)];
  let i = 0;
  const next = () => {
    const u = urls[i++];
    if (!u) return;
    void load(u).then(next);
  };
  next();
  next();
}

function playBuffer(buf: AudioBuffer, dest: AudioNode, gain = 1, rate = 1) {
  const c = getCtx();
  if (!c) return null;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
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
  if (speaking === on) return;
  speaking = on;
  applyVolume();
  speechListeners.forEach((fn) => fn());
}

function stopVoice() {
  voiceToken++;
  narrationQueue.splice(0).forEach((job) => job.resolve(false));
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
  const k = voiceKey(text);
  const url = pickTake((en ? M.en : M.pt)[k], (en ? "en:" : "pt:") + k);
  if (!url) return fallbackSpeak(text, en, token);
  const buf = await load(url);
  if (token !== voiceToken) return;
    if (!buf || !voiceGain) return fallbackSpeak(text, en, token);
    const destination = voiceGain;
  await new Promise<void>((resolve) => {
    const src = playBuffer(buf, destination);
    if (!src) return resolve();
    voiceSrc = src;
    src.onended = () => resolve();
  });
}

/**
 * Narrate one or more parts in order (a string is Portuguese, `{ en }` is English).
 * Narrations are serialized; repeated requests are ignored, never restarted.
 * Only the parent's mute control may cancel speech.
 */
export function speak(...parts: SpeechPart[]): Promise<boolean> {
  if (typeof window === "undefined" || settings.muted || settings.voice <= 0) return Promise.resolve(false);
  const sig = JSON.stringify(parts);
  const now = Date.now();
  if (sig === activeSig || narrationQueue.some((job) => job.sig === sig)) return Promise.resolve(false);
  if (sig === lastSig && now - lastAt < 1500) return Promise.resolve(false);
  if (!parts.length || narrationQueue.length >= 6) return Promise.resolve(false);
  getCtx();
  setSpeaking(true);
  const result = new Promise<boolean>((resolve) => narrationQueue.push({ parts, sig, resolve }));
  drainNarration();
  return result;
}

function drainNarration() {
  if (activeNarration) return;
  const job = narrationQueue.shift();
  if (!job) { setSpeaking(false); return; }
  activeSig = job.sig;
  lastSig = job.sig;
  lastAt = Date.now();
  const token = voiceToken;
  activeNarration = (async () => {
    for (let i = 0; i < job.parts.length; i++) {
      if (token !== voiceToken) return false;
      const part = job.parts[i];
      if (part) await sayPart(part, token);
      if (i < job.parts.length - 1) await new Promise((r) => window.setTimeout(r, 120));
    }
    return token === voiceToken;
  })();
  void activeNarration.catch(() => false).then((ok) => {
    activeSig = "";
    activeNarration = null;
    job.resolve(ok);
    drainNarration();
  });
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
export const ANIMAL_FILE: Record<string, string> = {
  cachorro: "dog",
  gato: "cat",
  vaca: "cow",
  pato: "duck",
  passarinho: "bird",
  sapo: "frog",
  ovelha: "sheep",
  leao: "lion",
  elefante: "elephant",
  macaco: "monkey",
  peixe: "fish",
  abelha: "bee",
};
/** Every animal id that must have its own recording. */
export const ANIMAL_SOUND_IDS = Object.keys(ANIMAL_FILE);

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
      animalSrc = playBuffer(buf, fxGain, 0.9, 0.94 + Math.random() * 0.14);
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

/* ---------------- real-sounding instruments (synthesized, original) ---------------- */
type Dest = "fx" | "music";
const out = (d: Dest) => (d === "music" ? musicGain : fxGain);
const MUSIC_BOOST = 2.2;

function env(c: AudioContext, t0: number, peak: number, attack: number, decay: number, dest: AudioNode) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  g.connect(dest);
  return g;
}
function osc(c: AudioContext, type: OscillatorType, f: number, t0: number, dur: number, to: AudioNode, detune = 0) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = f;
  o.detune.value = detune;
  o.connect(to);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
  return o;
}
function noiseBuf(c: AudioContext, dur: number) {
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export type InstrumentId = "piano" | "violao" | "tambor" | "trompete" | "chocalho" | "sino" | "xilofone" | "flauta" | "caixinha";

/** Play one note of an instrument. `when` is seconds from now. */
export function playNote(id: InstrumentId | string, f: number, when = 0, vol = 1, dest: Dest = "fx") {
  const c = getCtx();
  const o = out(dest);
  if (!c || !o || settings.muted) return;
  const t = c.currentTime + when;
  if (dest === "music") vol *= MUSIC_BOOST;
  switch (id) {
    case "piano": {
      const g = env(c, t, 0.22 * vol, 0.005, 1.4, o);
      osc(c, "triangle", f, t, 1.5, g);
      const g2 = env(c, t, 0.08 * vol, 0.005, 0.6, o);
      osc(c, "sine", f * 2, t, 0.7, g2, 3);
      const g3 = env(c, t, 0.03 * vol, 0.003, 0.25, o);
      osc(c, "sine", f * 3, t, 0.3, g3);
      break;
    }
    case "violao": {
      // Karplus-Strong plucked string
      const N = Math.round(c.sampleRate / f);
      const len = Math.ceil(c.sampleRate * 1.6);
      const b = c.createBuffer(1, len, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
      for (let i = N; i < len; i++) d[i] = 0.497 * (d[i - N]! + d[i - N + 1]!);
      const s = c.createBufferSource();
      s.buffer = b;
      const lp = c.createBiquadFilter();
      lp.frequency.value = 2600;
      const g = c.createGain();
      g.gain.value = 0.35 * vol;
      s.connect(lp).connect(g).connect(o);
      s.start(t);
      break;
    }
    case "tambor": {
      const g = env(c, t, 0.5 * vol, 0.003, 0.35, o);
      const k = osc(c, "sine", f * 1.6, t, 0.4, g);
      k.frequency.setValueAtTime(f * 1.6, t);
      k.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.3);
      const n = c.createBufferSource();
      n.buffer = noiseBuf(c, 0.1);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 900;
      n.connect(bp).connect(env(c, t, 0.12 * vol, 0.002, 0.08, o));
      n.start(t);
      break;
    }
    case "trompete": {
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 2;
      lp.frequency.setValueAtTime(500, t);
      lp.frequency.linearRampToValueAtTime(2200, t + 0.08);
      lp.frequency.linearRampToValueAtTime(1400, t + 0.5);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09 * vol, t + 0.06);
      g.gain.setValueAtTime(0.08 * vol, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
      lp.connect(g).connect(o);
      const s = osc(c, "sawtooth", f, t, 0.7, lp);
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.value = 6;
      lfo.connect(lg).connect(s.detune);
      lfo.start(t + 0.15);
      lfo.stop(t + 0.7);
      break;
    }
    case "chocalho": {
      [0, 0.09, 0.18].forEach((d, i) => {
        const n = c.createBufferSource();
        n.buffer = noiseBuf(c, 0.12);
        const hp = c.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 4500;
        n.connect(hp).connect(env(c, t + d, (i === 1 ? 0.14 : 0.1) * vol, 0.004, 0.08, o));
        n.start(t + d);
      });
      break;
    }
    case "sino": {
      [1, 2.76, 5.4].forEach((m, i) => {
        const g = env(c, t, [0.12, 0.05, 0.025][i]! * vol, 0.002, [2.2, 1.2, 0.6][i]!, o);
        osc(c, "sine", f * m, t, 2.3, g);
      });
      break;
    }
    case "xilofone": {
      const g = env(c, t, 0.25 * vol, 0.002, 0.45, o);
      osc(c, "sine", f, t, 0.5, g);
      const g2 = env(c, t, 0.06 * vol, 0.001, 0.12, o);
      osc(c, "sine", f * 4, t, 0.15, g2);
      break;
    }
    case "caixinha": {
      // music box
      const g = env(c, t, 0.12 * vol, 0.002, 1.1, o);
      osc(c, "sine", f, t, 1.2, g);
      const g2 = env(c, t, 0.04 * vol, 0.002, 0.4, o);
      osc(c, "sine", f * 3.01, t, 0.5, g2);
      break;
    }
    case "flauta":
    default: {
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14 * vol, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      g.connect(o);
      const s = osc(c, "sine", f, t, 1, g);
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 5;
      lg.gain.value = 8;
      lfo.connect(lg).connect(s.detune);
      lfo.start(t);
      lfo.stop(t + 1);
    }
  }
}

/** Little tunes per instrument so each one sounds like itself. */
const LICKS: Record<string, number[][]> = {
  piano: [[523, 659, 784], [784, 659, 523], [523, 587, 659, 784]],
  violao: [[330, 392, 494], [262, 330, 392, 523], [294, 370, 440]],
  tambor: [[110, 110, 90], [110, 90, 110, 90], [100, 100]],
  trompete: [[392, 523], [440, 587, 523], [523, 659]],
  chocalho: [[1], [1, 1]],
  sino: [[1046, 1318], [1568, 1318, 1046], [1318]],
  sininho: [[1046, 1318, 1568]],
  xilofone: [[784, 880, 988, 1175], [1175, 988, 784]],
};
let lickIdx = 0;
export function playInstrument(id: string) {
  const inst = id === "sininho" ? "sino" : id;
  const set = LICKS[id] ?? LICKS[inst] ?? [[523, 659]];
  const lick = set[lickIdx++ % set.length]!;
  const step = inst === "tambor" ? 0.18 : inst === "chocalho" ? 0.3 : inst === "trompete" ? 0.22 : 0.14;
  lick.forEach((f, i) => playNote(inst, f, i * step));
}

/* ---------------- background music: several original gentle songs ---------------- */
// Each song: chord roots (Hz) per bar, melody (semitones from root, null = rest), instruments, tempo.
type Song = { bpm: number; chords: number[][]; melody: (number | null)[]; lead: InstrumentId; pad: InstrumentId; bass: boolean; shaker?: boolean };
const C4 = 261.63;
const st = (n: number) => C4 * Math.pow(2, n / 12);
const SONGS: Song[] = [
  // music box lullaby (C - Am - F - G)
  { bpm: 72, chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], melody: [12, null, 16, 14, 12, null, 9, null, 9, 12, 11, null, 7, null, null, null], lead: "caixinha", pad: "piano", bass: false },
  // sunny xylophone walk (F - C - G - C)
  { bpm: 92, chords: [[5, 9, 12], [0, 4, 7], [-5, -1, 2], [0, 4, 7]], melody: [17, 16, 14, 12, 14, null, 16, null, 14, 12, 11, 12, 7, null, 12, null], lead: "xilofone", pad: "violao", bass: true, shaker: true },
  // soft guitar bossa (Dm - G - C - A)
  { bpm: 84, chords: [[2, 5, 9], [-5, -1, 2], [0, 4, 7], [-3, 1, 4]], melody: [14, null, 12, 9, null, 11, 14, null, 16, 14, 12, null, 13, null, null, null], lead: "flauta", pad: "violao", bass: true, shaker: true },
  // starry bells (C - Em - F - G)
  { bpm: 66, chords: [[0, 4, 7], [4, 7, 11], [5, 9, 12], [7, 11, 14]], melody: [19, null, null, 16, null, null, 17, null, 21, null, 19, null, null, null, null, null], lead: "sino", pad: "piano", bass: false },
  // happy farm (G - C - D - G)
  { bpm: 100, chords: [[7, 11, 14], [0, 4, 7], [2, 6, 9], [7, 11, 14]], melody: [19, 19, 21, 19, 16, null, 14, null, 18, 18, 19, 21, 19, null, null, null], lead: "xilofone", pad: "piano", bass: true, shaker: true },
  // dreamy flute (Am - F - C - G)
  { bpm: 70, chords: [[-3, 0, 4], [-7, -3, 0], [0, 4, 7], [-5, -1, 2]], melody: [12, null, 11, 9, null, null, 7, null, 9, null, 12, null, 14, null, null, null], lead: "flauta", pad: "caixinha", bass: false },
];
export const SONG_COUNT = SONGS.length;
let theme = Math.floor(Math.random() * SONGS.length);
let beat = 0;
let musicTimer: number | null = null;
let loopsOnSong = 0;

function musicTick() {
  musicTimer = null;
  if (typeof window === "undefined" || !settings.musicOn || settings.muted) return;
  const c = getCtx();
  if (!c || !musicGain) return;
  const song = SONGS[theme]!;
  const eighth = 60 / song.bpm / 2;
  const bar = Math.floor(beat / 8) % song.chords.length;
  const chord = song.chords[bar]!;
  const b8 = beat % 8;
  // gentle arpeggiated chord
  if (b8 % 2 === 0) playNote(song.pad, st(chord[(b8 / 2) % chord.length]!), 0.02, 0.55, "music");
  if (song.bass && (b8 === 0 || b8 === 4)) playNote("piano", st(chord[0]! - 12), 0.02, 0.6, "music");
  if (song.shaker && b8 % 2 === 1) playNote("chocalho", 1, 0.02, 0.25, "music");
  const m = song.melody[beat % song.melody.length];
  if (m !== null && m !== undefined) playNote(song.lead, st(m), 0.02, 0.7, "music");
  beat++;
  // after a few loops, a breath of silence, then another song
  if (beat % (song.chords.length * 8) === 0) {
    loopsOnSong++;
    if (loopsOnSong >= 3) {
      loopsOnSong = 0;
      theme = (theme + 1 + Math.floor(Math.random() * (SONGS.length - 1))) % SONGS.length;
      beat = 0;
      musicTimer = window.setTimeout(musicTick, 6000);
      return;
    }
  }
  musicTimer = window.setTimeout(musicTick, eighth * 1000);
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
/** Change to another song (called between rounds). */
export function nextMusicTheme() {
  theme = (theme + 1) % SONGS.length;
  beat = 0;
  loopsOnSong = 0;
}
