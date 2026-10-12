import { useEffect, useMemo, useRef, useState } from "react";
import { Prompt, Tile, TileGrid } from "./ui";
import { pick, shuffle } from "./shuffle";
import { speakEn, speak, sounds } from "./audio";
import { COLOR_EN, COLORS, EN_ANIMALS, EN_OBJECTS, TOYS, TRANSPORT, type Item } from "./data";
import { useIdleHint } from "./useIdleHint";
import type { ActivityProps } from "./interactions";
import type { DragLevel } from "./drag-levels";
import type { TapLevel } from "./tap-levels";

const EN_FRUITS: Item[] = [
  { id: "apple", label: "Apple", emoji: "🍎", en: "Apple" },
  { id: "banana", label: "Banana", emoji: "🍌", en: "Banana" },
];
export const ENGLISH_POOLS = [
  { id: "en-find-animals", icon: "🐶", pool: EN_ANIMALS },
  { id: "en-find-objects", icon: "⚽", pool: EN_OBJECTS },
  { id: "en-find-colors", icon: "🎨", pool: COLORS.slice(0, 4).map((c) => ({ ...c, en: COLOR_EN[c.id] ?? c.label })) },
  { id: "en-find-fruits", icon: "🍎", pool: EN_FRUITS },
  { id: "en-find-transport", icon: "🚂", pool: TRANSPORT },
  { id: "en-find-toys", icon: "🧸", pool: TOYS },
];

/** Hear a native-English word and find its picture; no translation quiz. */
export function EnglishFindActivity({ onComplete, pool }: ActivityProps & { pool: Item[] }) {
  const [turn, setTurn] = useState(0);
  const [won, setWon] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const locked = useRef(false);
  const board = useMemo(() => { const options = pick(pool, 2); return { options: shuffle(options), target: options[0] }; }, [pool, turn]);
  const { level, poke } = useIdleHint(turn);
  useEffect(() => {
    locked.current = false; setWon(false); setWrong(null);
    if (board.target) void speakEn(board.target.en ?? board.target.label);
  }, [board]);
  const tap = (item: Item) => {
    if (locked.current || !board.target) return;
    poke();
    if (item.id !== board.target.id) {
      setWrong(item.id); sounds.gentle(); void speak("Olha aqui!"); return;
    }
    locked.current = true; setWon(true); sounds.yay();
    void speakEn(item.en ?? item.label).then(() => {
      window.setTimeout(() => { if (turn >= 2) onComplete(); else setTurn((t) => t + 1); }, 500);
    });
  };
  return <>
    <Prompt><span className="text-5xl">🇬🇧</span><span className="text-4xl">👂</span><span className="text-4xl">👉</span></Prompt>
    <TileGrid>{board.options.map((item) => <Tile key={item.id} bg={item.bg} onClick={() => tap(item)} hintTarget={item.id === board.target?.id && !won} hint={(level > 0 || wrong !== null) && item.id === board.target?.id && !won} state={won && item.id === board.target?.id ? "happy" : wrong === item.id ? "wiggle" : "idle"}>{item.emoji ?? ""}</Tile>)}</TileGrid>
  </>;
}

export const BONUS_DRAG: DragLevel[] = [
  { id: "d-en-ball", icon: "⚽", make: () => ({ say: "", en: "Ball", prompt: ["⚽", "🧺"], pieces: [0, 1, 2].map(() => ({ key: "ball", emoji: "⚽" })), targets: [{ key: "ball", emoji: "🧺", x: .5, y: .76, big: true }] }) },
  { id: "d-en-apple", icon: "🍎", make: () => ({ say: "", en: "Apple", prompt: ["🍎", "🌳"], pieces: [0, 1, 2].map(() => ({ key: "apple", emoji: "🍎" })), targets: [{ key: "apple", emoji: "🌳", x: .5, y: .76, big: true }] }) },
  { id: "d-en-train", icon: "🚂", make: () => ({ say: "", en: "Train", prompt: ["🚂", "🚉"], pieces: [{ key: "train", emoji: "🚂" }], targets: [{ key: "train", emoji: "🚉", x: .5, y: .76, big: true, move: .15 }] }) },
  { id: "d-borboletas", icon: "🦋", make: () => ({ say: "Olha!", prompt: ["🐝", "🌷"], pieces: [{ key: "flower", emoji: "🐝" }, { key: "flower", emoji: "🦋" }], targets: [{ key: "flower", emoji: "🌷", x: .5, y: .72, big: true, move: .12 }] }) },
  { id: "d-ursinho-balanco", icon: "🧸", make: () => ({ say: "Guarde os brinquedos na caixa!", prompt: ["🧸", "📦"], pieces: [{ key: "toy", emoji: "🧸" }, { key: "toy", emoji: "🪀" }], targets: [{ key: "toy", emoji: "📦", x: .5, y: .76, big: true, move: .12 }] }) },
  { id: "d-pizza-flutuante", icon: "🍕", make: () => ({ say: "Vamos fazer uma pizza!", prompt: ["🧀", "🍕"], pieces: ["🧀", "🍅", "🍄"].map((emoji) => ({ emoji, key: "pizza" })), targets: [{ key: "pizza", emoji: "🍕", x: .5, y: .76, big: true, move: .1 }] }) },
];
export const BONUS_TAP: TapLevel[] = [
  { id: "t-en-stars", icon: "⭐", make: () => ({ say: "", en: "Star", from: "✨", to: ["⭐", "🌟"], n: 3 }) },
  { id: "t-en-cars", icon: "🚗", make: () => ({ say: "", en: "Car", from: "🎁", to: ["🚗", "🏎️"], n: 3 }) },
  { id: "t-patinho-festa", icon: "🦆", make: () => ({ say: "Olha o patinho!", from: "🥚", to: ["🦆", "🐥"], n: 3 }) },
  { id: "t-jardim-magico", icon: "🌈", make: () => ({ say: "Toque nas plantinhas para crescer as flores!", from: "🌱", to: ["🌷", "🍄", "🌈", "🌻"], n: 4 }) },
  { id: "t-festa-maluquinha", icon: "🤪", make: () => ({ say: "O que tem dentro? Toque para descobrir!", from: "🎩", to: ["🐸", "🪀", "🦄", "🍿"], n: 4 }) },
];