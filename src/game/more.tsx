import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Prompt, Tile, TileGrid } from "./ui";
import { pick, shuffle } from "./shuffle";
import { animalSounds, playTone, sounds, speak, speakEn, thingSounds, tone } from "./audio";
import {
  ANIMALS,
  COLORED,
  COLOR_EN,
  EN_NUMBERS,
  FRUITS,
  NATURE,
  TOYS,
  colorPool,
  cade,
  encourage,
  praise,
  type Item,
} from "./data";
import { useIdleHint } from "./useIdleHint";
import { useLock } from "./useLock";
import { DragTarget, useBox, type ActivityProps } from "./interactions";

type Pos = { x: number; y: number };

const finish = (onComplete: () => void, delay = 900) =>
  window.setTimeout(() => {
    sounds.cheer();
    onComplete();
  }, delay);

/* ---------------- Balloons: tap to pop ---------------- */
export function BalloonActivity({ onComplete, round }: ActivityProps) {
  const balloons = useMemo(
    () =>
      pick(colorPool(round), 5).map((c, i) => ({
        ...c,
        key: i,
        left: 4 + i * 18 + Math.random() * 4,
        delay: Math.random() * 1.2,
      })),
    [round],
  );
  const [popped, setPopped] = useState<number[]>([]);
  const { level, poke } = useIdleHint(popped.length);

  useEffect(() => speak("Estoure os balões!"), []);

  const handle = (b: (typeof balloons)[number]) => {
    poke();
    if (popped.includes(b.key)) return;
    sounds.pop();
    tone({ freq: 900, to: 200, duration: 0.12, type: "square", gain: 0.08 });
    speak(b.label);
    const next = [...popped, b.key];
    setPopped(next);
    if (next.length === balloons.length) finish(onComplete);
  };

  return (
    <>
      <Prompt>
        <span className="text-5xl">🎈</span>
        <span className="text-4xl">👆</span>
      </Prompt>
      <div className="relative h-[62dvh] w-full max-w-md">
        {balloons.map((b, i) =>
          popped.includes(b.key) ? (
            <span
              key={b.key}
              className="animate-pop pointer-events-none absolute text-5xl"
              style={{ left: `${b.left}%`, top: `${20 + (i % 2) * 30}%` }}
            >
              💥
            </span>
          ) : (
            <button
              key={b.key}
              type="button"
              onPointerDown={() => handle(b)}
              aria-label={`balão ${b.label}`}
              className={`animate-float absolute flex h-28 w-24 items-start justify-center p-1 ${
                level > 0 ? "ring-0" : ""
              }`}
              style={{ left: `${b.left}%`, top: `${20 + (i % 2) * 30}%`, animationDelay: `${b.delay}s` }}
            >
              <span
                className="block h-24 w-20 rounded-[50%] border-2 border-foreground/10 shadow-soft"
                style={{ background: b.bg }}
              />
            </button>
          ),
        )}
      </div>
    </>
  );
}

/* ---------------- Bubbles: tap or slide over them ---------------- */
export function BubbleSwipeActivity({ onComplete }: ActivityProps) {
  const { ref, box } = useBox();
  const bubbles = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => ({
        key: i,
        x: 0.12 + Math.random() * 0.76,
        y: 0.1 + Math.random() * 0.8,
        delay: Math.random() * 2,
      })),
    [],
  );
  const [popped, setPopped] = useState<number[]>([]);
  const poppedRef = useRef<number[]>([]);
  const doneRef = useRef(false);

  useEffect(() => speak("Passe o dedinho nas bolhas!"), []);

  const check = (e: ReactPointerEvent) => {
    if (e.buttons === 0 && e.pointerType === "mouse" && e.type === "pointermove") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    for (const b of bubbles) {
      if (poppedRef.current.includes(b.key)) continue;
      if (Math.hypot(px - b.x * box.w, py - b.y * box.h) < 60) {
        poppedRef.current = [...poppedRef.current, b.key];
        setPopped(poppedRef.current);
        playTone(600 + poppedRef.current.length * 90, 0.12, "sine");
        if (poppedRef.current.length === bubbles.length && !doneRef.current) {
          doneRef.current = true;
          speak(praise());
          finish(onComplete, 700);
        }
      }
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-5xl">🫧</span>
        <span className="text-4xl">👋</span>
      </Prompt>
      <div
        ref={ref}
        onPointerDown={check}
        onPointerMove={check}
        style={{ touchAction: "none" }}
        className="relative h-[62dvh] w-full max-w-md rounded-4xl bg-card/20"
      >
        {bubbles.map((b) =>
          popped.includes(b.key) ? null : (
            <span
              key={b.key}
              className="animate-float pointer-events-none absolute h-24 w-24 rounded-full border-4 border-card bg-card/30 shadow-soft"
              style={{ left: b.x * box.w - 48, top: b.y * box.h - 48, animationDelay: `${b.delay}s` }}
            />
          ),
        )}
      </div>
    </>
  );
}

/* ---------------- Guide: slide a character to its goal ---------------- */
export function GuideActivity({
  onComplete,
  mover,
  goals,
  say,
}: ActivityProps & { mover: string; goals: string[]; say: string }) {
  const { ref, box } = useBox();
  const [roundIdx, setRoundIdx] = useState(0);
  const goal = useMemo(() => pick(goals, 1)[0] ?? "🌸", [roundIdx, goals]);
  const [pos, setPos] = useState<Pos>({ x: 60, y: 60 });
  const [won, setWon] = useState(false);
  const lock = useLock();
  const { level, poke } = useIdleHint(roundIdx);
  const goalPos = useMemo(
    () => (roundIdx % 2 === 0 ? { x: box.w - 80, y: box.h - 90 } : { x: 80, y: box.h - 90 }),
    [box.w, box.h, roundIdx],
  );

  useEffect(() => {
    setPos(roundIdx % 2 === 0 ? { x: 60, y: 60 } : { x: box.w - 60, y: 60 });
    setWon(false);
    lock.release();
    speak(say);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  const move = (e: ReactPointerEvent) => {
    if (won) return;
    if (e.buttons === 0 && e.pointerType === "mouse") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setPos(p);
    poke();
    const radius = level >= 2 ? 130 : 85;
    if (Math.hypot(p.x - goalPos.x, p.y - goalPos.y) < radius && lock.tryLock()) {
      setWon(true);
      sounds.sparkle();
      speak(praise());
      window.setTimeout(() => {
        if (roundIdx + 1 >= 2) finish(onComplete, 0);
        else setRoundIdx((r) => r + 1);
      }, 1100);
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-5xl">{mover}</span>
        <span className="text-4xl">➡️</span>
        <span className="text-5xl">{goal}</span>
      </Prompt>
      <div
        ref={ref}
        onPointerMove={move}
        onPointerDown={move}
        style={{ touchAction: "none" }}
        className="relative h-[58dvh] w-full max-w-md rounded-4xl bg-card/25"
      >
        <div
          className={`absolute flex h-28 w-28 items-center justify-center rounded-full bg-card/70 text-[4rem] shadow-soft ${
            level > 0 ? "animate-bob ring-4 ring-primary/40" : ""
          }`}
          style={{ left: goalPos.x - 56, top: goalPos.y - 56 }}
        >
          {goal}
        </div>
        <div
          className={`pointer-events-none absolute text-[4.5rem] ${won ? "animate-pop" : "animate-bob"}`}
          style={{ left: pos.x - 40, top: pos.y - 40 }}
        >
          {mover}
        </div>
      </div>
    </>
  );
}

/* ---------------- Drag items to a home (basket, box, house) ---------------- */
export function DragHomeActivity({
  onComplete,
  pool,
  home,
  say,
  onPlace,
}: ActivityProps & { pool: Item[]; home: string; say: string; onPlace?: (i: Item) => void }) {
  const { ref, box } = useBox();
  const items = useMemo(() => pick(pool, 3), [pool]);
  const [placed, setPlaced] = useState<string[]>([]);
  const placedRef = useRef<string[]>([]);
  const { level, poke } = useIdleHint(placed.length);
  const target = { x: box.w / 2, y: 100 };

  useEffect(() => speak(say), [say]);

  return (
    <>
      <Prompt>
        <span className="text-5xl">{items[0]?.emoji}</span>
        <span className="text-4xl">➡️</span>
        <span className="text-5xl">{home}</span>
      </Prompt>
      <div ref={ref} className="relative h-[58dvh] w-full max-w-md">
        <div
          className="absolute flex h-40 w-40 items-center justify-center rounded-4xl bg-card/70 text-[5rem] shadow-soft"
          style={{ left: target.x - 80, top: target.y - 80 }}
        >
          {home}
        </div>
        {items.map((item, i) => (
          <DragTarget
            key={item.id}
            emoji={item.emoji ?? "❔"}
            home={{ x: 16 + i * ((box.w - 128) / 2), y: box.h - 120 }}
            containerRef={ref}
            hint={level > 0 && !placed.includes(item.id)}
            placed={placed.includes(item.id) ? { x: target.x - 48 + (i - 1) * 26, y: target.y - 40 } : null}
            onDrop={(p) => {
              poke();
              if (placedRef.current.includes(item.id)) return true;
              const dist = Math.hypot(p.x - target.x, p.y - target.y);
              if (dist < (level >= 2 ? 240 : 150)) {
                sounds.snap();
                if (onPlace) onPlace(item);
                else speak(item.label);
                placedRef.current = [...placedRef.current, item.id];
                setPlaced(placedRef.current);
                if (placedRef.current.length === items.length) finish(onComplete);
                return true;
              }
              sounds.gentle();
              return false;
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ---------------- Footprints: follow the paws to the animal ---------------- */
export function FootprintsActivity({ onComplete }: ActivityProps) {
  const { ref, box } = useBox();
  const [roundIdx, setRoundIdx] = useState(0);
  const animal = useMemo(() => pick(ANIMALS, 1)[0] ?? ANIMALS[0], [roundIdx]);
  const [reached, setReached] = useState(0);
  const reachedRef = useRef(0);
  const lock = useLock();
  const { level, poke } = useIdleHint(reached + roundIdx * 10);
  const steps = 5;
  const points = useMemo(
    () =>
      Array.from({ length: steps }).map((_, i) => {
        const t = i / (steps - 1);
        return {
          x: box.w * (0.18 + 0.64 * t),
          y: box.h * (0.85 - 0.65 * t) + Math.sin(t * Math.PI * 2) * 30,
        };
      }),
    [box.w, box.h],
  );

  useEffect(() => {
    setReached(0);
    reachedRef.current = 0;
    lock.release();
    speak("Siga as pegadinhas!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  const move = (e: ReactPointerEvent) => {
    if (e.buttons === 0 && e.pointerType === "mouse" && e.type === "pointermove") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || !animal) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const nextPt = points[reachedRef.current];
    if (!nextPt) return;
    poke();
    if (Math.hypot(px - nextPt.x, py - nextPt.y) < (level >= 2 ? 110 : 75)) {
      reachedRef.current += 1;
      setReached(reachedRef.current);
      playTone(500 + reachedRef.current * 110, 0.14, "triangle");
      if (reachedRef.current >= steps && lock.tryLock()) {
        const fn = animalSounds[animal.id];
        if (fn) fn();
        window.setTimeout(() => speak(animal.say ?? animal.label), 600);
        window.setTimeout(() => {
          if (roundIdx + 1 >= 2) finish(onComplete, 0);
          else setRoundIdx((r) => r + 1);
        }, 2000);
      }
    }
  };

  const last = points[steps - 1];
  return (
    <>
      <Prompt>
        <span className="text-5xl">🐾</span>
        <span className="text-4xl">➡️</span>
        <span className="text-5xl">❓</span>
      </Prompt>
      <div
        ref={ref}
        onPointerDown={move}
        onPointerMove={move}
        style={{ touchAction: "none" }}
        className="relative h-[60dvh] w-full max-w-md rounded-4xl bg-card/20"
      >
        {points.slice(0, steps - 1).map((p, i) => (
          <span
            key={i}
            className={`pointer-events-none absolute flex h-20 w-20 items-center justify-center text-5xl transition-opacity ${
              i < reached ? "opacity-25" : i === reached ? (level > 0 ? "animate-bob" : "animate-pulse") : "opacity-60"
            }`}
            style={{ left: p.x - 40, top: p.y - 40 }}
          >
            🐾
          </span>
        ))}
        {last && (
          <span
            className={`pointer-events-none absolute flex h-28 w-28 items-center justify-center rounded-full bg-card/70 text-[4rem] shadow-soft ${
              reached >= steps ? "animate-pop" : ""
            }`}
            style={{ left: last.x - 56, top: last.y - 56 }}
          >
            {reached >= steps ? animal?.emoji : "🌳"}
          </span>
        )}
      </div>
    </>
  );
}

/* ---------------- Find: who is hiding behind the bushes? ---------------- */
export function FindActivity({ onComplete, round }: ActivityProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const board = useMemo(() => {
    const target = pick([...ANIMALS, ...TOYS], 1)[0] ?? ANIMALS[0]!;
    const count = round === 0 ? 3 : 4;
    const spots = shuffle(Array.from({ length: count }).map((_, i) => i));
    return { target, count, at: spots[0] ?? 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);
  const [peek, setPeek] = useState<number[]>([]);
  const [found, setFound] = useState(false);
  const lock = useLock();
  const { level, poke } = useIdleHint(roundIdx);

  useEffect(() => {
    setPeek([]);
    setFound(false);
    lock.release();
    speak(cade(board.target.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  const handle = (i: number) => {
    poke();
    if (i === board.at) {
      if (!lock.tryLock()) return;
      setFound(true);
      const fn = animalSounds[board.target.id] ?? thingSounds[board.target.id];
      if (fn) fn();
      else sounds.sparkle();
      speak("Achou!", praise());
      window.setTimeout(() => {
        if (roundIdx + 1 >= 2) finish(onComplete, 0);
        else setRoundIdx((r) => r + 1);
      }, 1600);
    } else {
      if (found) return;
      setPeek((p) => [...p, i]);
      sounds.swipe();
      speak(encourage());
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-6xl">{board.target.emoji}</span>
        <span className="text-4xl">🔎</span>
      </Prompt>
      <TileGrid cols={2}>
        {Array.from({ length: board.count }).map((_, i) => (
          <Tile
            key={`${roundIdx}-${i}`}
            onClick={() => handle(i)}
            hint={level > 0 && i === board.at && !found}
            state={found && i === board.at ? "happy" : peek.includes(i) ? "wiggle" : "idle"}
          >
            {found && i === board.at ? board.target.emoji : peek.includes(i) ? "🍃" : "🌳"}
          </Tile>
        ))}
      </TileGrid>
    </>
  );
}

/* ---------------- Find the object of a color ---------------- */
export function ColorObjectActivity({ onComplete, round }: ActivityProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [hit, setHit] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const lock = useLock();
  const board = useMemo(() => {
    const cols = pick(colorPool(round), Math.min(3, 2 + round));
    const opts = cols.map((c) => ({ color: c, emoji: pick(COLORED[c.id] ?? ["⚪"], 1)[0] ?? "⚪" }));
    const target = opts[Math.floor(Math.random() * opts.length)] ?? opts[0]!;
    return { opts: shuffle(opts), target };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);
  const { level, poke } = useIdleHint(roundIdx);
  const ask = () =>
    speak(cade(board.target.color.label));

  useEffect(() => {
    ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  const handle = (o: (typeof board.opts)[number]) => {
    poke();
    if (o.color.id === board.target.color.id) {
      if (!lock.tryLock()) return;
      setHit(o.color.id);
      sounds.yay();
      speak(board.target.color.label, ...(Math.random() < 0.4 ? [{ en: COLOR_EN[board.target.color.id] ?? "" }] : []), praise());
      window.setTimeout(() => {
        if (roundIdx + 1 >= 3) onComplete();
        else {
          setHit(null);
          setHelp(false);
          setRoundIdx((r) => r + 1);
          window.setTimeout(lock.release, 250);
        }
      }, 1000);
    } else {
      if (hit) return;
      setWrong(o.color.id);
      setHelp(true);
      sounds.gentle();
      speak(o.color.label, encourage());
      window.setTimeout(() => setWrong(null), 500);
      window.setTimeout(() => setHelp(false), 1600);
    }
  };

  return (
    <>
      <Prompt>
        <span className="block h-16 w-16 rounded-full shadow-soft" style={{ background: board.target.color.bg }} />
        <span className="text-4xl">🔎</span>
      </Prompt>
      <TileGrid cols={board.opts.length > 2 ? 3 : 2}>
        {board.opts.map((o) => (
          <Tile
            key={o.color.id}
            onClick={() => handle(o)}
            hint={(level > 0 || help) && o.color.id === board.target.color.id && !hit}
            state={hit === o.color.id ? "happy" : wrong === o.color.id ? "wiggle" : "idle"}
          >
            {o.emoji}
          </Tile>
        ))}
      </TileGrid>
    </>
  );
}

/* ---------------- English: see, hear, touch ---------------- */
const PT_OF: Record<string, string> = {
  cachorro: "Cachorrinho!", gato: "Gatinho!", vaca: "Vaquinha!", pato: "Patinho!", peixe: "Peixinho!",
  passarinho: "Passarinho!", leao: "Leão!", bola: "Bola!", maca: "Maçã!", estrela: "Estrela!", sol: "Sol!",
  vermelho: "Vermelho!", azul: "Azul!", amarelo: "Amarelo!", verde: "Verde!",
};
export function EnglishWordsActivity({ onComplete, pool }: ActivityProps & { pool: Item[] }) {
  const items = useMemo(() => pick(pool, 3), [pool]);
  const [idx, setIdx] = useState(0);
  const [tapped, setTapped] = useState(false);
  const lock = useLock();
  const { level, poke } = useIdleHint(idx);
  const item = items[idx];

  useEffect(() => {
    if (!item) return;
    setTapped(false);
    lock.release();
    const t = window.setTimeout(() => speakEn(`${item.en ?? item.label}!`), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => {
    if (level === 2 && item) speakEn(`${item.en ?? item.label}!`);
  }, [level, item]);

  const handle = () => {
    poke();
    if (!item || !lock.tryLock()) return;
    setTapped(true);
    const fn = animalSounds[item.id] ?? thingSounds[item.id];
    if (fn) fn();
    else sounds.sparkle();
    window.setTimeout(() => {
      const pt = PT_OF[item.id];
      if (pt && Math.random() < 0.35) speak({ en: `${item.en ?? item.label}!` }, pt);
      else speakEn(`${item.en ?? item.label}!`);
    }, 650);
    window.setTimeout(() => {
      if (idx + 1 >= items.length) finish(onComplete, 0);
      else setIdx((i) => i + 1);
    }, 1900);
  };

  if (!item) return null;
  return (
    <>
      <Prompt>
        <span className="text-4xl">🇬🇧</span>
        <span className="text-4xl font-black text-foreground">{item.en ?? item.label}</span>
      </Prompt>
      <button
        key={idx}
        type="button"
        onClick={handle}
        style={item.bg ? { background: item.bg } : {}}
        className={[
          "flex h-64 w-64 items-center justify-center rounded-full text-[9rem] shadow-soft transition-transform active:scale-95",
          item.bg ? "" : "bg-card",
          tapped ? "animate-pop" : level > 0 ? "animate-bob ring-4 ring-primary/40" : "animate-float",
        ].join(" ")}
        aria-label={item.en ?? item.label}
      >
        {item.emoji ?? ""}
      </button>
    </>
  );
}

export const englishColors = (round: number): Item[] =>
  colorPool(round).map((c) => ({ ...c, en: COLOR_EN[c.id] ?? c.label }));

/* ---------------- English numbers: one, two, three ---------------- */
export function EnglishNumbersActivity({ onComplete }: ActivityProps) {
  const [n, setN] = useState(1);
  const item = useMemo(() => pick([...FRUITS, ...NATURE], 1)[0] ?? FRUITS[0]!, [n]);
  const [tapped, setTapped] = useState<number[]>([]);
  const tappedRef = useRef<number[]>([]);
  const lock = useLock();

  useEffect(() => {
    setTapped([]);
    tappedRef.current = [];
    lock.release();
    speakEn(EN_NUMBERS[n - 1] ?? "One");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const handle = (i: number) => {
    if (tappedRef.current.includes(i)) return;
    tappedRef.current = [...tappedRef.current, i];
    setTapped(tappedRef.current);
    playTone(400 + tappedRef.current.length * 120, 0.2, "triangle");
    speakEn(EN_NUMBERS[tappedRef.current.length - 1] ?? "");
    if (tappedRef.current.length === n && lock.tryLock()) {
      window.setTimeout(() => {
        sounds.yay();
        speakEn(`${EN_NUMBERS[n - 1]}!`);
        window.setTimeout(() => {
          if (n >= 3) finish(onComplete, 0);
          else setN((x) => x + 1);
        }, 1000);
      }, 600);
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-4xl">🇬🇧</span>
        <span className="text-4xl font-black text-foreground">{EN_NUMBERS[n - 1]}</span>
      </Prompt>
      <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-4">
        {Array.from({ length: n }).map((_, i) => (
          <button
            key={`${n}-${i}`}
            type="button"
            onClick={() => handle(i)}
            className={[
              "flex h-32 w-32 items-center justify-center rounded-4xl bg-card text-[4rem] shadow-soft transition-transform active:scale-95",
              tapped.includes(i) ? "animate-pop opacity-60" : "animate-bob",
            ].join(" ")}
          >
            {item.emoji}
          </button>
        ))}
      </div>
    </>
  );
}
