/**
 * Lists every phrase the narrator can say. Used by scripts/generate-voice.ts.
 * Run: bun scripts/voice-phrases.ts  (prints JSON { pt: string[], en: string[] })
 */
import { readFileSync, readdirSync } from "node:fs";
import * as D from "../src/game/data";

const pt = new Set<string>();
const en = new Set<string>();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// literal strings passed to speak()/say= in the game source
for (const f of readdirSync("src/game").filter((x) => x.endsWith(".tsx"))) {
  const src = readFileSync(`src/game/${f}`, "utf8");
  for (const m of src.matchAll(/speak\(\s*"([^"]+)"/g)) pt.add(m[1]!);
  for (const m of src.matchAll(/say="([^"]+)"/g)) pt.add(m[1]!);
  for (const m of src.matchAll(/say: "([^"]+)"/g)) pt.add(m[1]!);
  for (const m of src.matchAll(/speak\("[^"]*",\s*"([^"]+)"/g)) pt.add(m[1]!);
}
for (const m of readFileSync("src/routes/index.tsx", "utf8").matchAll(/speak\(\s*"([^"]+)"/g)) pt.add(m[1]!);

const items: D.Item[] = [
  ...D.COLORS, ...D.SHAPES, ...D.ANIMALS, ...D.FRUITS, ...D.NATURE, ...D.OBJECTS, ...D.BODY,
  ...D.TRANSPORT, ...D.TOYS, ...D.INSTRUMENTS.map((i) => i.item),
  ...D.PAIRS.flatMap((p) => [p.a, p.b]),
];
for (const i of items) {
  pt.add(cap(i.label) + "!");
  if (i.say) pt.add(i.say);
}
for (const i of [...D.COLORS, ...D.SHAPES, ...D.FRUITS, ...D.ANIMALS, ...D.NATURE, ...D.OBJECTS]) pt.add(D.cade(i.label));
for (const p of D.PAIRS) pt.add(`O que combina com ${p.a.label}?`);
[...D.PRAISE, ...D.ENCOURAGE].forEach((s) => pt.add(s));
["1", "2", "3", "4", "5", "Arrastar!", "Tocar!", "Tudo!", "O que vamos brincar?"].forEach((n) => pt.add(n));
["Olha!", "Isso!", "Você conseguiu!", "Vamos lá!", "Cadê?", "Achou!", "Que legal!", "Vamos tentar?", "Que cor é essa?"].forEach((s) => pt.add(s));
for (const i of D.COLORS) pt.add(`É ${i.label}!`);

for (const i of [...D.EN_ANIMALS, ...D.EN_OBJECTS, ...D.TOYS, ...D.TRANSPORT]) if (i.en) en.add(`${i.en}!`);
for (const c of Object.values(D.COLOR_EN)) en.add(`${c}!`);
for (const n of D.EN_NUMBERS) { en.add(n); en.add(`${n}!`); }

console.log(JSON.stringify({ pt: [...pt], en: [...en] }, null, 1));
