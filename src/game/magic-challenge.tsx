import { useCallback, useEffect, useRef, useState } from "react";
import { playAnimalSound, playMelody, playNote, sounds, type SpeechPart } from "./audio";
import { ANIMALS, COLORS } from "./data";
import { challengeConfig, nextCombo, pointsFor, type Level } from "./challenge-rules";

/**
 * Céu Mágico challenges: one mini-game per world, three difficulty levels,
 * each with a point goal. Missing never removes points — it only breaks the
 * combo — so the child can always finish.
 */
const rnd = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)] as T;
const MEDAL: Record<Level, string> = { facil: "🥉", medio: "🥈", dificil: "🥇" };
const MEDAL_KEY = "toca-toca-medals-v1";

export function getMedals(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(MEDAL_KEY) ?? "{}"); } catch { return {}; }
}
function saveMedal(scene: string, lv: Level) {
  try { localStorage.setItem(MEDAL_KEY, JSON.stringify({ ...getMedals(), [`${scene}:${lv}`]: true })); } catch { /* ignore */ }
}

export const TASK: Record<string, { icon: string; say: string }> = {
  ceu: { icon: "⭐", say: "Pegue as estrelas!" },
  fazenda: { icon: "🏠", say: "Leve cada bichinho para a sua casinha!" },
  bolhas: { icon: "🫧", say: "Estoure as bolhas!" },
  musica: { icon: "🎵", say: "Vamos brincar!" },
  jardim: { icon: "🦋", say: "Olha!" },
  mar: { icon: "🐟", say: "Olha o peixinho!" },
};

type Props = {
  scene: string;
  level: Level;
  say: (...p: SpeechPart[]) => Promise<boolean>;
  burst: (x: number, y: number, emojis?: string[], n?: number) => void;
  onExit: () => void;
  onLevel: (lv: Level) => void;
};

export function MagicChallenge({ scene, level, say, burst, onExit, onLevel }: Props) {
  const cfg = challengeConfig(level);
  const box = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState(0);
  const [combo, setCombo] = useState(0);
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const [parade, setParade] = useState(false);
  const [shake, setShake] = useState(0);
  const done = points >= cfg.goal;
  const half = useRef(false);
  const fid = useRef(1);

  useEffect(() => { void say(TASK[scene]?.say ?? "Vamos brincar!"); }, [scene, level]); // eslint-disable-line react-hooks/exhaustive-deps

  const hit = useCallback((px: number, py: number) => {
    if (done) return;
    setCombo((c) => {
      const nc = nextCombo(c, true);
      const add = pointsFor(nc);
      setPoints((p) => Math.min(cfg.goal, p + add));
      const id = fid.current++;
      setFloats((f) => [...f, { id, x: px, y: py, text: add > 1 ? `+${add} 🔥` : "+1" }]);
      window.setTimeout(() => setFloats((f) => f.filter((v) => v.id !== id)), 900);
      if (add > 1) { setShake((s) => s + 1); sounds.sparkle(); }
      return nc;
    });
    burst(px, py, ["✨", "⭐", "💫"], 7);
  }, [burst, cfg.goal, done]);

  const miss = useCallback(() => { setCombo(0); sounds.gentle(); }, []);

  useEffect(() => {
    if (!half.current && points >= cfg.goal / 2 && !done) {
      half.current = true;
      setParade(true);
      sounds.cheer();
      void say("Uau!");
      window.setTimeout(() => setParade(false), 3200);
    }
    if (done) {
      saveMedal(scene, level);
      sounds.cheer();
      void say("Você conseguiu!");
      const r = box.current?.getBoundingClientRect();
      if (r) for (let i = 0; i < 6; i++) window.setTimeout(() => burst(Math.random() * r.width, Math.random() * r.height * 0.7, ["🎉", "🎊", "⭐", "🎈", "🌟"], 10), i * 280);
    }
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = (points / cfg.goal) * 100;
  const props = { cfg, hit, miss, box, done };

  return (
    <div ref={box} data-parent-controls data-challenge={scene} data-level={level} className="absolute inset-0 z-10" key={shake} style={{ animation: shake ? "ch-shake .35s" : undefined }}>
      {/* progress */}
      <div className="absolute inset-x-16 top-3 z-20 h-12 rounded-full bg-card/85 p-1.5 shadow-soft" aria-label={`${points} de ${cfg.goal}`}>
        <div className="ch-fill h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(6, pct)}%` }} />
        <span className="absolute top-1/2 text-3xl transition-[left] duration-500" style={{ left: `calc(${pct}% - 1.6rem)`, transform: "translateY(-50%)" }}>🚀</span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl">{MEDAL[level]}</span>
        <span data-points className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-extrabold text-foreground">{points}/{cfg.goal}</span>
      </div>
      {combo >= 3 && !done && <div key={combo} className="ch-combo absolute left-1/2 top-16 z-20 text-3xl font-extrabold text-foreground">🔥 x{combo}</div>}
      <button type="button" aria-label="Sair do desafio" onClick={onExit} className="absolute right-2 top-2 z-30 h-12 w-12 rounded-full bg-card/85 text-2xl shadow-soft">✕</button>

      {scene === "ceu" && <Mover kind="ceu" {...props} />}
      {scene === "bolhas" && <Mover kind="bolhas" {...props} say={say} />}
      {scene === "mar" && <Mover kind="mar" {...props} say={say} />}
      {scene === "jardim" && <Mover kind="jardim" {...props} />}
      {scene === "fazenda" && <FarmGame {...props} />}
      {scene === "musica" && <SimonGame {...props} />}

      {floats.map((f) => (
        <span key={f.id} className="ch-float pointer-events-none absolute z-20 text-3xl font-extrabold text-foreground" style={{ left: f.x, top: f.y }}>{f.text}</span>
      ))}
      {parade && <span className="ch-parade pointer-events-none absolute top-1/3 z-20 text-8xl">{rnd(["🐳", "🦄", "🐉", "🚂", "🎠"])}</span>}

      {done && (
        <div className="ch-win absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-background/70 backdrop-blur-sm">
          <div className="ch-medal text-[9rem] leading-none">{MEDAL[level]}</div>
          <div className="flex gap-4">
            <button type="button" aria-label="De novo" onClick={() => onLevel(level)} className="h-20 w-20 rounded-full bg-joy-sun text-4xl shadow-soft active:scale-90">🔁</button>
            {level !== "dificil" && (
              <button type="button" aria-label="Próximo nível" onClick={() => onLevel(level === "facil" ? "medio" : "dificil")} className="ch-pulse h-20 w-20 rounded-full bg-joy-mint text-4xl shadow-soft active:scale-90">➡️</button>
            )}
            <button type="button" aria-label="Voltar a brincar" onClick={onExit} className="h-20 w-20 rounded-full bg-card text-4xl shadow-soft active:scale-90">🌙</button>
          </div>
        </div>
      )}
    </div>
  );
}

type GameProps = {
  cfg: ReturnType<typeof challengeConfig>;
  hit: (x: number, y: number) => void;
  miss: () => void;
  box: React.RefObject<HTMLDivElement | null>;
  done: boolean;
};

/* ---------- moving / popping targets (sky, bubbles, sea, garden) ---------- */
type It = { id: number; x: number; y: number; vx: number; vy: number; emoji: string; good: boolean; bg?: string; life: number; t: number; shake?: number };
const FISH = ["🐟", "🐠", "🐡", "🐙", "🦀", "🐢", "🦈", "🐬"];
const HOLES = [[20, 40], [50, 40], [80, 40], [20, 62], [50, 62], [80, 62], [20, 82], [50, 82], [80, 82]];

function Mover({ kind, cfg, hit, miss, box, done, say }: GameProps & { kind: "ceu" | "bolhas" | "mar" | "jardim"; say?: Props["say"] }) {
  const [items, setItems] = useState<It[]>([]);
  const [target, setTarget] = useState(() => (kind === "bolhas" ? rnd(COLORS.slice(0, cfg.colors)).id : rnd(FISH.slice(0, cfg.colors))));
  const hits = useRef(0);
  const id = useRef(1);
  const targetRef = useRef(target);
  targetRef.current = target;

  const spawn = useCallback((list: It[]): It => {
    const s = cfg.speed;
    const forceGood = !list.some((i) => i.good) || Math.random() > cfg.decoy;
    const n = id.current++;
    if (kind === "ceu") {
      return { id: n, x: 8 + Math.random() * 84, y: -8, vx: (Math.random() - 0.5) * 4 * s, vy: (7 + Math.random() * 5) * s, emoji: forceGood ? rnd(["⭐", "🌟", "✨"]) : rnd(["☁️", "🌧️", "🌙"]), good: forceGood, life: 99, t: 0 };
    }
    if (kind === "bolhas") {
      const pool = COLORS.slice(0, cfg.colors);
      const c = forceGood ? pool.find((p) => p.id === targetRef.current)! : rnd(pool.filter((p) => p.id !== targetRef.current));
      return { id: n, x: 10 + Math.random() * 80, y: 108, vx: 0, vy: -(8 + Math.random() * 5) * s, emoji: "", bg: c.bg, good: forceGood, life: 99, t: Math.random() * 6 };
    }
    if (kind === "mar") {
      const left = Math.random() < 0.5;
      const e = forceGood ? targetRef.current : rnd(FISH.slice(0, cfg.colors).filter((f) => f !== targetRef.current));
      return { id: n, x: left ? -8 : 108, y: 30 + Math.random() * 55, vx: (left ? 1 : -1) * (9 + Math.random() * 6) * s, vy: 0, emoji: e, good: forceGood, life: 99, t: Math.random() * 6 };
    }
    const free = HOLES.slice(0, cfg.holes).filter(([x, y]) => !list.some((i) => i.x === x && i.y === y));
    const [x, y] = rnd(free.length ? free : HOLES);
    return { id: n, x: x!, y: y!, vx: 0, vy: 0, emoji: forceGood ? "🦋" : rnd(["🐝", "🐛", "🐞"]), good: forceGood, life: 2.6 / s, t: 0 };
  }, [cfg, kind]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setItems((list) => {
        let next = list
          .map((i) => ({ ...i, t: i.t + dt, x: i.x + i.vx * dt + (kind === "bolhas" ? Math.sin(i.t * 2) * 0.15 : 0), y: i.y + i.vy * dt + (kind === "mar" ? Math.sin(i.t * 3) * 0.12 : 0), life: i.life - dt }))
          .filter((i) => i.life > 0 && i.y > -15 && i.y < 115 && i.x > -15 && i.x < 115);
        while (next.length < cfg.count) next = [...next, spawn(next)];
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cfg.count, kind, spawn]);

  const tap = (it: It, e: React.PointerEvent) => {
    e.stopPropagation();
    if (done) return;
    const r = box.current?.getBoundingClientRect();
    const px = e.clientX - (r?.left ?? 0);
    const py = e.clientY - (r?.top ?? 0);
    if (!it.good) {
      miss();
      setItems((l) => l.map((i) => (i.id === it.id ? { ...i, shake: Date.now() } : i)));
      return;
    }
    setItems((l) => l.filter((i) => i.id !== it.id));
    if (kind === "bolhas") sounds.pop();
    else if (kind === "ceu") playMelody([rnd([784, 880, 988]), 1318], 0.07, "sine", 0.12);
    else if (kind === "mar") playMelody([523, 659, 784], 0.07, "triangle", 0.12);
    else playMelody([988, 1175], 0.06, "sine", 0.12);
    hit(px, py);
    hits.current++;
    if ((kind === "bolhas" || kind === "mar") && hits.current % cfg.switchEvery === 0) {
      const nt = kind === "bolhas" ? rnd(COLORS.slice(0, cfg.colors).filter((c) => c.id !== targetRef.current)).id : rnd(FISH.slice(0, cfg.colors).filter((f) => f !== targetRef.current));
      setTarget(nt);
      const c = COLORS.find((x) => x.id === nt);
      if (c && say) void say(`${c.label[0]!.toUpperCase()}${c.label.slice(1)}!`);
    }
  };

  const tc = COLORS.find((c) => c.id === target);
  const size = `${cfg.size}rem`;

  return (
    <>
      {kind === "jardim" && HOLES.slice(0, cfg.holes).map(([x, y]) => (
        <span key={`${x}-${y}`} className="pointer-events-none absolute text-6xl" style={{ left: `${x}%`, top: `${y! + 6}%`, transform: "translate(-50%,-50%)" }}>🌼</span>
      ))}
      {(kind === "bolhas" || kind === "mar") && (
        <div className="ch-target absolute left-1/2 top-20 z-20 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full bg-card/90 text-5xl shadow-soft" key={target}>
          {tc ? <span className="block h-14 w-14 rounded-full" style={{ background: tc.bg }} /> : target}
        </div>
      )}
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          data-good={it.good || undefined}
          onPointerDown={(e) => tap(it, e)}
          className="ch-item absolute flex items-center justify-center rounded-full"
          style={{ left: `${it.x}%`, top: `${it.y}%`, width: `calc(${size} + 1.5rem)`, height: `calc(${size} + 1.5rem)`, transform: `translate(-50%,-50%) scaleX(${it.vx < 0 ? -1 : 1})` }}
        >
          <span
            key={it.shake}
            className={`block leading-none ${kind === "jardim" ? "ch-peek" : ""} ${it.shake ? "ch-no" : ""}`}
            style={it.bg
              ? { width: size, height: size, borderRadius: "9999px", background: `radial-gradient(circle at 30% 30%, white 0 12%, ${it.bg} 45%)`, boxShadow: `0 0 18px ${it.bg}` }
              : { fontSize: `calc(${size} * .8)`, filter: it.good ? "drop-shadow(0 0 10px var(--joy-sun))" : undefined }}
          >
            {it.emoji}
          </span>
        </button>
      ))}
    </>
  );
}

/* ---------- farm: drag the asked animal into the barn ---------- */
function FarmGame({ cfg, hit, miss, box, done }: GameProps) {
  const pool = ANIMALS.filter((a) => a.emoji).slice(0, 10);
  const newRound = () => {
    const opts = [...pool].sort(() => Math.random() - 0.5).slice(0, cfg.opts);
    return { opts, want: rnd(opts) };
  };
  const [round, setRound] = useState(newRound);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [glow, setGlow] = useState(0);
  const barn = useRef<HTMLDivElement>(null);

  useEffect(() => { void playAnimalSound(round.want.id); }, [round]);

  const up = (e: React.PointerEvent) => {
    if (!drag || done) return setDrag(null);
    const b = barn.current?.getBoundingClientRect();
    const inside = b && e.clientX > b.left - 30 && e.clientX < b.right + 30 && e.clientY > b.top - 30 && e.clientY < b.bottom + 30;
    if (inside) {
      if (drag.id === round.want.id) {
        sounds.snap();
        setGlow((g) => g + 1);
        const r = box.current!.getBoundingClientRect();
        hit(b.left + b.width / 2 - r.left, b.top + b.height / 2 - r.top);
        window.setTimeout(() => setRound(newRound()), 450);
      } else miss();
    }
    setDrag(null);
  };

  return (
    <div className="absolute inset-0" onPointerMove={(e) => drag && setDrag({ ...drag, x: e.clientX, y: e.clientY })} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
      <div ref={barn} key={glow} className="ch-barn absolute left-1/2 top-[18%] flex h-44 w-44 -translate-x-1/2 flex-col items-center justify-end rounded-4xl bg-card/80 shadow-soft">
        <span className="text-8xl leading-none">🏠</span>
        <button type="button" aria-label="Ouvir" onClick={() => void playAnimalSound(round.want.id)} className="ch-want absolute -top-8 flex h-20 w-20 items-center justify-center rounded-full bg-joy-sun text-5xl shadow-soft" style={{ filter: cfg.silhouette ? "brightness(0)" : undefined }}>
          {round.want.emoji}
        </button>
      </div>
      <div className="absolute inset-x-2 bottom-24 flex flex-wrap justify-center gap-3">
        {round.opts.map((a, i) => (
          <button
            key={a.id + glow}
            type="button"
            aria-label={a.label}
            onPointerDown={(e) => { e.currentTarget.releasePointerCapture?.(e.pointerId); setDrag({ id: a.id, x: e.clientX, y: e.clientY }); sounds.tap(); }}
            className="ch-pop flex h-24 w-24 items-center justify-center rounded-full bg-card/80 text-6xl shadow-soft"
            style={{ animationDelay: `${i * 70}ms`, opacity: drag?.id === a.id ? 0.25 : 1 }}
          >
            {a.emoji}
          </button>
        ))}
      </div>
      {drag && (
        <span className="pointer-events-none fixed z-50 text-7xl" style={{ left: drag.x, top: drag.y, transform: "translate(-50%,-50%) scale(1.2)", filter: "drop-shadow(0 8px 10px rgb(0 0 0 / .3))" }}>
          {pool.find((p) => p.id === drag.id)?.emoji}
        </span>
      )}
    </div>
  );
}

/* ---------- music: repeat the glowing sequence ---------- */
const PADS = [
  { e: "🥁", f: 196, c: "var(--joy-bubble)" }, { e: "🎹", f: 262, c: "var(--joy-sky)" }, { e: "🎸", f: 330, c: "var(--joy-mint)" },
  { e: "🎺", f: 392, c: "var(--joy-sun)" }, { e: "🔔", f: 523, c: "var(--accent)" }, { e: "🪇", f: 659, c: "var(--secondary)" },
];
const PAD_INST = ["tambor", "piano", "violao", "trompete", "sino", "chocalho"];

function SimonGame({ cfg, hit, miss, box, done }: GameProps) {
  const pads = PADS.slice(0, cfg.pads);
  const [seq, setSeq] = useState<number[]>(() => Array.from({ length: cfg.seq }, () => Math.floor(Math.random() * cfg.pads)));
  const [lit, setLit] = useState<number | null>(null);
  const [showing, setShowing] = useState(true);
  const pos = useRef(0);

  const play = useCallback((s: number[]) => {
    setShowing(true);
    pos.current = 0;
    const step = 650 / cfg.speed + 150;
    s.forEach((p, i) => {
      window.setTimeout(() => { setLit(p); playNote(PAD_INST[p]!, PADS[p]!.f); }, 600 + i * step);
      window.setTimeout(() => setLit(null), 600 + i * step + step * 0.7);
    });
    window.setTimeout(() => setShowing(false), 600 + s.length * step);
  }, [cfg.speed]);

  useEffect(() => { play(seq); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (i: number, e: React.PointerEvent) => {
    if (showing || done) return;
    playNote(PAD_INST[i]!, PADS[i]!.f);
    setLit(i);
    window.setTimeout(() => setLit(null), 220);
    const r = box.current!.getBoundingClientRect();
    if (seq[pos.current] === i) {
      hit(e.clientX - r.left, e.clientY - r.top);
      pos.current++;
      if (pos.current >= seq.length) {
        const next = [...seq, Math.floor(Math.random() * cfg.pads)];
        setSeq(next);
        window.setTimeout(() => play(next), 700);
      }
    } else {
      miss();
      window.setTimeout(() => play(seq), 700);
    }
  };

  return (
    <div className="absolute inset-x-4 bottom-24 top-24 flex flex-col items-center justify-center gap-4">
      <div className="text-6xl">{showing ? "👀" : "👆"}</div>
      <div className={`grid gap-4 ${cfg.pads > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
        {pads.map((p, i) => (
          <button
            key={i}
            type="button"
            aria-label={PAD_INST[i]}
            onPointerDown={(e) => tap(i, e)}
            className="flex h-28 w-28 items-center justify-center rounded-4xl text-6xl shadow-soft transition-transform duration-150"
            style={{ background: p.c, transform: lit === i ? "scale(1.18)" : "scale(1)", boxShadow: lit === i ? `0 0 40px 10px ${p.c}` : undefined, opacity: lit === null || lit === i ? 1 : 0.7 }}
          >
            {p.e}
          </button>
        ))}
      </div>
    </div>
  );
}
