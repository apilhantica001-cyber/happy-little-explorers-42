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
let nextStyle = 0;
export function chooseHintStyle(): HintStyle {
  const style = HINT_STYLES[nextStyle % HINT_STYLES.length] ?? "rocket";
  nextStyle++;
  return style;
}