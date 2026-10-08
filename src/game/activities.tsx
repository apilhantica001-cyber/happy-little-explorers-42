import { useEffect, useMemo, useState } from "react";
import { ExploreSceneActivity, KidsPlayActivity, SceneSeekActivity, SortActivity } from "./scenes";
import { Prompt, Tile, TileGrid } from "./ui";
import { pick, shuffle } from "./shuffle";
import { sounds, speak, playTone, type SpeechPart } from "./audio";
import {
  ANIMALS,
  BODY,
  COLORS,
  COLOR_EN,
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
import { useLock } from "./useLock";
import { encourage, colorPool, cade } from "./data";
import {
  BasketActivity,
  CurtainActivity,
  ShapeFitActivity,
  SurpriseBoxActivity,
  SwipeStarActivity,
  playAnimal,
  type ActivityProps,
} from "./interactions";
import { EN_ANIMALS, EN_OBJECTS, TOYS } from "./data";
import { DRAG_LEVELS, DragLevelActivity } from "./drag-levels";
import { TAP_LEVELS, TapLevelActivity } from "./tap-levels";
import {
  BalloonActivity,
  BubbleSwipeActivity,
  ColorObjectActivity,
  DragHomeActivity,
  EnglishNumbersActivity,
  EnglishWordsActivity,
  FindActivity,
  FootprintsActivity,
  GuideActivity,
} from "./more";

export type { ActivityProps };


/* ---------- Generic: pick the target among options ---------- */
function PickActivity({
  onComplete,
  pool,
  rounds = 3,
  options = 3,
  promptText,
  sayHit,
}: ActivityProps & {
  pool: Item[];
  rounds?: number;
  options?: number;
  promptText: (t: Item) => string;
  sayHit?: (t: Item) => SpeechPart[];
}) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [hit, setHit] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const lock = useLock();

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
      if (!lock.tryLock()) return;
      setHit(item.id);
      setHelp(false);
      sounds.yay();
      void speak(...(sayHit ? sayHit(item) : []), praise()).then(() => {
        window.setTimeout(() => {
          if (roundIdx + 1 >= rounds) onComplete();
          else {
            setHit(null);
            setRoundIdx((r) => r + 1);
            window.setTimeout(lock.release, 250);
          }
        }, 250);
      });
    } else {
      if (hit) return;
      setWrong(item.id);
      setHelp(true);
      sounds.gentle();
      speak(encourage());
      window.setTimeout(() => setWrong(null), 500);
      window.setTimeout(() => setHelp(false), 1600);
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
            hint={(level > 0 || help) && o.id === board.target.id && !hit}
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

  const lock = useLock();
  const handle = (idx: number) => {
    if (hit) return;
    const isBig = board.bigFirst ? idx === 0 : idx === 1;
    if (isBig) {
      if (!lock.tryLock()) return;
      setHit(idx);
      sounds.yay();
      speak(praise());
      window.setTimeout(() => {
        if (roundIdx + 1 >= 3) onComplete();
        else {
          setHit(null);
          setRoundIdx((r) => r + 1);
          window.setTimeout(lock.release, 250);
        }
      }, 900);
    } else {
      setWrong(idx);
      sounds.gentle();
      speak("Olha, esse é pequeno!");
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
        speak(String(board.total), praise());
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

  const lock = useLock();
  const handle = (o: Item) => {
    if (hit) return;
    if (o.id === board.target.b.id) {
      if (!lock.tryLock()) return;
      setHit(o.id);
      sounds.yay();
      speak(praise());
      window.setTimeout(() => {
        if (roundIdx + 1 >= 3) onComplete();
        else {
          setHit(null);
          setRoundIdx((r) => r + 1);
          window.setTimeout(lock.release, 250);
        }
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
      <PickActivity
        {...p}
        pool={colorPool(p.round)}
        options={Math.min(4, 2 + p.round)}
        promptText={(t) => cade(t.label)}
        sayHit={(t) => (p.round > 0 && Math.random() < 0.5 ? [t.label, { en: COLOR_EN[t.id] ?? "" }] : [t.label])}
      />
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
    render: (p) => <PickActivity {...p} pool={SHAPES} promptText={(t) => cade(t.label)} />,
  },
  {
    id: "frutas",
    icon: "🍓",
    render: (p) => <PickActivity {...p} pool={FRUITS} promptText={(t) => cade(t.label)} />,
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
  { id: "baloes", icon: "🎈", render: (p) => <BalloonActivity {...p} /> },
  { id: "bolhas", icon: "🫧", render: (p) => <BubbleSwipeActivity {...p} /> },
  {
    id: "abelha",
    icon: "🐝",
    render: (p) => (
      <GuideActivity {...p} mover="🐝" goals={["🌸", "🌻", "🌷"]} say="Leve a abelhinha até a flor!" />
    ),
  },
  {
    id: "brinquedos",
    icon: "📦",
    render: (p) => <DragHomeActivity {...p} pool={TOYS} home="📦" say="Guarde os brinquedos na caixa!" />,
  },
  { id: "pegadas", icon: "🐾", render: (p) => <FootprintsActivity {...p} /> },
  { id: "encontre", icon: "🔎", render: (p) => <FindActivity {...p} /> },
  { id: "cor-objeto", icon: "🍎", render: (p) => <ColorObjectActivity {...p} /> },
  { id: "english-animals", icon: "🇬🇧", render: (p) => <EnglishWordsActivity {...p} pool={EN_ANIMALS} /> },
  { id: "english-objects", icon: "🔤", render: (p) => <EnglishWordsActivity {...p} pool={EN_OBJECTS} /> },
  { id: "english-numbers", icon: "1️⃣", render: (p) => <EnglishNumbersActivity {...p} /> },
  { id: "cade-cena", icon: "🙈", render: (p) => <SceneSeekActivity {...p} /> },
  { id: "no-lugar", icon: "🧺", render: (p) => <SortActivity {...p} /> },
  { id: "criancas", icon: "🧒", render: (p) => <KidsPlayActivity {...p} /> },
  { id: "explorar", icon: "🌳", render: (p) => <ExploreSceneActivity {...p} /> },
  ...DRAG_LEVELS.map((lv) => ({
    id: lv.id,
    icon: lv.icon,
    render: (p: ActivityProps) => <DragLevelActivity {...p} level={lv} />,
  })),
  ...TAP_LEVELS.map((lv) => ({
    id: lv.id,
    icon: lv.icon,
    render: (p: ActivityProps) => <TapLevelActivity {...p} level={lv} />,
  })),
];

/** Activities where the child holds and drags (or slides) something. */
export const DRAG_IDS = new Set<string>([
  "encaixar",
  "cestinha",
  "brinquedos",
  "no-lugar",
  "abelha",
  "estrela",
  "bolhas",
  ...DRAG_LEVELS.map((l) => l.id),
]);
export const EASY_DRAG_IDS = ["d-osso", "d-lixeira", "d-dormir", "d-banho", "d-flores", "d-ovos"];

/** Easy activities used to open each round. */
export const EASY_IDS = ["explorar", "cores", "animais", "baloes", "surpresa", "objetos", "bolhas"];
