import { useEffect, useRef, useState } from "react";
import { playAnimalSound, sounds, tone } from "./audio";
import { ANIMALS } from "./data";

/**
 * "Céu Mágico" — free play with no right or wrong answer.
 * Finger trails paint glowing notes (music by height), taps hatch surprises
 * (animals that make their sound and fly away on a balloon, fireworks),
 * and every few surprises a giant friend parades across the sky.
 */
const PENTA = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880];
const TRAIL = ["✨", "⭐", "💫", "🌟"];
const COLORS = ["var(--joy-sun)", "var(--joy-bubble)", "var(--joy-sky)", "var(--joy-mint)"];
const PARADE = ["🐳", "🦄", "🐉", "🌈", "🚂"];
const MAX_ACTIVE = 6;

type Pop = { id: number; x: number; y: number; kind: "animal" | "firework"; emoji: string };

let nextId = 1;

export function MagicSky() {
  const layer = useRef<HTMLDivElement>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [parade, setParade] = useState<{ id: number; emoji: string } | null>(null);
  const lastSpawn = useRef(0);
  const lastNote = useRef(0);
  const lastTrail = useRef(0);
  const count = useRef(0);
  const down = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const sparkle = (x: number, y: number) => {
    const now = performance.now();
    if (now - lastTrail.current < 45 || !layer.current) return;
    lastTrail.current = now;
    const el = document.createElement("span");
    el.textContent = TRAIL[Math.floor(Math.random() * TRAIL.length)] ?? "✨";
    el.className = "pointer-events-none absolute select-none text-4xl";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.filter = `drop-shadow(0 0 10px ${COLORS[Math.floor(Math.random() * COLORS.length)]})`;
    layer.current.appendChild(el);
    el.animate(
      [{ transform: "translate(-50%,-50%) scale(1.2)", opacity: 1 }, { transform: `translate(-50%, ${-50 - 60 - Math.random() * 40}%) scale(.2) rotate(180deg)`, opacity: 0 }],
      { duration: 900, easing: "ease-out" },
    ).onfinish = () => el.remove();
    if (now - lastNote.current > 140) {
      lastNote.current = now;
      const h = layer.current.clientHeight || window.innerHeight;
      const idx = Math.max(0, Math.min(PENTA.length - 1, Math.floor((1 - y / h) * PENTA.length)));
      tone({ freq: PENTA[idx] ?? 440, duration: 0.25, type: "sine", gain: 0.12 });
    }
  };

  const spawn = (x: number, y: number) => {
    const now = performance.now();
    if (now - lastSpawn.current < 450 || pops.length >= MAX_ACTIVE || parade) return;
    lastSpawn.current = now;
    count.current++;
    const isAnimal = count.current % 3 !== 0;
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)] ?? { id: "cachorro", label: "cachorro", emoji: "🐶" };
    const pop: Pop = { id: nextId++, x, y, kind: isAnimal ? "animal" : "firework", emoji: isAnimal ? animal.emoji : "🎆" };
    setPops((p) => [...p, pop]);
    sounds.pop();
    if (isAnimal) later(() => void playAnimalSound(animal.id), 450);
    else later(() => sounds.cheer(), 200);
    later(() => setPops((p) => p.filter((q) => q.id !== pop.id)), 3200);
    if (count.current % 7 === 0) {
      later(() => {
        setParade({ id: nextId++, emoji: PARADE[Math.floor(Math.random() * PARADE.length)] ?? "🐳" });
        [0, 0.2, 0.4, 0.6, 0.8].forEach((d, i) => tone({ freq: PENTA[i * 2] ?? 523, duration: 0.3, type: "triangle", delay: d, gain: 0.12 }));
      }, 1200);
      later(() => setParade(null), 6200);
    }
  };

  const local = (e: React.PointerEvent) => {
    const r = layer.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  return (
    <div
      ref={layer}
      data-magic-sky
      className="magic-sky relative h-[calc(100dvh-2rem)] w-full max-w-3xl touch-none overflow-hidden rounded-4xl shadow-soft"
      onPointerDown={(e) => { const p = local(e); down.current = { ...p, moved: false }; sparkle(p.x, p.y); }}
      onPointerMove={(e) => {
        if (!down.current && e.pointerType !== "mouse") return;
        if (!down.current) return;
        const p = local(e);
        if (Math.hypot(p.x - down.current.x, p.y - down.current.y) > 24) down.current.moved = true;
        sparkle(p.x, p.y);
      }}
      onPointerUp={(e) => { const p = local(e); if (down.current && !down.current.moved) spawn(p.x, p.y); down.current = null; }}
      onPointerCancel={() => { down.current = null; }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center text-6xl opacity-80 animate-bob" aria-hidden>🌙</div>
      {pops.map((p) => (
        <div key={p.id} className="pointer-events-none absolute" style={{ left: p.x, top: p.y }} aria-hidden>
          {p.kind === "animal" ? (
            <div className="magic-hatch flex flex-col items-center">
              <span className="text-5xl">🎈</span>
              <span className="text-[5.5rem] leading-none">{p.emoji}</span>
            </div>
          ) : (
            <div className="magic-firework text-[6rem] leading-none">{p.emoji}</div>
          )}
          <div className="magic-ring" />
        </div>
      ))}
      {parade && (
        <div key={parade.id} className="magic-parade pointer-events-none absolute top-1/3 text-[9rem] leading-none" aria-hidden>
          {parade.emoji}
          <span className="absolute -top-8 left-1/2 text-4xl">🎉</span>
        </div>
      )}
    </div>
  );
}
