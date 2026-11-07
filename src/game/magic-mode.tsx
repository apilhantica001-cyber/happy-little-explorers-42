import { useEffect, useRef, useState } from "react";
import { isNarrating, playAnimalSound, playMelody, sounds, speak, tone, type SpeechPart } from "./audio";
import { ANIMALS, COLORS, COLOR_EN, INSTRUMENTS, type Item } from "./data";

/**
 * "Céu Mágico" — free play with no right or wrong answer, split into five
 * little worlds the child can switch between: sky painting, a farm with
 * draggable animals, colour bubbles, a music room and a magic garden.
 * The narrator speaks rarely (throttled) so play is never frozen for long.
 */
const PENTA = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880];
const TRAIL = ["✨", "⭐", "💫", "🌟"];
const GLOW = ["var(--joy-sun)", "var(--joy-bubble)", "var(--joy-sky)", "var(--joy-mint)"];
const rnd = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T;
let nextId = 1;

type Ctx = {
  root: React.RefObject<HTMLDivElement | null>;
  say: (...p: SpeechPart[]) => Promise<boolean>;
  burst: (x: number, y: number, emojis?: string[], n?: number) => void;
  later: (fn: () => void, ms: number) => void;
};

const local = (root: HTMLElement | null, e: { clientX: number; clientY: number }) => {
  const r = root?.getBoundingClientRect();
  return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0), w: r?.width ?? 1, h: r?.height ?? 1 };
};

/** Say the animal's phrase (if the narrator is free) and then its real sound. */
function announce(ctx: Ctx, a: Item) {
  void ctx.say(a.say ?? `Olha o ${a.label}!`).then(() => void playAnimalSound(a.id));
}

const SCENES = [
  { id: "ceu", icon: "🌙", intro: "Olha!" },
  { id: "fazenda", icon: "🐮", intro: "Leve cada bichinho para a sua casinha!" },
  { id: "bolhas", icon: "🫧", intro: "Estoure as bolhas!" },
  { id: "musica", icon: "🎵", intro: "Vamos brincar!" },
  { id: "jardim", icon: "🌻", intro: "Toque nas plantinhas para crescer as flores!" },
] as const;
type SceneId = (typeof SCENES)[number]["id"];

export function MagicSky() {
  const root = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<SceneId>("ceu");
  const lastSay = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const ctx: Ctx = {
    root,
    later: (fn, ms) => { timers.current.push(window.setTimeout(fn, ms)); },
    say: (...p) => {
      const now = Date.now();
      if (isNarrating() || now - lastSay.current < 5000) return Promise.resolve(false);
      lastSay.current = now;
      return speak(...p);
    },
    burst: (x, y, emojis = TRAIL, n = 8) => {
      const el = root.current;
      if (!el) return;
      for (let i = 0; i < n; i++) {
        const s = document.createElement("span");
        s.textContent = rnd(emojis);
        s.className = "pointer-events-none absolute select-none text-4xl";
        s.style.left = `${x}px`;
        s.style.top = `${y}px`;
        s.style.filter = `drop-shadow(0 0 8px ${rnd(GLOW)})`;
        el.appendChild(s);
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
        const d = 70 + Math.random() * 70;
        s.animate(
          [{ transform: "translate(-50%,-50%) scale(.3)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d}px)) scale(1.1) rotate(160deg)`, opacity: 0 }],
          { duration: 900, easing: "ease-out" },
        ).onfinish = () => s.remove();
      }
    },
  };

  const choose = (id: SceneId) => {
    if (id === scene) return;
    sounds.transition();
    setScene(id);
    const s = SCENES.find((x) => x.id === id);
    lastSay.current = 0;
    if (s) void ctx.say(s.intro);
  };

  return (
    <div
      ref={root}
      data-magic-sky
      data-scene={scene}
      className={`magic-sky magic-${scene} relative h-[calc(100dvh-2rem)] w-full max-w-3xl touch-none select-none overflow-hidden rounded-4xl shadow-soft`}
    >
      {scene === "ceu" && <SkyScene ctx={ctx} />}
      {scene === "fazenda" && <FarmScene ctx={ctx} />}
      {scene === "bolhas" && <BubbleScene ctx={ctx} />}
      {scene === "musica" && <MusicScene ctx={ctx} />}
      {scene === "jardim" && <GardenScene ctx={ctx} />}
      <nav className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-3" aria-label="Mundos" data-parent-controls>
        {SCENES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-label={s.id}
            onClick={() => choose(s.id)}
            className={`flex items-center justify-center rounded-full bg-card/80 shadow-soft transition-all active:scale-90 ${s.id === scene ? "h-20 w-20 text-5xl ring-4 ring-joy-sun" : "h-16 w-16 text-4xl opacity-80"}`}
          >
            {s.icon}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ---------------- 1. Sky: paint stars, tap to hatch animals ---------------- */
type Pop = { id: number; x: number; y: number; kind: "animal" | "firework"; emoji: string };
const PARADE = ["🐳", "🦄", "🐉", "🌈", "🚂"];

function SkyScene({ ctx }: { ctx: Ctx }) {
  const [pops, setPops] = useState<Pop[]>([]);
  const [parade, setParade] = useState<{ id: number; emoji: string } | null>(null);
  const [shooting, setShooting] = useState<number | null>(null);
  const t = useRef({ spawn: 0, note: 0, trail: 0, count: 0, dist: 0 });
  const down = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const sparkle = (x: number, y: number, h: number) => {
    const now = performance.now();
    const el = ctx.root.current;
    if (now - t.current.trail < 45 || !el) return;
    t.current.trail = now;
    const s = document.createElement("span");
    s.textContent = rnd(TRAIL);
    s.className = "pointer-events-none absolute select-none text-4xl";
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.filter = `drop-shadow(0 0 10px ${rnd(GLOW)})`;
    el.appendChild(s);
    s.animate(
      [{ transform: "translate(-50%,-50%) scale(1.2)", opacity: 1 }, { transform: `translate(-50%, ${-110 - Math.random() * 40}%) scale(.2) rotate(180deg)`, opacity: 0 }],
      { duration: 900, easing: "ease-out" },
    ).onfinish = () => s.remove();
    if (now - t.current.note > 140) {
      t.current.note = now;
      const idx = Math.max(0, Math.min(PENTA.length - 1, Math.floor((1 - y / h) * PENTA.length)));
      tone({ freq: PENTA[idx] ?? 440, duration: 0.25, type: "sine", gain: 0.1 });
    }
    // long painting earns a shooting star
    t.current.dist++;
    if (t.current.dist % 60 === 0 && !shooting) {
      setShooting(nextId++);
      sounds.sparkle();
      ctx.later(() => setShooting(null), 1800);
    }
  };

  const spawn = (x: number, y: number) => {
    const now = performance.now();
    if (now - t.current.spawn < 450 || pops.length >= 6 || parade) return;
    t.current.spawn = now;
    const c = ++t.current.count;
    const isAnimal = c % 3 !== 0;
    const animal = rnd(ANIMALS);
    const pop: Pop = { id: nextId++, x, y, kind: isAnimal ? "animal" : "firework", emoji: isAnimal ? (animal.emoji ?? "🐶") : "🎆" };
    setPops((p) => [...p, pop]);
    sounds.balloon();
    if (isAnimal) ctx.later(() => announce(ctx, animal), 350);
    else { ctx.later(() => sounds.cheer(), 200); ctx.burst(x, y, ["🎆", "✨", "🎇"], 10); }
    ctx.later(() => setPops((p) => p.filter((q) => q.id !== pop.id)), 3200);
    if (c % 7 === 0) {
      ctx.later(() => {
        setParade({ id: nextId++, emoji: rnd(PARADE) });
        playMelody([523, 659, 784, 659, 1046], 0.2, "triangle", 0.12);
        void ctx.say(rnd(["Uau!", "Que legal!", "Oba!"]));
      }, 1200);
      ctx.later(() => setParade(null), 6200);
    }
  };

  return (
    <div
      className="absolute inset-0"
      onPointerDown={(e) => { const p = local(ctx.root.current, e); down.current = { x: p.x, y: p.y, moved: false }; sparkle(p.x, p.y, p.h); }}
      onPointerMove={(e) => {
        if (!down.current) return;
        const p = local(ctx.root.current, e);
        if (Math.hypot(p.x - down.current.x, p.y - down.current.y) > 24) down.current.moved = true;
        sparkle(p.x, p.y, p.h);
      }}
      onPointerUp={(e) => { const p = local(ctx.root.current, e); if (down.current && !down.current.moved) spawn(p.x, p.y); down.current = null; }}
      onPointerCancel={() => { down.current = null; }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center text-6xl opacity-80 animate-bob" aria-hidden>🌙</div>
      {shooting && <div key={shooting} className="magic-shooting pointer-events-none absolute text-6xl" aria-hidden>🌠</div>}
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

/* ---------------- 2. Farm: drag animals home, tap to hear them ---------------- */
type Pet = { key: number; a: Item; x: number; y: number; home: boolean; jump: number };
const newPets = (): Pet[] =>
  [...ANIMALS].sort(() => Math.random() - 0.5).slice(0, 4).map((a, i) => ({
    key: nextId++, a, x: 0.15 + (i % 2) * 0.3 + Math.random() * 0.08, y: 0.25 + Math.floor(i / 2) * 0.28, home: false, jump: 0,
  }));

function FarmScene({ ctx }: { ctx: Ctx }) {
  const [pets, setPets] = useState<Pet[]>(newPets);
  const [party, setParty] = useState(false);
  const drag = useRef<{ key: number; sx: number; sy: number; moved: boolean } | null>(null);
  const BARN = { x: 0.8, y: 0.72 };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = local(ctx.root.current, e);
    if (Math.hypot(p.x - d.sx, p.y - d.sy) > 14) d.moved = true;
    if (!d.moved) return;
    setPets((ps) => ps.map((q) => (q.key === d.key ? { ...q, x: p.x / p.w, y: p.y / p.h } : q)));
    if (Math.random() < 0.15) sounds.swipe();
  };

  const up = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const pet = pets.find((q) => q.key === d.key);
    if (!pet) return;
    const p = local(ctx.root.current, e);
    if (!d.moved) {
      setPets((ps) => ps.map((q) => (q.key === d.key ? { ...q, jump: q.jump + 1 } : q)));
      announce(ctx, pet.a);
      ctx.burst(p.x, p.y, ["💖", "✨"], 5);
      return;
    }
    const nearBarn = Math.hypot(p.x / p.w - BARN.x, (p.y / p.h - BARN.y) * (p.h / p.w)) < 0.2;
    if (!nearBarn) { sounds.tap(); return; }
    sounds.snap();
    void playAnimalSound(pet.a.id);
    ctx.burst(BARN.x * p.w, BARN.y * p.h, ["⭐", "✨", "🌟"], 8);
    const next = pets.map((q) => (q.key === d.key ? { ...q, home: true } : q));
    setPets(next);
    if (next.every((q) => q.home)) {
      ctx.later(() => { setParty(true); sounds.cheer(); void ctx.say(rnd(["Muito bem!", "Você conseguiu!", "Uhuu!"])); }, 500);
      ctx.later(() => { setParty(false); setPets(newPets()); }, 3800);
    }
  };

  return (
    <div className="absolute inset-0" onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; }}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 rounded-t-[50%] bg-joy-mint" aria-hidden />
      <div className="pointer-events-none absolute left-6 top-6 text-6xl animate-bob" aria-hidden>☀️</div>
      <div
        data-hint-target="true"
        className={`pointer-events-none absolute text-[8rem] leading-none ${party ? "animate-wiggle" : ""}`}
        style={{ left: `${BARN.x * 100}%`, top: `${BARN.y * 100}%`, transform: "translate(-50%,-50%)" }}
        aria-hidden
      >
        🏡
        <div className="absolute -top-6 left-0 flex text-4xl">
          {pets.filter((q) => q.home).map((q) => <span key={q.key} className="animate-bob">{q.a.emoji}</span>)}
        </div>
      </div>
      {party && <div className="pointer-events-none absolute inset-x-0 top-1/4 text-center text-8xl animate-bob" aria-hidden>🎉🎈🎉</div>}
      {pets.filter((q) => !q.home).map((q) => (
        <button
          key={q.key}
          type="button"
          aria-label={q.a.label}
          data-hint-source="true"
          onPointerDown={(e) => { const p = local(ctx.root.current, e); drag.current = { key: q.key, sx: p.x, sy: p.y, moved: false }; sounds.tap(); }}
          className="absolute flex h-32 w-32 items-center justify-center rounded-full"
          style={{ left: `${q.x * 100}%`, top: `${q.y * 100}%`, transform: "translate(-50%,-50%)", touchAction: "none" }}
        >
          <span key={q.jump} className={`text-[5.5rem] leading-none ${q.jump ? "magic-jump" : "animate-wiggle"}`}>{q.a.emoji}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- 3. Bubbles: colours float up, tap or swipe to pop ---------------- */
type Bub = { key: number; x: number; c: Item; dur: number; size: number; inside?: Item | undefined };

function BubbleScene({ ctx }: { ctx: Ctx }) {
  const [bubs, setBubs] = useState<Bub[]>([]);
  const pops = useRef(0);
  const pressing = useRef(false);
  const palette = COLORS.slice(0, 8);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBubs((b) => (b.length >= 7 ? b : [...b, {
        key: nextId++, x: 10 + Math.random() * 80, c: rnd(palette), dur: 7 + Math.random() * 4, size: 7 + Math.random() * 3,
        inside: Math.random() < 0.25 ? rnd(ANIMALS) : undefined,
      }]));
    }, 900);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pop = (key: number, x: number, y: number) => {
    const b = bubs.find((q) => q.key === key);
    if (!b) return;
    setBubs((bs) => bs.filter((q) => q.key !== key));
    sounds.pop();
    ctx.burst(x, y, b.inside ? [b.inside.emoji ?? "✨", "✨"] : ["💧", "✨", "🫧"], 6);
    const n = ++pops.current;
    if (b.inside) ctx.later(() => announce(ctx, b.inside as Item), 200);
    else if (n % 3 === 0) {
      const en = COLOR_EN[b.c.id];
      void (n % 6 === 0 && en ? ctx.say(b.c.label, { en: `${en}!` }) : ctx.say(b.c.label));
    }
    if (n % 15 === 0) { sounds.cheer(); void ctx.say("Uau!"); }
  };

  const hit = (e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-bubble]");
    if (!el) return;
    const p = local(ctx.root.current, e);
    pop(Number(el.dataset["bubble"]), p.x, p.y);
  };

  return (
    <div
      className="absolute inset-0"
      onPointerDown={(e) => { pressing.current = true; hit(e); }}
      onPointerMove={(e) => { if (pressing.current) hit(e); }}
      onPointerUp={() => { pressing.current = false; }}
      onPointerCancel={() => { pressing.current = false; }}
    >
      {bubs.map((b) => (
        <div
          key={b.key}
          data-bubble={b.key}
          onAnimationEnd={() => setBubs((bs) => bs.filter((q) => q.key !== b.key))}
          className="magic-rise absolute flex items-center justify-center rounded-full border-4 border-card/70 text-6xl"
          style={{
            left: `${b.x}%`, width: `${b.size}rem`, height: `${b.size}rem`, animationDuration: `${b.dur}s`,
            background: `radial-gradient(circle at 30% 30%, color-mix(in oklab, ${b.c.bg} 30%, var(--card)), ${b.c.bg})`,
          }}
        >
          {b.inside?.emoji}
        </div>
      ))}
    </div>
  );
}

/* ---------------- 4. Music room: pads, swipe glissando, dancing friend ---------------- */
const PADS = [
  ...INSTRUMENTS.map((i) => ({ id: i.item.id, label: i.item.label, emoji: i.item.emoji ?? "🎵", notes: i.notes })),
  { id: "sininho", label: "sininho", emoji: "🔔", notes: [1046, 1318, 1568] },
].slice(0, 6);
const TYPE: Record<string, OscillatorType> = { tambor: "sine", piano: "triangle", violao: "triangle", trompete: "sawtooth", chocalho: "square" };

function MusicScene({ ctx }: { ctx: Ctx }) {
  const [active, setActive] = useState<string | null>(null);
  const [dancer, setDancer] = useState<Item>(() => rnd(ANIMALS));
  const [dance, setDance] = useState(0);
  const said = useRef(new Set<string>());
  const notes = useRef(0);
  const last = useRef({ id: "", at: 0 });
  const pressing = useRef(false);

  const play = (id: string, x: number, y: number) => {
    const now = performance.now();
    if (last.current.id === id && now - last.current.at < 250) return;
    last.current = { id, at: now };
    const pad = PADS.find((p) => p.id === id);
    if (!pad) return;
    const ty = TYPE[id] ?? "sine";
    const g = id === "trompete" ? 0.06 : id === "chocalho" ? 0.04 : 0.15;
    pad.notes.forEach((f, i) => tone({ freq: f, duration: id === "tambor" ? 0.25 : 0.35, type: ty, delay: i * 0.12, gain: g }));
    setActive(id);
    setDance((d) => d + 1);
    ctx.burst(x, y, ["🎵", "🎶", "✨"], 4);
    ctx.later(() => setActive((a) => (a === id ? null : a)), 300);
    if (!said.current.has(id)) { said.current.add(id); void ctx.say(pad.label); }
    const n = ++notes.current;
    if (n % 10 === 0) {
      ctx.later(() => { void playAnimalSound(dancer.id); }, 500);
      ctx.later(() => { const a = rnd(ANIMALS); setDancer(a); void ctx.say(a.say ?? "Olha!"); }, 2200);
    }
  };

  const hit = (e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-pad]");
    if (!el?.dataset["pad"]) return;
    const p = local(ctx.root.current, e);
    play(el.dataset["pad"], p.x, p.y);
  };

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 pb-24"
      onPointerDown={(e) => { pressing.current = true; hit(e); }}
      onPointerMove={(e) => { if (pressing.current) hit(e); }}
      onPointerUp={() => { pressing.current = false; }}
      onPointerCancel={() => { pressing.current = false; }}
    >
      <div key={dance} className={`pointer-events-none text-[7rem] leading-none ${dance ? "magic-dance" : "animate-bob"}`} aria-hidden>{dancer.emoji}</div>
      <div className="grid grid-cols-3 gap-4">
        {PADS.map((p) => (
          <div
            key={p.id}
            data-pad={p.id}
            role="button"
            aria-label={p.label}
            className={`flex h-28 w-28 items-center justify-center rounded-4xl bg-card text-6xl shadow-soft transition-transform sm:h-32 sm:w-32 ${active === p.id ? "scale-110 ring-4 ring-joy-sun" : ""}`}
          >
            {p.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 5. Garden: plant, grow, rain with the cloud ---------------- */
const STAGES = ["🌱", "🌿", "🌷", "🌻"];
type Plant = { key: number; x: number; y: number; s: number };

function GardenScene({ ctx }: { ctx: Ctx }) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [cloud, setCloud] = useState({ x: 0.5, y: 0.18 });
  const [rainbow, setRainbow] = useState(false);
  const drag = useRef<{ kind: "cloud" | "plant"; key?: number; sx: number; sy: number; moved: boolean } | null>(null);
  const lastRain = useRef(0);

  const grow = (keys: number[]) => {
    setPlants((ps) => {
      const next = ps.map((q) => (keys.includes(q.key) && q.s < 3 ? { ...q, s: q.s + 1 } : q));
      const full = next.filter((q) => q.s === 3).length;
      if (full >= 4 && !rainbow) {
        ctx.later(() => { setRainbow(true); sounds.cheer(); void ctx.say("Uau!"); }, 300);
        ctx.later(() => { setRainbow(false); setPlants([]); }, 7000);
      }
      return next;
    });
  };

  const down = (e: React.PointerEvent) => {
    const p = local(ctx.root.current, e);
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-garden]");
    if (el?.dataset["garden"] === "cloud") drag.current = { kind: "cloud", sx: p.x, sy: p.y, moved: false };
    else if (el?.dataset["garden"]) drag.current = { kind: "plant", key: Number(el.dataset["garden"]), sx: p.x, sy: p.y, moved: false };
    else if (p.y / p.h > 0.45 && p.y / p.h < 0.85 && plants.length < 8 && !rainbow) {
      setPlants((ps) => [...ps, { key: nextId++, x: p.x / p.w, y: p.y / p.h, s: 0 }]);
      sounds.tap();
      ctx.burst(p.x, p.y, ["🟫", "✨"], 4);
      if (plants.length === 0) void ctx.say("Olha!");
    }
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.kind !== "cloud") return;
    const p = local(ctx.root.current, e);
    d.moved = true;
    const c = { x: p.x / p.w, y: Math.min(0.4, p.y / p.h) };
    setCloud(c);
    const now = performance.now();
    if (now - lastRain.current > 450) {
      lastRain.current = now;
      sounds.swipe();
      ctx.burst(p.x, p.y + 50, ["💧"], 3);
      const under = plants.filter((q) => Math.abs(q.x - c.x) < 0.12).map((q) => q.key);
      if (under.length) { grow(under); tone({ freq: 660, to: 990, duration: 0.15, type: "sine", gain: 0.08 }); }
    }
  };

  const up = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const p = local(ctx.root.current, e);
    if (d.kind === "cloud" && !d.moved) { sounds.swipe(); void ctx.say("Chuva!"); }
    if (d.kind === "plant" && d.key) {
      grow([d.key]);
      sounds.sparkle();
      ctx.burst(p.x, p.y, ["🌸", "✨", "🦋"], 5);
      const pl = plants.find((q) => q.key === d.key);
      if (pl && pl.s === 2) void ctx.say("Flor!");
    }
  };

  return (
    <div className="absolute inset-0" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; }}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-joy-mint" aria-hidden />
      <button
        type="button"
        aria-label="sol"
        onClick={() => { sounds.sparkle(); void ctx.say("Sol!"); setPlants((ps) => ps.map((q) => ({ ...q, s: Math.min(3, q.s + (q.s < 3 ? 1 : 0)) }))); }}
        className="absolute right-4 top-4 text-7xl animate-bob"
      >
        ☀️
      </button>
      <div
        data-garden="cloud"
        role="button"
        aria-label="nuvem"
        className="absolute flex h-32 w-40 items-center justify-center text-[6.5rem] leading-none"
        style={{ left: `${cloud.x * 100}%`, top: `${cloud.y * 100}%`, transform: "translate(-50%,-50%)" }}
      >
        ☁️
      </div>
      {rainbow && (
        <div className="pointer-events-none absolute inset-x-0 top-[22%] text-center text-[10rem] leading-none animate-bob" aria-hidden>
          🌈
          <div className="flex justify-center gap-6 text-6xl"><span className="animate-float">🦋</span><span className="animate-bob">🐝</span><span className="animate-float">🦋</span></div>
        </div>
      )}
      {plants.map((q) => (
        <div
          key={q.key}
          data-garden={q.key}
          role="button"
          aria-label="plantinha"
          className="absolute flex h-28 w-28 items-end justify-center"
          style={{ left: `${q.x * 100}%`, top: `${q.y * 100}%`, transform: "translate(-50%,-70%)" }}
        >
          <span key={q.s} className="magic-grow leading-none" style={{ fontSize: `${3.5 + q.s * 1}rem` }}>{STAGES[q.s]}</span>
        </div>
      ))}
    </div>
  );
}
