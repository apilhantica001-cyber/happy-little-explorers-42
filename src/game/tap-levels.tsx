import { useEffect, useMemo, useRef, useState } from "react";
import { Prompt } from "./ui";
import { pick, shuffle } from "./shuffle";
import { playAnimalSound, sounds, speak, speakEn } from "./audio";
import { useIdleHint } from "./useIdleHint";
import type { ActivityProps } from "./interactions";

/** "Tap each thing to transform it" engine: eggs hatch, seeds grow, corn pops... */
type Setup = { say: string; from: string; to: string[]; n: number; animal?: string; bg?: string; en?: string };
export type TapLevel = { id: string; icon: string; make: (round: number) => Setup };

export const TAP_LEVELS: TapLevel[] = [
  { id: "t-ovos", icon: "🐣", make: (r) => ({ say: "Toque nos ovinhos para nascer os pintinhos!", from: "🥚", to: ["🐣", "🐥"], n: r ? 4 : 3, animal: "galinha" }) },
  { id: "t-sementes", icon: "🌱", make: (r) => ({ say: "Toque nas plantinhas para crescer as flores!", from: "🌱", to: ["🌻", "🌷", "🌼", "🌹"], n: r ? 4 : 3, bg: "oklch(0.88 0.1 140)" }) },
  { id: "t-pipoca", icon: "🍿", make: () => ({ say: "Vamos fazer pipoca! Toque no milho!", from: "🌽", to: ["🍿"], n: 4 }) },
  { id: "t-estrelas", icon: "⭐", make: (r) => ({ say: "Acenda as estrelinhas!", from: "✨", to: ["⭐", "🌟"], n: r ? 5 : 4, bg: "oklch(0.35 0.08 270)" }) },
  { id: "t-presentes", icon: "🎁", make: () => ({ say: "Abra os presentes!", from: "🎁", to: shuffle(["🧸", "⚽", "🚗", "🪀", "🎈", "🪁"]), n: 3 }) },
  { id: "t-acordar", icon: "😴", make: () => ({ say: "Os bichinhos estão dormindo. Toque para acordar!", from: "😴", to: pick(["🐶", "🐱", "🐰", "🐻", "🐼", "🐷"], 4), n: 3 }) },
  { id: "t-chuva", icon: "🌧️", make: () => ({ say: "Toque nas nuvens para chover!", from: "☁️", to: ["🌧️"], n: 3, bg: "oklch(0.85 0.06 230)" }) },
  { id: "t-luzes", icon: "💡", make: (r) => ({ say: "Acenda as luzes!", from: "🌑", to: ["🌕"], n: r ? 4 : 3, bg: "oklch(0.3 0.05 260)" }) },
];

export function TapLevelActivity({ onComplete, round, level: def }: ActivityProps & { level: TapLevel }) {
  const s = useMemo(() => def.make(round), [def, round]);
  const [done, setDone] = useState<Record<number, string>>({});
  const finished = useRef(false);
  const doneRef = useRef<Record<number, string>>({});
  const { level, poke } = useIdleHint(Object.keys(done).length);

  useEffect(() => {
    if (s.en) void speakEn(s.en);
    else void speak(s.say);
  }, [s]);

  const tap = (i: number) => {
    poke();
    if (doneRef.current[i] || finished.current) return;
    const to = s.to[Object.keys(doneRef.current).length % s.to.length] ?? s.from;
    const next = { ...doneRef.current, [i]: to };
    doneRef.current = next;
    setDone(next);
    sounds.pop();
    if (s.en) void speakEn(s.en);
    const n = Object.keys(next).length;
    if (s.animal && n === 1) void playAnimalSound(s.animal);
    if (n === s.n) {
      finished.current = true;
      window.setTimeout(() => sounds.sparkle(), 300);
      window.setTimeout(onComplete, 1300);
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-5xl">{s.from}</span>
        <span className="text-4xl">👆</span>
        <span className="text-5xl">{s.to[0]}</span>
      </Prompt>
      <div
        className="grid w-full max-w-md grid-cols-2 gap-4 rounded-4xl bg-card/30 p-4 shadow-soft"
        style={s.bg ? { background: s.bg } : undefined}
      >
        {Array.from({ length: s.n }, (_, i) => (
          <button
            key={i}
            type="button"
            data-hint-target={!done[i] ? "true" : undefined}
            onPointerDown={() => tap(i)}
            aria-label={s.from}
            className={[
              "flex aspect-square items-center justify-center text-[clamp(4rem,20vw,6rem)]",
              done[i] ? "animate-pop" : level > 0 ? "animate-bob" : "",
            ].join(" ")}
          >
            {done[i] ?? s.from}
          </button>
        ))}
      </div>
    </>
  );
}
