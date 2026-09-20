let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  getCtx();
}

export function playTone(freq: number, duration = 0.28, type: OscillatorType = "sine", delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playMelody(notes: number[], step = 0.13, type: OscillatorType = "triangle") {
  notes.forEach((n, i) => playTone(n, step * 1.6, type, i * step));
}

export const sounds = {
  pop: () => playTone(660, 0.14, "sine"),
  tap: () => playTone(440, 0.12, "triangle"),
  yay: () => playMelody([523, 659, 784, 1046]),
  cheer: () => playMelody([523, 659, 784, 1046, 1318], 0.11),
  gentle: () => playMelody([392, 440], 0.14, "sine"),
};

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = 0.9;
    u.pitch = 1.4;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
