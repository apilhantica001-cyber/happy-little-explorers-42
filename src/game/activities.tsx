import { useEffect, useMemo, useState } from "react";
import { Prompt, Tile, TileGrid } from "./ui";
import { pick, shuffle } from "./shuffle";
import { sounds, speak, playTone } from "./audio";
import {
  ANIMALS,
  BODY,
  COLORS,
  FRUITS,
  INSTRUMENTS,
  NATURE,
  OBJECTS,
  PAIRS,
  SHAPES,
  praise,
  type Item,
} from "./data";
import { useIdleHint } from "./useIdleHint";
import {
  BasketActivity,
  CurtainActivity,
  ShapeFitActivity,
  SurpriseBoxActivity,
  SwipeStarActivity,
  playAnimal,
  type ActivityProps,
} from "./interactions";

export type { ActivityProps };


/* ---------- Generic: pick the target among options ---------- */
function PickActivity({
  onComplete,
  pool,
  rounds = 3,
  options = 3,
  promptText,
}: ActivityProps & {
  pool: Item[];
  rounds?: number;
  options?: number;
  promptText: (t: Item) => string;
}) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [hit, setHit] = useState<string | null>(null);

  const board = useMemo(() => {
    const opts = pick(pool, options);
    const target = opts[Math.floor(Math.random() * opts.length)]!;
    return { opts, target };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, pool, options]);

  const { level, poke } = useIdleHint(roundIdx);

  useEffect(() => {
    speak(promptText(board.target));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  useEffect(() => {
    if (level === 1) sounds.sparkle();
    if (level === 2) speak(promptText(board.target));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const handle = (item: Item) => {
    poke();
    if (item.id === board.target.id) {
      setHit(item.id);
      sounds.yay();
      speak(praise());
      window.setTimeout(() => {
        setHit(null);
        if (roundIdx + 1 >= rounds) onComplete();
        else setRoundIdx((r) => r + 1);
      }, 900);
    } else {
      setWrong(item.id);
      sounds.gentle();
      window.setTimeout(() => setWrong(null), 500);
    }
  };

  return (
    <>
      <Prompt>
        {board.target.bg ? (
          <span
            className="block h-16 w-16 rounded-full shadow-soft"
            style={{ background: board.target.bg }}
          />
        ) : (
          <span className="text-6xl">{board.target.emoji}</span>
        )}
        <span className="text-4xl">👉</span>
      </Prompt>
      <TileGrid cols={2}>
        {board.opts.map((o) => (
          <Tile
            key={o.id}
            bg={o.bg}
            onClick={() => handle(o)}
            hint={level > 0 && o.id === board.target.id && !hit}
            state={hit === o.id ? "happy" : wrong === o.id ? "wiggle" : "idle"}
          >
            {o.emoji ?? ""}
          </Tile>
        ))}
      </TileGrid>
    </>
  );
}

/* ---------- Generic: tap everything to explore ---------- */
function ExploreActivity({
  onComplete,
  pool,
  count = 4,
  onTapSound,
  noSpeak = false,
}: ActivityProps & {
  pool: Item[];
  count?: number;
  onTapSound?: (item: Item) => void;
  noSpeak?: boolean;
}) {
  const items = useMemo(() => pick(pool, count), [pool, count]);
  const [done, setDone] = useState<string[]>([]);
  const [hit, setHit] = useState<string | null>(null);

  const handle = (item: Item) => {
    setHit(item.id);
    window.setTimeout(() => setHit(null), 600);
    if (onTapSound) onTapSound(item);
    else sounds.pop();
    if (!noSpeak) speak(item.say ?? item.label);
    if (!done.includes(item.id)) {
      const next = [...done, item.id];
      setDone(next);
      if (next.length === items.length) {
        window.setTimeout(() => {
          sounds.cheer();
          onComplete();
        }, 1000);
      }
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-5xl">👋</span>
        <span className="text-5xl">✨</span>
      </Prompt>
      <TileGrid cols={2}>
        {items.map((i) => (
          <Tile
            key={i.id}
            bg={i.bg}
            onClick={() => handle(i)}
            state={hit === i.id ? "happy" : done.includes(i.id) ? "done" : "idle"}
          >
            {i.emoji ?? ""}
          </Tile>
        ))}
      </TileGrid>
    </>
  );
}

/* ---------- Sizes: tap the big one ---------- */
function SizesActivity({ onComplete }: ActivityProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [hit, setHit] = useState<number | null>(null);

  const board = useMemo(() => {
    const item = pick([...ANIMALS, ...FRUITS, ...OBJECTS], 1)[0]!;
    const bigFirst = Math.random() > 0.5;
    return { item, bigFirst };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  useEffect(() => {
    speak("Toque no grande!");
  }, [board]);

  const handle = (idx: number) => {
    const isBig = board.bigFirst ? idx === 0 : idx === 1;
    if (isBig) {
      setHit(idx);
      sounds.yay();
      speak(praise());
      window.setTimeout(() => {
        setHit(null);
        if (roundIdx + 1 >= 3) onComplete();
        else setRoundIdx((r) => r + 1);
      }, 900);
    } else {
      setWrong(idx);
      sounds.gentle();
      speak("Esse é pequeno!");
      window.setTimeout(() => setWrong(null), 500);
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-6xl">{board.item.emoji}</span>
        <span className="text-4xl font-black text-foreground">GRANDE</span>
      </Prompt>
      <div className="flex w-full max-w-md items-center justify-around">
        {[0, 1].map((idx) => {
          const big = board.bigFirst ? idx === 0 : idx === 1;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handle(idx)}
              className={[
                "flex items-center justify-center rounded-4xl bg-card shadow-soft transition-transform active:scale-95",
                big ? "h-52 w-40 text-[7rem]" : "h-32 w-28 text-[3rem]",
                hit === idx ? "animate-pop" : "",
                wrong === idx ? "animate-wiggle" : "",
              ].join(" ")}
            >
              {board.item.emoji}
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------- Counting ---------- */
function CountActivity({ onComplete }: ActivityProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const board = useMemo(() => {
    const item = pick([...FRUITS, ...OBJECTS, ...NATURE], 1)[0]!;
    const total = 1 + Math.floor(Math.random() * 3);
    return { item, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);
  const [tapped, setTapped] = useState<number[]>([]);

  useEffect(() => {
    setTapped([]);
    speak("Vamos contar!");
  }, [board]);

  const handle = (idx: number) => {
    if (tapped.includes(idx)) return;
    const next = [...tapped, idx];
    setTapped(next);
    playTone(400 + next.length * 120, 0.2, "triangle");
    speak(String(next.length));
    if (next.length === board.total) {
      window.setTimeout(() => {
        sounds.cheer();
        speak(`${board.total}! ${praise()}`);
        window.setTimeout(() => {
          if (roundIdx + 1 >= 3) onComplete();
          else setRoundIdx((r) => r + 1);
        }, 800);
      }, 500);
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-5xl">🔢</span>
        <span className="text-5xl font-black text-foreground">{tapped.length}</span>
      </Prompt>
      <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-4">
        {Array.from({ length: board.total }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handle(idx)}
            className={[
              "flex h-32 w-32 items-center justify-center rounded-4xl bg-card text-[4rem] shadow-soft transition-transform active:scale-95",
              tapped.includes(idx) ? "animate-pop opacity-60" : "",
            ].join(" ")}
          >
            {board.item.emoji}
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------- Association ---------- */
function AssociationActivity({ onComplete }: ActivityProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [hit, setHit] = useState<string | null>(null);

  const board = useMemo(() => {
    const chosen = pick(PAIRS, 3);
    const target = chosen[0]!;
    const opts = shuffle([target.b, chosen[1]!.b, chosen[2]!.b]);
    return { target, opts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  useEffect(() => {
    speak(`O que combina com ${board.target.a.label}?`);
  }, [board]);

  const handle = (o: Item) => {
    if (o.id === board.target.b.id) {
      setHit(o.id);
      sounds.yay();
      speak(praise());
      window.setTimeout(() => {
        setHit(null);
        if (roundIdx + 1 >= 3) onComplete();
        else setRoundIdx((r) => r + 1);
      }, 900);
    } else {
      setWrong(o.id);
      sounds.gentle();
      window.setTimeout(() => setWrong(null), 500);
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-6xl">{board.target.a.emoji}</span>
        <span className="text-4xl">➕</span>
        <span className="text-5xl">❓</span>
      </Prompt>
      <TileGrid cols={3}>
        {board.opts.map((o) => (
          <Tile
            key={o.id}
            onClick={() => handle(o)}
            state={hit === o.id ? "happy" : wrong === o.id ? "wiggle" : "idle"}
          >
            {o.emoji}
          </Tile>
        ))}
      </TileGrid>
    </>
  );
}

/* ---------- Simple memory: find the matching twin ---------- */
function MemoryActivity({ onComplete }: ActivityProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const board = useMemo(() => {
    const chosen = pick([...ANIMALS, ...FRUITS, ...NATURE], 2);
    const cards = shuffle([...chosen, ...chosen]).map((c, i) => ({ ...c, key: `${c.id}-${i}` }));
    return { cards };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  const [open, setOpen] = useState<string[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOpen([]);
    setFound([]);
    setBusy(false);
    speak("Ache os iguais!");
  }, [board]);

  const flip = (card: { key: string; id: string }) => {
    if (busy || open.includes(card.key) || found.includes(card.id)) return;
    sounds.tap();
    const next = [...open, card.key];
    setOpen(next);
    if (next.length === 2) {
      const a = board.cards.find((c) => c.key === next[0]);
      const b = board.cards.find((c) => c.key === next[1]);
      if (!a || !b) {
        setOpen([]);
        return;
      }
      if (a.id === b.id) {
        sounds.yay();
        speak(praise());
        const nf = [...found, a.id];
        setFound(nf);
        setOpen([]);
        if (nf.length === 2) {
          window.setTimeout(() => {
            sounds.cheer();
            if (roundIdx + 1 >= 2) onComplete();
            else setRoundIdx((r) => r + 1);
          }, 900);
        }
      } else {
        setBusy(true);
        sounds.gentle();
        window.setTimeout(() => {
          setOpen([]);
          setBusy(false);
        }, 900);
      }
    }
  };

  return (
    <>
      <Prompt>
        <span className="text-5xl">🧠</span>
        <span className="text-5xl">🟰</span>
      </Prompt>
      <TileGrid cols={2}>
        {board.cards.map((c) => {
          const shown = open.includes(c.key) || found.includes(c.id);
          return (
            <Tile
              key={c.key}
              onClick={() => flip(c)}
              bg={shown ? "" : "var(--gradient-card)"}
              state={found.includes(c.id) ? "happy" : "idle"}
            >
              {shown ? (c.emoji ?? "") : "❔"}
            </Tile>
          );
        })}
      </TileGrid>
    </>
  );
}

/* ---------- Bubbles to pop ---------- */
function PopActivity({ onComplete }: ActivityProps) {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        key: i,
        emoji: pick(NATURE, 1)[0]!.emoji!,
        left: 6 + Math.random() * 74,
        top: 6 + Math.random() * 68,
        delay: Math.random() * 1.5,
      })),
    [],
  );
  const [popped, setPopped] = useState<number[]>([]);

  useEffect(() => {
    speak("Estoure as bolhas!");
  }, []);

  const handle = (k: number) => {
    if (popped.includes(k)) return;
    sounds.pop();
    const next = [...popped, k];
    setPopped(next);
    if (next.length === bubbles.length) {
      window.setTimeout(() => {
        sounds.cheer();
        onComplete();
      }, 700);
    }
  };

  return (
    <div className="relative h-[70dvh] w-full max-w-md">
      {bubbles.map((b) =>
        popped.includes(b.key) ? null : (
          <button
            key={b.key}
            type="button"
            onClick={() => handle(b.key)}
            className="animate-float absolute flex h-24 w-24 items-center justify-center rounded-full bg-card/80 text-5xl shadow-soft active:scale-90"
            style={{ left: `${b.left}%`, top: `${b.top}%`, animationDelay: `${b.delay}s` }}
          >
            {b.emoji}
          </button>
        ),
      )}
    </div>
  );
}

export type Activity = {
  id: string;
  icon: string;
  render: (props: ActivityProps) => React.ReactNode;
};

export const ACTIVITIES: Activity[] = [
  {
    id: "cores",
    icon: "🎨",
    render: (p) => (
      <PickActivity {...p} pool={COLORS} promptText={(t) => `Cadê a cor ${t.label}?`} />
    ),
  },
  { id: "encaixar", icon: "🧩", render: (p) => <ShapeFitActivity {...p} /> },
  {
    id: "animais",
    icon: "🐮",
    render: (p) => <ExploreActivity {...p} pool={ANIMALS} onTapSound={playAnimal} noSpeak />,
  },
  { id: "estrela", icon: "⭐", render: (p) => <SwipeStarActivity {...p} /> },
  { id: "cestinha", icon: "🧺", render: (p) => <BasketActivity {...p} /> },
  { id: "tamanhos", icon: "📏", render: (p) => <SizesActivity {...p} /> },
  { id: "surpresa", icon: "🎁", render: (p) => <SurpriseBoxActivity {...p} /> },
  { id: "memoria", icon: "🧠", render: (p) => <MemoryActivity {...p} /> },
  { id: "cortina", icon: "🪟", render: (p) => <CurtainActivity {...p} /> },
  {
    id: "instrumentos",
    icon: "🎵",
    render: (p) => (
      <ExploreActivity
        {...p}
        pool={INSTRUMENTS.map((i) => i.item)}
        onTapSound={(item) => {
          const found = INSTRUMENTS.find((i) => i.item.id === item.id);
          if (found) found.notes.forEach((n, idx) => playTone(n, 0.3, "triangle", idx * 0.16));
        }}
      />
    ),
  },
  {
    id: "formas",
    icon: "🔷",
    render: (p) => <PickActivity {...p} pool={SHAPES} promptText={(t) => `Cadê o ${t.label}?`} />,
  },
  {
    id: "frutas",
    icon: "🍓",
    render: (p) => <PickActivity {...p} pool={FRUITS} promptText={(t) => `Cadê a ${t.label}?`} />,
  },
  { id: "numeros", icon: "🔢", render: (p) => <CountActivity {...p} /> },
  { id: "associacao", icon: "🔗", render: (p) => <AssociationActivity {...p} /> },
  { id: "natureza", icon: "🌈", render: (p) => <PopActivity {...p} /> },
  {
    id: "corpo",
    icon: "👀",
    render: (p) => <ExploreActivity {...p} pool={BODY} />,
  },
  {
    id: "objetos",
    icon: "🧸",
    render: (p) => <ExploreActivity {...p} pool={OBJECTS} />,
  },
];
