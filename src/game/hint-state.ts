/** Shared synchronous lock: animation starts and input protection are atomic. */
let owner: symbol | undefined;
const listeners = new Set<() => void>();
export const isHintRunning = () => owner !== undefined;
export function subscribeHint(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function beginHint(): (() => void) | undefined {
  if (owner) return undefined;
  const token = Symbol("hint");
  owner = token;
  listeners.forEach((listener) => listener());
  return () => {
    if (owner !== token) return;
    owner = undefined;
    listeners.forEach((listener) => listener());
  };
}

export const HINT_STYLES = ["rocket", "archery", "sunflower", "parachute", "stars"] as const;
export type HintStyle = typeof HINT_STYLES[number];
let lastStyle: HintStyle | undefined;
/** Random style each time, never the same one twice in a row. */
export function chooseHintStyle(random: () => number = Math.random): HintStyle {
  const options = HINT_STYLES.filter((s) => s !== lastStyle);
  const style = options[Math.floor(random() * options.length) % options.length] ?? "rocket";
  lastStyle = style;
  return style;
}
