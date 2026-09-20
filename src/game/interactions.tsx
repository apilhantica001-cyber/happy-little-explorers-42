import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Prompt } from "./ui";
import { pick, shuffle } from "./shuffle";
import { animalSounds, sounds, speak } from "./audio";
import { ANIMALS, FRUITS, NATURE, OBJECTS, SHAPES, praise, type Item } from "./data";
import { useIdleHint } from "./useIdleHint";

export type ActivityProps = { onComplete: () => void; round: number };

export function playAnimal(item: Item) {
  const fn = animalSounds[item.id];
  if (fn) fn();
  else sounds.pop();
  window.setTimeout(() => speak(item.say ?? item.label), 700);
}

type Pos = { x: number; y: number };

function useBox() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 360, h: 520 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return { ref, box };
}

/* ---------------- Drag: fruits into the basket ---------------- */
function DragTarget({
  emoji,
  home,
  onDrop,
  containerRef,
  hint,
  placed,
  size = 96,
}: {
  emoji: string;
  home: Pos;
  onDrop: (p: Pos) => boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  hint?: boolean;
  placed?: Pos | null;
  size?: number;
}) {
  const [pos, setPos] = useState<Pos>(home);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (placed) setPos(placed);
  }, [placed]);

  const toLocal = (e: ReactPointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2 };
  };

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        if (placed) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
        sounds.tap();
        setPos(toLocal(e));
      }}
      onPointerMove={(e) => {
        if (!dragging || placed) return;
        setPos(toLocal(e));
      }}
      onPointerUp={(e) => {
        if (!dragging || placed) return;
        setDragging(false);
        const p = toLocal(e);
        const accepted = onDrop({ x: p.x + size / 2, y: p.y + size / 2 });
        if (!accepted) setPos(home);
      }}
      style={{
        left: pos.x,
        top: pos.y,
        width: size,
        height: size,
        touchAction: "none",
      }}
      className={[
        "absolute flex items-center justify-center rounded-full bg-card/90 text-[3.2rem] shadow-soft",
        dragging ? "scale-110" : "transition-all duration-300",
        hint && !dragging && !placed ? "animate-bob ring-4 ring-primary/50" : "",
        placed ? "animate-pop" : "",
      ].join(" ")}
    >
      {emoji}
    </button>
  );
}

export function BasketActivity({ onComplete }: ActivityProps) {
  const { ref, box } = useBox();
  const items = useMemo(() => pick(FRUITS, 3), []);
  const [placed, setPlaced] = useState<string[]>([]);
  const { level, poke } = useIdleHint(placed.length);

  useEffect(() => {
    speak("Coloque as frutinhas na cestinha!");
  }, []);

  const basket: Pos = { x: box.w / 2, y: box.h - 90 };

  const homes = items.map((_, i) => ({
    x: 20 + i * ((box.w - 140) / Math.max(1, items.length - 1)),
    y: 30 + (i % 2) * 70,
  }));

  return (
    <>
      <Prompt>
        <span className="text-5xl">🍓</span>
        <span className="text-4xl">➡️</span>
        <span className="text-5xl">🧺</span>
      </Prompt>
      <div ref={ref} className="relative h-[58dvh] w-full max-w-md">
        <div
          className="absolute flex h-40 w-40 items-center justify-center rounded-4xl bg-card/70 text-[5rem] shadow-soft"
          style={{ left: basket.x - 80, top: basket.y - 80 }}
        >
          🧺
        </div>
        {items.map((item, i) => (
          <DragTarget
            key={item.id}
            emoji={item.emoji!}
            home={homes[i]!}
            containerRef={ref}
            hint={level > 0 && !placed.includes(item.id)}
            placed={
              placed.includes(item.id)
                ? { x: basket.x - 48 + (i - 1) * 26, y: basket.y - 70 }
                : null
            }
            onDrop={(p) => {
              poke();
              const dist = Math.hypot(p.x - basket.x, p.y - basket.y);
              const radius = level >= 2 ? 240 : 150;
              if (dist < radius) {
                sounds.snap();
                speak(praise());
                const next = [...placed, item.id];
                setPlaced(next);
                if (next.length === items.length) {
                  window.setTimeout(() => {
                    sounds.cheer();
                    onComplete();
                  }, 900);
                }
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

/* ---------------- Fit shapes into matching slots ---------------- */
export function ShapeFitActivity({ onComplete }: ActivityProps) {
  const { ref, box } = useBox();
  const items = useMemo(() => pick(SHAPES, 3), []);
  const slotOrder = useMemo(() => shuffle(items), [items]);
  const [placed, setPlaced] = useState<string[]>([]);
  const { level, poke } = useIdleHint(placed.length);

  useEffect(() => {
    speak("Encaixe as formas!");
  }, []);

  const slotPos = (i: number): Pos => ({
    x: (box.w / (slotOrder.length + 1)) * (i + 1),
    y: 90,
  });

  return (
    <>
      <Prompt>
        <span className="text-5xl">🧩</span>
        <span className="text-4xl">👇</span>
      </Prompt>
      <div ref={ref} className="relative h-[58dvh] w-full max-w-md">
        {slotOrder.map((s, i) => {
          const p = slotPos(i);
          return (
            <div
              key={s.id}
              style={{ left: p.x - 55, top: p.y - 55 }}
              className="absolute flex h-28 w-28 items-center justify-center rounded-4xl border-4 border-dashed border-card bg-card/30 text-[3rem] opacity-60"
            >
              {s.emoji}
            </div>
          );
        })}
        {items.map((item, i) => {
          const slotIdx = slotOrder.findIndex((s) => s.id === item.id);
          const target = slotPos(slotIdx);
          return (
            <DragTarget
              key={item.id}
              emoji={item.emoji!}
              home={{ x: 16 + i * ((box.w - 120) / 2), y: box.h - 130 }}
              containerRef={ref}
              hint={level > 0 && !placed.includes(item.id)}
              placed={placed.includes(item.id) ? { x: target.x - 48, y: target.y - 48 } : null}
              onDrop={(p) => {
                poke();
                const dist = Math.hypot(p.x - target.x, p.y - target.y);
                if (dist < (level >= 2 ? 180 : 110)) {
                  sounds.snap();
                  speak(praise());
                  const next = [...placed, item.id];
                  setPlaced(next);
                  if (next.length === items.length) {
                    window.setTimeout(() => {
                      sounds.cheer();
                      onComplete();
                    }, 900);
                  }
                  return true;
                }
                sounds.gentle();
                return false;
              }}
            />
          );
        })}
      </div>
    </>
  );
}

/* ---------------- Swipe: guide the star to the goal ---------------- */
export function SwipeStarActivity({ onComplete }: ActivityProps) {
  const { ref, box } = useBox();
  const [roundIdx, setRoundIdx] = useState(0);
  const goal = useMemo(() => pick(NATURE, 1)[0]!, [roundIdx]);
  const [pos, setPos] = useState<Pos>({ x: 60, y: 60 });
  const [won, setWon] = useState(false);
  const { level, poke } = useIdleHint(roundIdx);

  const goalPos: Pos = useMemo(
    () => ({ x: box.w - 80, y: box.h - 100 }),
    [box.w, box.h, roundIdx],
  );

  useEffect(() => {
    setPos({ x: 60, y: 60 });
    setWon(false);
    speak("Deslize o dedinho até a estrela chegar lá!");
  }, [roundIdx]);

  const move = (e: ReactPointerEvent) => {
    if (won) return;
    if (e.buttons === 0 && e.pointerType === "mouse") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setPos(p);
    poke();
    if (Math.hypot(p.x - goalPos.x, p.y - goalPos.y) < 80) {
      setWon(true);
      sounds.sparkle();
      speak(praise());
      window.setTimeout(() => {
        if (roundIdx + 1 >= 2) {
          sounds.cheer();
          onComplete();
        } else setRoundIdx((r) => r + 1);
      }, 1100);
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-5xl">⭐</span>
        <span className="text-4xl">➡️</span>
        <span className="text-5xl">{goal.emoji}</span>
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
            level > 0 ? "animate-bob" : ""
          }`}
          style={{ left: goalPos.x - 56, top: goalPos.y - 56 }}
        >
          {goal.emoji}
        </div>
        <div
          className={`pointer-events-none absolute text-[4.5rem] transition-transform ${
            won ? "animate-pop" : "animate-bob"
          }`}
          style={{ left: pos.x - 40, top: pos.y - 40 }}
        >
          ⭐
        </div>
      </div>
    </>
  );
}

/* ---------------- Surprise boxes ---------------- */
export function SurpriseBoxActivity({ onComplete }: ActivityProps) {
  const boxes = useMemo(
    () => pick(ANIMALS, 3).map((a, i) => ({ ...a, key: `${a.id}-${i}` })),
    [],
  );
  const [open, setOpen] = useState<string[]>([]);
  const { level, poke } = useIdleHint(open.length);

  useEffect(() => {
    speak("O que tem dentro? Toque para descobrir!");
  }, []);

  const handle = (b: (typeof boxes)[number]) => {
    poke();
    if (open.includes(b.key)) {
      playAnimal(b);
      return;
    }
    sounds.sparkle();
    const next = [...open, b.key];
    setOpen(next);
    window.setTimeout(() => playAnimal(b), 300);
    if (next.length === boxes.length) {
      window.setTimeout(() => {
        sounds.cheer();
        onComplete();
      }, 1800);
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-5xl">🎁</span>
        <span className="text-4xl">❓</span>
      </Prompt>
      <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-4">
        {boxes.map((b) => {
          const isOpen = open.includes(b.key);
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => handle(b)}
              className={[
                "flex h-36 w-36 items-center justify-center rounded-4xl bg-card text-[4.5rem] shadow-soft transition-transform active:scale-95",
                isOpen ? "animate-pop" : level > 0 ? "animate-bob" : "",
              ].join(" ")}
            >
              {isOpen ? b.emoji : "🎁"}
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- Curtain: swipe to reveal the animal ---------------- */
export function CurtainActivity({ onComplete }: ActivityProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const hidden = useMemo(() => pick([...ANIMALS, ...OBJECTS], 1)[0]!, [roundIdx]);
  const [reveal, setReveal] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const { level, poke } = useIdleHint(roundIdx);

  useEffect(() => {
    setReveal(0);
    setDone(false);
    speak("Deslize a cortina para ver quem está escondido!");
  }, [roundIdx]);

  const move = (e: ReactPointerEvent) => {
    if (done) return;
    if (e.buttons === 0 && e.pointerType === "mouse" && e.type === "pointermove") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    if (pct > reveal) {
      setReveal(pct);
      if (pct > 12 && pct % 2 < 1) sounds.swipe();
    }
    poke();
    if (pct > 70) {
      setDone(true);
      setReveal(100);
      if (animalSounds[hidden.id]) playAnimal(hidden);
      else {
        sounds.sparkle();
        speak(hidden.label);
      }
      window.setTimeout(() => {
        if (roundIdx + 1 >= 2) {
          sounds.cheer();
          onComplete();
        } else setRoundIdx((r) => r + 1);
      }, 1800);
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-5xl">👋</span>
        <span className="text-4xl">➡️</span>
        <span className="text-5xl">🪟</span>
      </Prompt>
      <div
        ref={ref}
        onPointerMove={move}
        onPointerDown={move}
        style={{ touchAction: "none" }}
        className="relative h-[48dvh] w-full max-w-md overflow-hidden rounded-4xl bg-card/60 shadow-soft"
      >
        <div className="absolute inset-0 flex items-center justify-center text-[8rem]">
          <span className={done ? "animate-pop" : ""}>{hidden.emoji}</span>
        </div>
        <div
          className={`absolute inset-y-0 left-0 flex items-center justify-end pr-3 text-5xl transition-[width] duration-150 ${
            level > 0 && reveal < 10 ? "animate-bob" : ""
          }`}
          style={{
            width: `${100 - reveal}%`,
            background: "var(--gradient-card)",
          }}
        >
          {reveal < 90 ? "👉" : ""}
        </div>
      </div>
    </>
  );
}
