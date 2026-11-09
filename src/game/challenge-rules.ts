export type Level = "facil" | "medio" | "dificil";

/** Easy is already "medium", medium is hard, hard is very hard (user request). */
const CONFIG = {
  facil: { goal: 15, speed: 1.3, count: 5, decoy: 0.35, size: 6.5, colors: 4, switchEvery: 5, holes: 6, opts: 4, silhouette: false, pads: 4, seq: 3 },
  medio: { goal: 25, speed: 1.9, count: 7, decoy: 0.5, size: 5.5, colors: 6, switchEvery: 4, holes: 9, opts: 6, silhouette: false, pads: 4, seq: 4 },
  dificil: { goal: 40, speed: 2.7, count: 9, decoy: 0.62, size: 4.5, colors: 8, switchEvery: 3, holes: 9, opts: 8, silhouette: true, pads: 6, seq: 5 },
} as const;

export const LEVELS: Level[] = ["facil", "medio", "dificil"];
export const challengeConfig = (lv: Level) => CONFIG[lv];

/** Combo grows on each hit and resets on a miss; never negative. */
export const nextCombo = (combo: number, hit: boolean) => (hit ? combo + 1 : 0);
/** Every 5th hit in a row is worth 2 points. Misses never take points away. */
export const pointsFor = (combo: number) => (combo > 0 && combo % 5 === 0 ? 2 : 1);
