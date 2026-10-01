import { useEffect, useMemo, useRef, useState } from "react";
import { Prompt } from "./ui";
import { pick, shuffle } from "./shuffle";
import { playAnimalSound, playMelody, sounds, speak, thingSounds, tone } from "./audio";
import { ANIMALS, FRUITS, TOYS, cade, praise, type Item } from "./data";
import { useIdleHint } from "./useIdleHint";
import { useLock } from "./useLock";
import { DragTarget, playAnimal, useBox, type ActivityProps } from "./interactions";

const finish = (onComplete: () => void, delay = 900) =>
  window.setTimeout(() => {
    sounds.cheer();
    onComplete();
  }, delay);

const SCENES = [
  { bg: "linear-gradient(180deg, oklch(0.88 0.08 230), oklch(0.86 0.12 150))", spots: ["🌳", "🏠", "🌷", "🪨"] },
  { bg: "linear-gradient(180deg, oklch(0.92 0.05 60), oklch(0.85 0.08 30))", spots: ["📦", "🛏️", "🪑", "🧺"] },
  { bg: "linear-gradient(180deg, oklch(0.88 0.08 210), oklch(0.8 0.1 240))", spots: ["🪸", "🐚", "🪨", "🌿"] },
];

/* ---------------- Cadê? Hide-and-seek in a little scene ---------------- */
export function SceneSeekActivity({ onComplete, round }: ActivityProps) {
  const scene = useMemo(() => SCENES[round % SCENES.length] ?? SCENES[0]!, [round]);
  const [r, setR] = useState(0);
  const setup = useMemo(() => {
    const pool = ANIMALS.filter((a) => a.id !== "peixe" || scene === SCENES[2]);
    const animal = pick(pool, 1)[0] ?? ANIMALS[0]!;
    const spots = shuffle(scene.spots).slice(0, r === 0 ? 3 : 4);
    return { animal, spots, hideAt: Math.floor(Math.random() * spots.length) };
  }, [r, scene]);
  const [peek, setPeek] = useState<number | null>(null);
  const [found, setFound] = useState(false);
  const lock = useLock();
  const { level, poke } = useIdleHint(r);

  useEffect(() => {
    void speak(cade(setup.animal.label));
  }, [setup]);

  const tap = (i: number) => {
    poke();
    if (found) return;
    if (i !== setup.hideAt) {
      sounds.gentle();
      setPeek(i);
      window.setTimeout(() => setPeek(null), 500);
      return;
    }
    if (!lock.tryLock()) return;
    setFound(true);
    sounds.sparkle();
    void speak("Achou!").then(() => void playAnimalSound(setup.animal.id));
    window.setTimeout(() => {
      if (r >= 1) {
        finish(onComplete, 200);
        return;
      }
      setFound(false);
      setR((x) => x + 1);
      window.setTimeout(lock.release, 300);
    }, 1800);
  };

  return (
    <>
      <Prompt>
        <span className="text-5xl">{setup.animal.emoji}</span>
        <span className="text-4xl">❓</span>
      </Prompt>
      <div
        className="grid w-full max-w-md grid-cols-2 gap-5 rounded-4xl p-5 shadow-soft"
        style={{ background: scene.bg }}
      >
        {setup.spots.map((s, i) => (
          <button
            key={`${r}-${i}`}
            type="button"
            onPointerDown={() => tap(i)}
            className={[
              "relative flex aspect-square items-center justify-center text-[clamp(4rem,20vw,6rem)]",
              peek === i ? "animate-wiggle" : "",
              level >= 2 && i === setup.hideAt && !found ? "animate-bob" : "",
            ].join(" ")}
            aria-label={s}
          >
            <span className={found && i === setup.hideAt ? "opacity-30" : ""}>{s}</span>
            {found && i === setup.hideAt && (
              <span className="animate-pop absolute text-[clamp(3.5rem,18vw,5rem)]">{setup.animal.emoji}</span>
            )}
            {level === 1 && i === setup.hideAt && !found && (
              <span className="animate-bob absolute -top-2 right-2 text-3xl">👀</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------------- Coloque no lugar: sort into basket / box ---------------- */
export function SortActivity({ onComplete }: ActivityProps) {
  const { ref, box } = useBox();
  const items = useMemo(() => {
    const fruits = pick(FRUITS, 2).map((i) => ({ ...i, kind: "basket" as const }));
    const toys = pick(TOYS, 2).map((i) => ({ ...i, kind: "box" as const }));
    return shuffle([...fruits, ...toys]);
  }, []);
  const [placed, setPlaced] = useState<Record<string, { x: number; y: number }>>({});
  const { level, poke } = useIdleHint(Object.keys(placed).length);
  const done = useRef(false);
  const size = Math.min(88, box.w / 4.6);

  useEffect(() => {
    void speak("Coloque cada coisa no lugar!");
  }, []);

  const bins = {
    basket: { x: box.w * 0.25, y: box.h * 0.78, emoji: "🧺" },
    box: { x: box.w * 0.75, y: box.h * 0.78, emoji: "📦" },
  };

  return (
    <>
      <Prompt>
        <span className="text-4xl">🍎🧸</span>
        <span className="text-4xl">👉</span>
        <span className="text-4xl">🧺📦</span>
      </Prompt>
      <div ref={ref} className="relative h-[60dvh] w-full max-w-md">
        {Object.entries(bins).map(([k, b]) => (
          <div
            key={k}
            className="absolute flex items-center justify-center rounded-full bg-card/70 text-[5rem] shadow-soft"
            style={{ left: b.x - 70, top: b.y - 70, width: 140, height: 140 }}
          >
            {b.emoji}
          </div>
        ))}
        {items.map((it, i) => {
          const home = { x: (box.w / 4) * i + (box.w / 4 - size) / 2, y: box.h * 0.12 + (i % 2) * size * 0.6 };
          return (
            <DragTarget
              key={it.id}
              emoji={it.emoji ?? "⭐"}
              size={size}
              home={home}
              containerRef={ref}
              placed={placed[it.id] ?? null}
              hint={level > 0 && !placed[it.id]}
              onDrop={(p) => {
                poke();
                const target = bins[it.kind];
                const other = bins[it.kind === "basket" ? "box" : "basket"];
                const dist = (b: { x: number; y: number }) => Math.hypot(p.x - b.x, p.y - b.y);
                const radius = level >= 2 ? 160 : 110;
                if (dist(target) < radius) {
                  sounds.snap();
                  const n = Object.keys(placed).filter((id) => items.find((x) => x.id === id)?.kind === it.kind).length;
                  const next = {
                    ...placed,
                    [it.id]: { x: target.x - size / 2 + (n ? 26 : -26), y: target.y - size / 2 - 30 },
                  };
                  setPlaced(next);
                  if (Object.keys(next).length === items.length && !done.current) {
                    done.current = true;
                    void speak("Muito bem!");
                    finish(onComplete, 1000);
                  }
                  return true;
                }
                if (dist(other) < 110) sounds.gentle();
                return false;
              }}
            />
          );
        })}
      </div>
    </>
  );
}

/* ---------------- Crianças brincando ---------------- */
const KIDS = ["👧🏻", "👦🏽", "👧🏿", "👦🏼", "🧒🏾", "👧🏽", "👦🏿", "🧒🏻"];
const PLAYS: { toy: string; say: string; play: () => void }[] = [
  { toy: "⚽", say: "Bola!", play: () => thingSounds["bola"]?.() },
  { toy: "🥁", say: "Tambor!", play: () => playMelody([196, 196, 262], 0.12, "triangle", 0.18) },
  { toy: "🎈", say: "Balão!", play: () => tone({ freq: 500, to: 900, duration: 0.25, type: "sine", gain: 0.14 }) },
  { toy: "🪀", say: "Olha!", play: () => tone({ freq: 400, to: 800, duration: 0.2, type: "triangle", gain: 0.14 }) },
];

export function KidsPlayActivity({ onComplete }: ActivityProps) {
  const setup = useMemo(() => ({ kids: pick(KIDS, 2), play: pick(PLAYS, 1)[0] ?? PLAYS[0]! }), []);
  const [hits, setHits] = useState(0);
  const [bounce, setBounce] = useState(0);
  const [side, setSide] = useState(0);
  const { level, poke } = useIdleHint(hits);
  const last = useRef(0);
  const GOAL = 4;

  useEffect(() => {
    void speak("Vamos brincar!");
  }, []);

  const tap = () => {
    poke();
    const now = Date.now();
    if (hits >= GOAL || now - last.current < 450) return;
    last.current = now;
    setup.play.play();
    setBounce((b) => b + 1);
    setSide((s) => 1 - s);
    const n = hits + 1;
    setHits(n);
    if (n === 1) void speak(setup.play.say);
    if (n === GOAL) {
      void speak(praise());
      finish(onComplete, 1100);
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-5xl">{setup.play.toy}</span>
        <span className="text-4xl">👆</span>
      </Prompt>
      <div className="relative flex h-[56dvh] w-full max-w-md items-end justify-between rounded-4xl bg-card/40 px-4 pb-6 shadow-soft">
        <span className={`text-[clamp(5rem,26vw,8rem)] ${side === 0 && hits ? "animate-pop" : "animate-bob"}`}>
          {setup.kids[0]}
        </span>
        <button
          key={bounce}
          type="button"
          onPointerDown={tap}
          aria-label={setup.play.say}
          className={[
            "absolute left-1/2 flex h-40 w-40 -translate-x-1/2 items-center justify-center text-[6rem]",
            bounce ? "animate-pop" : "",
            level > 0 ? "rounded-full ring-4 ring-primary/50" : "",
          ].join(" ")}
          style={{ top: bounce % 2 ? "10%" : "35%", transition: "top 0.35s ease-out" }}
        >
          {setup.play.toy}
        </button>
        <span
          className={`text-[clamp(5rem,26vw,8rem)] ${side === 1 && hits ? "animate-pop" : "animate-bob"}`}
          style={{ animationDelay: "0.4s" }}
        >
          {setup.kids[1]}
        </span>
      </div>
    </>
  );
}

/* ---------------- Exploração livre ---------------- */
type Thing = { e: string; x: number; y: number; act: () => void; anim: string; item?: Item };
const animal = (id: string) => ANIMALS.find((a) => a.id === id);
const EXPLORE: { bg: string; things: Thing[] }[] = [
  {
    bg: "linear-gradient(180deg, oklch(0.88 0.08 230), oklch(0.88 0.12 140))",
    things: [
      { e: "🌞", x: 10, y: 6, anim: "animate-pop", act: () => sounds.sparkle() },
      { e: "☁️", x: 60, y: 8, anim: "animate-wiggle", act: () => sounds.swipe() },
      { e: "🐦", x: 66, y: 34, anim: "animate-rise", act: () => void playAnimalSound("passarinho") },
      { e: "🌸", x: 12, y: 62, anim: "animate-wiggle", act: () => playMelody([784, 988], 0.1, "sine", 0.12) },
      { e: "🦋", x: 52, y: 64, anim: "animate-float", act: () => sounds.sparkle() },
    ],
  },
  {
    bg: "linear-gradient(180deg, oklch(0.9 0.07 220), oklch(0.85 0.1 130))",
    things: [
      { e: "🏠", x: 8, y: 14, anim: "animate-pop", act: () => playMelody([659, 523], 0.25, "sine", 0.16) },
      { e: "🌳", x: 62, y: 10, anim: "animate-wiggle", act: () => sounds.swipe() },
      { e: "🐶", x: 14, y: 60, anim: "animate-pop", act: () => void playAnimalSound("cachorro") },
      { e: "🐱", x: 62, y: 58, anim: "animate-pop", act: () => void playAnimalSound("gato") },
      { e: "🚗", x: 38, y: 38, anim: "animate-wiggle", act: () => thingSounds["carro"]?.() },
    ],
  },
  {
    bg: "linear-gradient(180deg, oklch(0.85 0.09 210), oklch(0.7 0.12 245))",
    things: [
      { e: "🐠", x: 10, y: 12, anim: "animate-wiggle", act: () => void playAnimalSound("peixe") },
      { e: "🐙", x: 62, y: 16, anim: "animate-pop", act: () => tone({ freq: 300, to: 600, duration: 0.3, gain: 0.14 }) },
      { e: "🫧", x: 40, y: 40, anim: "animate-rise", act: () => sounds.pop() },
      { e: "🐢", x: 10, y: 64, anim: "animate-bob", act: () => playMelody([392, 330], 0.15, "triangle", 0.14) },
      { e: "🐳", x: 60, y: 62, anim: "animate-pop", act: () => tone({ freq: 220, to: 160, duration: 0.6, gain: 0.14 }) },
    ],
  },
];

export function ExploreSceneActivity({ onComplete, round }: ActivityProps) {
  const scene = useMemo(() => EXPLORE[(round + Math.floor(Math.random() * 3)) % EXPLORE.length] ?? EXPLORE[0]!, [round]);
  const [touched, setTouched] = useState<Record<number, number>>({});
  const last = useRef<Record<number, number>>({});
  const done = useRef(false);
  const { level, poke } = useIdleHint(Object.keys(touched).length);

  useEffect(() => {
    void speak("Olha!");
  }, []);

  const tap = (i: number, t: Thing) => {
    poke();
    const now = Date.now();
    if (now - (last.current[i] ?? 0) < 700) return;
    last.current[i] = now;
    t.act();
    const next = { ...touched, [i]: (touched[i] ?? 0) + 1 };
    setTouched(next);
    if (!done.current && Object.keys(next).length === scene.things.length) {
      done.current = true;
      void speak("Que legal!");
      finish(onComplete, 1600);
    }
  };

  return (
    <div className="relative h-[68dvh] w-full max-w-md overflow-hidden rounded-4xl shadow-soft" style={{ background: scene.bg }}>
      {scene.things.map((t, i) => (
        <button
          key={`${i}-${touched[i] ?? 0}`}
          type="button"
          onPointerDown={() => tap(i, t)}
          aria-label={t.e}
          className={[
            "absolute flex h-32 w-32 items-center justify-center text-[clamp(4rem,18vw,5.5rem)]",
            touched[i] ? (t.anim === "animate-rise" ? "animate-pop" : t.anim) : level > 0 ? "animate-bob" : "",
          ].join(" ")}
          style={{ left: `${t.x}%`, top: `${t.y}%` }}
        >
          {t.e}
        </button>
      ))}
    </div>
  );
}

export { animal, playAnimal };
