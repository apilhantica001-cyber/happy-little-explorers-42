import { useEffect, useMemo, useRef, useState } from "react";
import { Prompt } from "./ui";
import { pick, shuffle } from "./shuffle";
import { playAnimalSound, sounds, speak } from "./audio";
import { useIdleHint } from "./useIdleHint";
import { DragTarget, useBox, type ActivityProps } from "./interactions";

/**
 * Generic "hold and drag to the right place" engine.
 * Each level is a small config generator; the engine handles drop checks,
 * idle hints, moving targets, ordered stacking and a single completion.
 */
type Tgt = {
  key: string;
  emoji: string;
  x: number; // 0..1 of the play box
  y: number;
  slot?: boolean; // holds exactly one piece, piece replaces it
  shadow?: boolean; // show as silhouette
  move?: number; // horizontal swing amplitude (0..0.4)
  bg?: string;
  big?: boolean;
  animal?: string; // play this animal sound when fed
};
type Pc = { emoji: string; key: string };
type Setup = {
  say: string;
  prompt: [string, string];
  targets: Tgt[];
  pieces: Pc[];
  ordered?: boolean; // slots must be filled in array order
  count?: boolean; // narrator counts 1,2,3
  radius?: number;
};

type Level = { id: string; icon: string; make: (round: number) => Setup };

const shadowSlots = (pieces: Pc[], y = 0.72): Tgt[] =>
  shuffle(pieces).map((p, i, a) => ({
    key: p.key,
    emoji: p.emoji,
    slot: true,
    shadow: true,
    x: (i + 0.5) / a.length,
    y,
  }));

export const DRAG_LEVELS: Level[] = [
  {
    id: "d-osso",
    icon: "🦴",
    make: () => ({
      say: "Leve o ossinho para o cachorrinho!",
      prompt: ["🦴", "🐶"],
      pieces: [{ emoji: "🦴", key: "dog" }],
      targets: [{ key: "dog", emoji: "🐶", x: 0.5, y: 0.75, big: true, animal: "cachorro" }],
      radius: 140,
    }),
  },
  {
    id: "d-comida",
    icon: "🥕",
    make: (r) => {
      const all = [
        { food: "🦴", who: "🐶", a: "cachorro" },
        { food: "🐟", who: "🐱", a: "gato" },
        { food: "🌽", who: "🐔", a: "galinha" },
        { food: "🌾", who: "🐮", a: "vaca" },
        { food: "🍌", who: "🐵", a: "macaco" },
      ];
      const set = pick(all, r > 0 ? 3 : 2);
      return {
        say: "Cada bichinho come uma coisa!",
        prompt: ["🍽️", "🐾"],
        pieces: set.map((s) => ({ emoji: s.food, key: s.a })),
        targets: set.map((s, i) => ({ key: s.a, emoji: s.who, x: (i + 0.5) / set.length, y: 0.74, animal: s.a })),
      };
    },
  },
  {
    id: "d-sombras",
    icon: "👤",
    make: (r) => {
      const p = pick(["🐶", "🐱", "🐘", "🦒", "🐢", "🦆", "🐰", "🦁"], r > 0 ? 3 : 2).map((e) => ({ emoji: e, key: e }));
      return { say: "Leve cada bichinho até a sua sombra!", prompt: ["🐘", "👤"], pieces: p, targets: shadowSlots(p) };
    },
  },
  {
    id: "d-garagem",
    icon: "🚗",
    make: () => {
      const p = pick(["🚗", "🚌", "🚒", "🚜", "🚓", "🚑"], 3).map((e) => ({ emoji: e, key: e }));
      return { say: "Estacione os carrinhos!", prompt: ["🚗", "🅿️"], pieces: p, targets: shadowSlots(p, 0.75) };
    },
  },
  {
    id: "d-cores",
    icon: "🔴",
    make: (r) => {
      const all = [
        { p: "🔴", t: "🟥", k: "r" },
        { p: "🔵", t: "🟦", k: "b" },
        { p: "🟡", t: "🟨", k: "y" },
        { p: "🟢", t: "🟩", k: "g" },
        { p: "🟣", t: "🟪", k: "p" },
      ];
      const set = pick(all, r > 0 ? 3 : 2);
      const pieces = shuffle(set.flatMap((s) => [{ emoji: s.p, key: s.k }, ...(r > 0 ? [] : [{ emoji: s.p, key: s.k }])]));
      return {
        say: "Cada bolinha na sua cor!",
        prompt: ["🔴", "🟥"],
        pieces: pieces.slice(0, 4),
        targets: set.map((s, i) => ({ key: s.k, emoji: s.t, x: (i + 0.5) / set.length, y: 0.75, big: true })),
      };
    },
  },
  {
    id: "d-casinhas",
    icon: "🪺",
    make: () => {
      const all = [
        { a: "🐦", h: "🪺", s: "passarinho" },
        { a: "🐟", h: "🌊", s: "peixe" },
        { a: "🐶", h: "🏠", s: "cachorro" },
        { a: "🐝", h: "🌻", s: "" },
        { a: "🐸", h: "🪷", s: "sapo" },
      ];
      const set = pick(all, 3);
      return {
        say: "Leve cada bichinho para a sua casinha!",
        prompt: ["🐦", "🪺"],
        pieces: set.map((s) => ({ emoji: s.a, key: s.h })),
        targets: set.map((s, i) => ({ key: s.h, emoji: s.h, x: (i + 0.5) / 3, y: 0.75, animal: s.s || undefined })),
      };
    },
  },
  {
    id: "d-lixeira",
    icon: "🗑️",
    make: () => ({
      say: "Vamos arrumar! Tudo no lixinho!",
      prompt: ["🍌", "🗑️"],
      pieces: pick(["🍌", "🥤", "📄", "🍎", "🧃"], 3).map((e) => ({ emoji: e, key: "lixo" })),
      targets: [{ key: "lixo", emoji: "🗑️", x: 0.5, y: 0.76, big: true }],
      count: true,
    }),
  },
  {
    id: "d-dia-noite",
    icon: "🌙",
    make: () => ({
      say: "O sol no dia, a lua na noite!",
      prompt: ["🌞", "🌙"],
      pieces: shuffle([
        { emoji: "🌞", key: "dia" },
        { emoji: "🌙", key: "noite" },
        { emoji: "⭐", key: "noite" },
        { emoji: "🌈", key: "dia" },
      ]),
      targets: [
        { key: "dia", emoji: "🏞️", x: 0.27, y: 0.74, big: true, bg: "oklch(0.9 0.1 90)" },
        { key: "noite", emoji: "🌃", x: 0.73, y: 0.74, big: true, bg: "oklch(0.45 0.1 270)" },
      ],
    }),
  },
  {
    id: "d-torre",
    icon: "🧱",
    make: (r) => {
      const blocks = ["🟥", "🟧", "🟨", "🟩"].slice(0, r > 0 ? 4 : 3);
      return {
        say: "Vamos montar uma torre!",
        prompt: ["🧱", "⬆️"],
        ordered: true,
        count: true,
        pieces: shuffle(blocks).map((e) => ({ emoji: e, key: "bloco" })),
        targets: blocks.map((_, i) => ({ key: "bloco", emoji: "⬜", slot: true, shadow: true, x: 0.5, y: 0.86 - i * 0.13 })),
        radius: 90,
      };
    },
  },
  {
    id: "d-bola-movel",
    icon: "⚽",
    make: (r) => ({
      say: "O cachorrinho quer a bola!",
      prompt: ["⚽", "🐶"],
      pieces: [{ emoji: "⚽", key: "dog" }],
      targets: [{ key: "dog", emoji: "🐶", x: 0.5, y: 0.74, big: true, move: Math.min(0.3, 0.18 + r * 0.04), animal: "cachorro" }],
      radius: 130,
    }),
  },
  {
    id: "d-macas",
    icon: "🍎",
    make: () => ({
      say: "Coloque as maçãs de volta na árvore!",
      prompt: ["🍎", "🌳"],
      pieces: [0, 1, 2].map(() => ({ emoji: "🍎", key: "m" })),
      targets: [
        { key: "tree", emoji: "🌳", x: 0.5, y: 0.66, big: true },
        { key: "m", emoji: "🍎", slot: true, shadow: true, x: 0.35, y: 0.55 },
        { key: "m", emoji: "🍎", slot: true, shadow: true, x: 0.62, y: 0.52 },
        { key: "m", emoji: "🍎", slot: true, shadow: true, x: 0.5, y: 0.7 },
      ],
      count: true,
      radius: 80,
    }),
  },
  {
    id: "d-banho",
    icon: "🛁",
    make: () => ({
      say: "Hora do banho!",
      prompt: ["🦆", "🛁"],
      pieces: pick(["🦆", "🧽", "🧸", "🐠", "🫧"], 3).map((e) => ({ emoji: e, key: "banho" })),
      targets: [{ key: "banho", emoji: "🛁", x: 0.5, y: 0.76, big: true }],
    }),
  },
  {
    id: "d-dormir",
    icon: "🛏️",
    make: () => ({
      say: "Os bichinhos estão com sono. Leve para a caminha!",
      prompt: ["😴", "🛏️"],
      pieces: pick(["🐶", "🐱", "🐰", "🐻", "🐼"], 3).map((e) => ({ emoji: e, key: "cama" })),
      targets: [{ key: "cama", emoji: "🛏️", x: 0.5, y: 0.76, big: true }],
    }),
  },
  {
    id: "d-pares",
    icon: "🧦",
    make: () => {
      const p = pick(["🧦", "🧤", "👟", "🧢", "👕", "👗"], 3).map((e) => ({ emoji: e, key: e }));
      return {
        say: "Encontre o par igual!",
        prompt: ["🧦", "🧦"],
        pieces: p,
        targets: shuffle(p).map((x, i) => ({ key: x.key, emoji: x.emoji, x: (i + 0.5) / 3, y: 0.75 })),
      };
    },
  },
  {
    id: "d-foguete",
    icon: "🚀",
    make: (r) => ({
      say: "Leve o foguete até a lua!",
      prompt: ["🚀", "🌙"],
      pieces: [{ emoji: "🚀", key: "lua" }],
      targets: [
        { key: "lua", emoji: "🌙", x: 0.5, y: 0.72, big: true, move: 0.22 + Math.min(0.12, r * 0.04), bg: "oklch(0.35 0.08 270)" },
      ],
      radius: 120,
    }),
  },
  {
    id: "d-flores",
    icon: "🌷",
    make: () => ({
      say: "Coloque as flores no vaso!",
      prompt: ["🌷", "🏺"],
      pieces: pick(["🌷", "🌹", "🌻", "🌼", "🌸"], 3).map((e) => ({ emoji: e, key: "vaso" })),
      targets: [{ key: "vaso", emoji: "🏺", x: 0.5, y: 0.76, big: true }],
    }),
  },
  {
    id: "d-ovos",
    icon: "🥚",
    make: () => ({
      say: "Leve os ovinhos para o ninho!",
      prompt: ["🥚", "🪺"],
      pieces: [0, 1, 2].map(() => ({ emoji: "🥚", key: "ninho" })),
      targets: [{ key: "ninho", emoji: "🪺", x: 0.5, y: 0.76, big: true, animal: "galinha" }],
      count: true,
    }),
  },
  {
    id: "d-mar-ceu",
    icon: "🌊",
    make: () => ({
      say: "Quem nada vai pro mar, quem voa vai pro céu!",
      prompt: ["🐟", "☁️"],
      pieces: shuffle([
        { emoji: "🐟", key: "mar" },
        { emoji: "🐙", key: "mar" },
        { emoji: "🐦", key: "ceu" },
        { emoji: "🦋", key: "ceu" },
      ]),
      targets: [
        { key: "ceu", emoji: "☁️", x: 0.27, y: 0.74, big: true, bg: "oklch(0.88 0.08 230)" },
        { key: "mar", emoji: "🌊", x: 0.73, y: 0.74, big: true, bg: "oklch(0.7 0.12 240)" },
      ],
    }),
  },
  {
    id: "d-pizza",
    icon: "🍕",
    make: () => ({
      say: "Vamos fazer uma pizza!",
      prompt: ["🍅", "🍕"],
      pieces: pick(["🍅", "🧀", "🍄", "🫒", "🌿"], 3).map((e) => ({ emoji: e, key: "pizza" })),
      targets: [{ key: "pizza", emoji: "🍕", x: 0.5, y: 0.76, big: true }],
    }),
  },
  {
    id: "d-frutas-cores",
    icon: "🍌",
    make: () => ({
      say: "Cada fruta no seu cestinho!",
      prompt: ["🍌", "🟨"],
      pieces: shuffle([
        { emoji: "🍌", key: "y" },
        { emoji: "🍋", key: "y" },
        { emoji: "🍓", key: "r" },
        { emoji: "🍎", key: "r" },
      ]),
      targets: [
        { key: "y", emoji: "🧺", x: 0.27, y: 0.74, big: true, bg: "oklch(0.9 0.15 95)" },
        { key: "r", emoji: "🧺", x: 0.73, y: 0.74, big: true, bg: "oklch(0.75 0.17 25)" },
      ],
    }),
  },
  {
    id: "d-peixe-movel",
    icon: "🐱",
    make: (r) => ({
      say: "O gatinho quer o peixinho!",
      prompt: ["🐟", "🐱"],
      pieces: [0, 1].map(() => ({ emoji: "🐟", key: "cat" })),
      targets: [{ key: "cat", emoji: "🐱", x: 0.5, y: 0.75, big: true, move: 0.2 + Math.min(0.12, r * 0.04), animal: "gato" }],
      radius: 120,
    }),
  },
  {
    id: "d-carrinhos",
    icon: "🚙",
    make: () => {
      const set = pick(
        [
          { p: "🚗", t: "🟥", k: "r" },
          { p: "🚙", t: "🟦", k: "b" },
          { p: "🚕", t: "🟨", k: "y" },
          { p: "🚜", t: "🟩", k: "g" },
        ],
        3,
      );
      return {
        say: "Cada carrinho na garagem da sua cor!",
        prompt: ["🚗", "🟥"],
        pieces: set.map((s) => ({ emoji: s.p, key: s.k })),
        targets: shuffle(set).map((s, i) => ({ key: s.k, emoji: s.t, x: (i + 0.5) / 3, y: 0.76, big: true })),
      };
    },
  },
];

export function DragLevelActivity({ onComplete, round, level: def }: ActivityProps & { level: Level }) {
  const { ref, box } = useBox();
  const setup = useMemo(() => def.make(round), [def, round]);
  const [placed, setPlaced] = useState<Record<number, number>>({}); // piece idx -> target idx
  const [bump, setBump] = useState<number | null>(null);
  const [t, setT] = useState(0);
  const tRef = useRef(0);
  const done = useRef(false);
  const count = Object.keys(placed).length;
  const { level, poke } = useIdleHint(count);
  const moving = setup.targets.some((x) => x.move);
  const size = Math.min(84, box.w / (setup.pieces.length + 0.8));

  useEffect(() => {
    void speak(setup.say);
  }, [setup]);

  useEffect(() => {
    if (!moving) return;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      // slows down when the child needs help
      tRef.current = (now - start) / 1000;
      setT(tRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [moving]);

  const speed = level >= 2 ? 0.25 : level === 1 ? 0.6 : 1;
  const tPos = (tg: Tgt, time = t) => ({
    x: (tg.x + (tg.move ? Math.sin(time * 1.3 * speed) * tg.move : 0)) * box.w,
    y: tg.y * box.h,
  });

  const filled = (ti: number) => Object.values(placed).filter((v) => v === ti).length;

  const tryDrop = (pi: number, p: { x: number; y: number }) => {
    poke();
    if (done.current) return false;
    const piece = setup.pieces[pi];
    if (!piece) return false;
    const radius = (setup.radius ?? 110) + (level >= 2 ? 60 : 0);
    let candidates = setup.targets
      .map((tg, ti) => ({ tg, ti }))
      .filter(({ tg, ti }) => tg.key === piece.key && (!tg.slot || filled(ti) === 0));
    if (setup.ordered) candidates = candidates.slice(0, 1);
    const hit = candidates
      .map((c) => ({ ...c, d: Math.hypot(p.x - tPos(c.tg).x, p.y - tPos(c.tg).y) }))
      .filter((c) => c.d < radius)
      .sort((a, b) => a.d - b.d)[0];
    if (!hit) {
      const nearWrong = setup.targets.some((tg) => Math.hypot(p.x - tPos(tg).x, p.y - tPos(tg).y) < 90);
      if (nearWrong) sounds.gentle();
      return false;
    }
    const next = { ...placed, [pi]: hit.ti };
    setPlaced(next);
    setBump(hit.ti);
    window.setTimeout(() => setBump((b) => (b === hit.ti ? null : b)), 500);
    sounds.snap();
    const n = Object.keys(next).length;
    if (hit.tg.animal) void playAnimalSound(hit.tg.animal);
    else if (setup.count && n <= 5) void speak(String(n));
    if (n === setup.pieces.length) {
      done.current = true;
      window.setTimeout(() => sounds.sparkle(), 400);
      window.setTimeout(onComplete, 1500);
    }
    return true;
  };

  const homes = setup.pieces.map((_, i) => {
    const gap = box.w / setup.pieces.length;
    return { x: gap * i + (gap - size) / 2, y: box.h * 0.05 + (i % 2) * size * 0.5 };
  });

  return (
    <>
      <Prompt>
        <span className="text-5xl">{setup.prompt[0]}</span>
        <span className="text-4xl">👉</span>
        <span className="text-5xl">{setup.prompt[1]}</span>
      </Prompt>
      <div ref={ref} className="relative h-[60dvh] w-full max-w-md overflow-hidden rounded-4xl bg-card/30 shadow-soft">
        {setup.targets.map((tg, ti) => {
          const pos = tPos(tg);
          const dim = tg.big ? 136 : tg.slot ? size + 8 : 104;
          const occupied = tg.slot && filled(ti) > 0;
          const isHint = level > 0 && !occupied && setup.pieces.some((p, pi) => p.key === tg.key && placed[pi] === undefined);
          return (
            <div
              key={ti}
              className={[
                "pointer-events-none absolute flex items-center justify-center rounded-full",
                tg.slot ? "" : "bg-card/70 shadow-soft",
                bump === ti ? "animate-pop" : isHint && !tg.slot ? "animate-bob" : "",
              ].join(" ")}
              style={{
                left: pos.x - dim / 2,
                top: pos.y - dim / 2,
                width: dim,
                height: dim,
                fontSize: dim * 0.55,
                background: tg.bg,
              }}
            >
              <span
                style={
                  tg.shadow && !occupied
                    ? { filter: "brightness(0)", opacity: isHint ? 0.4 : 0.22 }
                    : undefined
                }
              >
                {tg.emoji}
              </span>
              {!tg.slot &&
                setup.pieces.map((p, pi) =>
                  placed[pi] === ti ? (
                    <span
                      key={pi}
                      className="animate-pop absolute"
                      style={{ fontSize: dim * 0.28, left: 8 + (pi % 4) * (dim / 4.5), top: -dim * 0.12 }}
                    >
                      {p.emoji}
                    </span>
                  ) : null,
                )}
            </div>
          );
        })}
        {setup.pieces.map((p, pi) => {
          const ti = placed[pi];
          const tg = ti !== undefined ? setup.targets[ti] : undefined;
          if (tg && !tg.slot) return null;
          const at = tg ? tPos(tg) : null;
          return (
            <DragTarget
              key={pi}
              emoji={p.emoji}
              size={size}
              home={homes[pi] ?? { x: 0, y: 0 }}
              containerRef={ref}
              placed={at ? { x: at.x - size / 2, y: at.y - size / 2 } : null}
              hint={level > 0 && ti === undefined}
              onDrop={(pt) => tryDrop(pi, pt)}
            />
          );
        })}
      </div>
    </>
  );
}
