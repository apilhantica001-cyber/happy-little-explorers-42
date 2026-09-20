import { useCallback, useEffect, useRef, useState } from "react";

/** Returns a hint level (0 = none, 1 = discreet hint, 2 = stronger help) that
 * grows while the child does not interact, and a poke() to reset it. */
export function useIdleHint(resetKey: unknown, firstDelay = 5000, secondDelay = 10000) {
  const [level, setLevel] = useState(0);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const schedule = useCallback(() => {
    clear();
    setLevel(0);
    timers.current.push(window.setTimeout(() => setLevel(1), firstDelay));
    timers.current.push(window.setTimeout(() => setLevel(2), secondDelay));
  }, [firstDelay, secondDelay]);

  useEffect(() => {
    schedule();
    return clear;
  }, [schedule, resetKey]);

  return { level, poke: schedule };
}
