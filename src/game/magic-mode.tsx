import { useEffect, useRef, useState } from "react";
import { isNarrating, playAnimalSound, playInstrument, playMelody, playNote, sounds, speak, tone, type SpeechPart } from "./audio";
import { ANIMALS, COLORS, COLOR_EN, INSTRUMENTS, type Item } from "./data";
import { MagicChallenge, getMedals } from "./magic-challenge";
import { LEVELS, type Level } from "./challenge-rules";

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
  { id: "mar", icon: "🎣", intro: "Vamos brincar!" },
] as const;
type SceneId = (typeof SCENES)[number]["id"];

export function MagicSky() {
  const root = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<SceneId>("ceu");
  const lastSay = useRef(0);
  const [challenge, setChallenge] = useState<Level | null>(null);
  const [round, setRound] = useState(0);
  const [medals, setMedals] = useState<Record<string, boolean>>({});
  useEffect(() => { setMedals(getMedals()); }, [challenge, round]);
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
      {challenge ? (
        <MagicChallenge
          key={`${scene}-${challenge}-${round}`}
          scene={scene}
          level={challenge}
          say={(...p) => { lastSay.current = 0; return ctx.say(...p); }}
          burst={ctx.burst}
          onExit={() => setChallenge(null)}
          onLevel={(lv) => { setChallenge(lv); setRound((r) => r + 1); }}
        />
      ) : (
        <div className="absolute left-1/2 top-20 z-20 flex -translate-x-1/2 gap-2" data-parent-controls aria-label="Desafios">
          {LEVELS.map((lv, i) => (
            <button
              key={lv}
              type="button"
              aria-label={`Desafio ${lv}`}
              onClick={() => { sounds.transition(); setChallenge(lv); }}
              className="ch-chip relative flex h-14 items-center gap-1 rounded-full px-3 text-xl font-extrabold shadow-soft active:scale-90"
              style={{ background: ["var(--joy-mint)", "var(--joy-sun)", "var(--joy-bubble)"][i], animationDelay: `${i * 0.3}s` }}
            >
              {"⭐".repeat(i + 1)}
              {medals[`${scene}:${lv}`] && <span className="absolute -right-1 -top-2 text-xl">{["🥉", "🥈", "🥇"][i]}</span>}
            </button>
          ))}
        </div>
      )}
      {!challenge && scene === "ceu" && <SkyScene ctx={ctx} />}
      {!challenge && scene === "fazenda" && <FarmScene ctx={ctx} />}
      {!challenge && scene === "bolhas" && <BubbleScene ctx={ctx} />}
      {!challenge && scene === "musica" && <MusicScene ctx={ctx} />}
      {!challenge && scene === "jardim" && <GardenScene ctx={ctx} />}
      {!challenge && scene === "mar" && <SeaScene ctx={ctx} />}
      {!challenge && <nav className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-2" aria-label="Mundos" data-parent-controls>
        {SCENES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-label={s.id}
            onClick={() => choose(s.id)}
            className={`flex items-center justify-center rounded-full bg-card/80 shadow-soft transition-all active:scale-90 ${s.id === scene ? "h-[4.5rem] w-[4.5rem] text-5xl ring-4 ring-joy-sun" : "h-14 w-14 text-3xl opacity-80"}`}
          >
            {s.icon}
          </button>
        ))}
      </nav>}
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
      playNote("caixinha", PENTA[idx] ?? 440, 0, 1.4);
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

  /* Drag fallen stars up into the moon's sky; each one placed joins a constellation. */
  const [stars, setStars] = useState(() => [0, 1, 2].map((i) => ({ k: nextId++, x: 20 + i * 30, y: 74, sx: 20 + i * 30, sy: 74 })));
  const [placed, setPlaced] = useState<{ k: number; x: number; y: number }[]>([]);
  const [moonGlow, setMoonGlow] = useState(0);
  const drag = useRef<number | null>(null);
  const grab = (k: number, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = k;
    sounds.pop();
    setStars((s) => s.map((x) => (x.k === k ? { ...x } : x)));
  };
  const dragMove = (k: number, e: React.PointerEvent) => {
    if (drag.current !== k) return;
    e.stopPropagation();
    const p = local(ctx.root.current, e);
    sparkle(p.x, p.y, p.h);
    setStars((s) => s.map((x) => (x.k === k ? { ...x, x: (p.x / p.w) * 100, y: (p.y / p.h) * 100 } : x)));
  };
  const drop = (k: number, e: React.PointerEvent) => {
    if (drag.current !== k) return;
    e.stopPropagation();
    drag.current = null;
    const st = stars.find((x) => x.k === k);
    if (!st) return;
    if (st.y < 42) {
      const spot = { k, x: 12 + Math.random() * 76, y: 14 + Math.random() * 22 };
      setStars((s) => s.filter((x) => x.k !== k));
      setPlaced((pl) => {
        const next = [...pl, spot].slice(-12);
        return next;
      });
      setMoonGlow((g) => g + 1);
      const p = local(ctx.root.current, e);
      ctx.burst(p.x, p.y, ["⭐", "✨", "💫"], 10);
      playMelody([659, 784, 988, 1319], 0.1, "sine", 0.1);
      const left = stars.length - 1;
      if (left === 0) {
        ctx.later(() => { sounds.cheer(); void ctx.say(rnd(["Oba!", "Muito bem!", "Uau!"])); setParade({ id: nextId++, emoji: rnd(PARADE) }); }, 500);
        ctx.later(() => setParade(null), 5500);
        ctx.later(() => setStars([0, 1, 2].map((i) => { const x = 18 + i * 32 + Math.random() * 6; return { k: nextId++, x, y: 74, sx: x, sy: 74 }; })), 1800);
      } else void ctx.say(rnd(["Isso!", "Que legal!"]));
    } else {
      sounds.transition();
      setStars((s) => s.map((x) => (x.k === k ? { ...x, x: x.sx, y: x.sy } : x)));
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
      <div key={moonGlow} className={`pointer-events-none absolute inset-x-0 top-6 flex justify-center text-7xl ${moonGlow ? "magic-moon-glow" : "animate-bob"}`} aria-hidden>{moonGlow ? "🌝" : "🌙"}</div>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {placed.slice(1).map((p, i) => <line key={p.k} x1={`${placed[i]!.x}%`} y1={`${placed[i]!.y}%`} x2={`${p.x}%`} y2={`${p.y}%`} stroke="var(--joy-sun)" strokeWidth="3" strokeDasharray="6 8" className="magic-line" />)}
      </svg>
      {placed.map((p) => <div key={p.k} className="magic-twinkle pointer-events-none absolute text-4xl" style={{ left: `${p.x}%`, top: `${p.y}%` }} aria-hidden>⭐</div>)}
      {stars.map((st) => {
        const active = drag.current === st.k;
        return (
          <button
            key={st.k}
            type="button"
            aria-label="estrelinha"
            onPointerDown={(e) => grab(st.k, e)}
            onPointerMove={(e) => dragMove(st.k, e)}
            onPointerUp={(e) => drop(st.k, e)}
            onPointerCancel={(e) => drop(st.k, e)}
            className={`absolute z-10 flex h-32 w-32 items-center justify-center touch-none ${active ? "" : "transition-all duration-500 ease-out magic-wobble"}`}
            style={{ left: `${st.x}%`, top: `${st.y}%`, transform: `translate(-50%,-50%) scale(${active ? 1.35 : 1})` }}
          >
            <span className="text-[4.5rem] leading-none" style={{ filter: `drop-shadow(0 0 ${active ? 22 : 10}px var(--joy-sun))` }}>⭐</span>
          </button>
        );
      })}
      {stars.length > 0 && placed.length === 0 && <div className="magic-arrow-up pointer-events-none absolute left-1/2 top-[52%] text-5xl" aria-hidden>👆</div>}
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
  { id: "xilofone", label: "xilofone", emoji: "🎼", notes: [784, 988] },
].slice(0, 6);

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
    playInstrument(id);
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
      if (under.length) { grow(under); playNote("xilofone", 660 + Math.random() * 330, 0, 0.7); }
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

/* ---------------- 6. Sea: fishing — move the hook, catch, reel up ---------------- */
const SEA = [
  { e: "🐠", say: "Olha o peixinho!", f: 523 },
  { e: "🐙", say: "Que legal!", f: 392 },
  { e: "🐢", say: "Que legal!", f: 330 },
  { e: "🐡", say: "Olha o peixinho!", f: 587 },
  { e: "🦀", say: "Uau!", f: 440 },
  { e: "🐬", say: "Que legal!", f: 659 },
  { e: "🐟", say: "Olha o peixinho!", f: 494 },
];
const TREASURE = ["💎", "👑", "🪙", "⭐", "🐚", "🌈"];
const WATER = 24; // % where the water starts
type Swimmer = { k: number; e: string; say: string; f: number; x: number; y: number; v: number; ph: number };
const newSwimmer = (y?: number): Swimmer => {
  const c = rnd(SEA);
  const left = Math.random() < 0.5;
  return { ...c, k: nextId++, x: left ? -8 : 108, y: y ?? 36 + Math.random() * 40, v: (left ? 1 : -1) * (0.08 + Math.random() * 0.07), ph: Math.random() * 6 };
};

function SeaScene({ ctx }: { ctx: Ctx }) {
  const fish = useRef<Swimmer[]>([0, 1, 2, 3].map((i) => { const f = newSwimmer(36 + i * 11); f.x = 15 + Math.random() * 70; return f; }));
  const hook = useRef({ x: 50, y: 45, tx: 50, ty: 45 });
  const caught = useRef<{ f: Swimmer; t0: number; fromY: number } | null>(null);
  const [bucket, setBucket] = useState<{ k: number; e: string }[]>([]);
  const [chest, setChest] = useState(false);
  const [, setTick] = useState(0);
  const count = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const h = hook.current;
      const c = caught.current;
      if (c) {
        const k = Math.min(1, (now - c.t0) / 1100);
        h.y = c.fromY + (WATER - 8 - c.fromY) * (1 - Math.pow(1 - k, 2));
        c.f.x = h.x; c.f.y = h.y + 6;
        if (k >= 1) {
          caught.current = null;
          const f = c.f;
          setBucket((b) => [...b.slice(-5), { k: f.k, e: f.e }]);
          sounds.cheer();
          const r = ctx.root.current?.getBoundingClientRect();
          ctx.burst(((r?.width ?? 300) * h.x) / 100, ((r?.height ?? 600) * h.y) / 100, ["💦", "✨", "⭐"], 10);
          fish.current = fish.current.filter((x) => x !== f).concat(newSwimmer());
          h.ty = 45;
          if (++count.current % 5 === 0) {
            setChest(true);
            ctx.later(() => { sounds.sparkle(); const rr = ctx.root.current?.getBoundingClientRect(); ctx.burst((rr?.width ?? 300) / 2, (rr?.height ?? 600) - 170, TREASURE, 14); void ctx.say("Uau!"); }, 300);
            ctx.later(() => setChest(false), 3800);
          } else void ctx.say(rnd(["Muito bem!", "Oba!", "Isso!"]));
        }
      } else {
        h.x += (h.tx - h.x) * 0.12;
        h.y += (h.ty - h.y) * 0.12;
        for (const f of fish.current) {
          if (Math.hypot((f.x - h.x) * 0.8, f.y - h.y - 4) < 10) {
            caught.current = { f, t0: now, fromY: h.y };
            sounds.pop();
            playMelody([f.f, f.f * 1.25, f.f * 1.5, f.f * 2], 0.1, "sine", 0.1);
            void ctx.say(f.say);
            break;
          }
        }
      }
      for (const f of fish.current) {
        if (caught.current?.f === f) continue;
        f.x += f.v;
        f.ph += 0.04;
        if (f.x < -10 || f.x > 110) Object.assign(f, newSwimmer(f.y), { k: f.k });
      }
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (e: React.PointerEvent) => {
    if (e.type === "pointermove" && e.buttons === 0 && e.pointerType === "mouse") return;
    const p = local(ctx.root.current, e);
    hook.current.tx = Math.max(6, Math.min(94, (p.x / p.w) * 100));
    hook.current.ty = Math.max(WATER + 6, Math.min(80, (p.y / p.h) * 100));
    const now = performance.now();
    if (now - last.current > 220) { last.current = now; ctx.burst(p.x, p.y, ["🫧"], 2); }
  };

  const h = hook.current;
  return (
    <div className="absolute inset-0 overflow-hidden" onPointerDown={move} onPointerMove={move}>
      <div className="absolute inset-x-0 top-0 bg-joy-sky/30" style={{ height: `${WATER}%` }} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-joy-sky/70 to-joy-sky" style={{ top: `${WATER}%` }}>
        <div className="sea-wave absolute -top-3 left-0 h-6 w-[200%] rounded-full bg-joy-sky/60" />
      </div>
      <div className="pointer-events-none absolute right-6 top-4 text-5xl animate-bob" aria-hidden>☀️</div>
      {/* boat + line + hook */}
      <div className="pointer-events-none absolute text-7xl leading-none sea-rock" style={{ left: `${h.x}%`, top: `${WATER - 13}%`, transform: "translateX(-50%)" }} aria-hidden>⛵</div>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <line x1={`${h.x}%`} y1={`${WATER - 2}%`} x2={`${h.x}%`} y2={`${h.y}%`} stroke="currentColor" strokeWidth="3" className="text-foreground/60" />
      </svg>
      <div className="pointer-events-none absolute text-5xl leading-none" style={{ left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%,-30%)" }} aria-hidden>🪝</div>
      {fish.current.map((f) => {
        const isCaught = caught.current?.f === f;
        return (
          <div
            key={f.k}
            className="pointer-events-none absolute text-[5rem] leading-none"
            style={{
              left: `${f.x}%`,
              top: `${f.y + (isCaught ? 0 : Math.sin(f.ph) * 2)}%`,
              transform: `translate(-50%,-50%) scaleX(${f.v > 0 ? -1 : 1}) rotate(${isCaught ? Math.sin(performance.now() / 60) * 25 : Math.sin(f.ph * 2) * 6}deg)`,
              filter: isCaught ? "drop-shadow(0 0 14px var(--joy-sun))" : undefined,
            }}
            aria-hidden
          >
            {f.e}
          </div>
        );
      })}
      <div className="pointer-events-none absolute bottom-24 left-3 text-6xl sea-sway" aria-hidden>🌿</div>
      <div className="pointer-events-none absolute bottom-24 right-4 text-5xl sea-sway" style={{ animationDelay: "0.8s" }} aria-hidden>🪸</div>
      <div className="pointer-events-none absolute bottom-24 left-1/2 text-7xl transition-transform duration-500" style={{ transform: `translateX(-50%) scale(${chest ? 1.35 : 1}) rotate(${chest ? -6 : 0}deg)` }} aria-hidden>
        {chest ? "✨🧰✨" : "🧰"}
      </div>
      {/* bucket of caught friends */}
      <div className="pointer-events-none absolute left-3 top-3 flex max-w-[45%] flex-wrap items-center gap-1 rounded-3xl bg-card/70 px-3 py-1 text-3xl shadow-soft" aria-hidden>
        🪣{bucket.map((b) => <span key={b.k} className="animate-pop inline-block">{b.e}</span>)}
      </div>
    </div>
  );
}
