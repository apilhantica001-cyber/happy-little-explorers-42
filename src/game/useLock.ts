import { useRef } from "react";

/** Synchronous tap lock: guarantees at most one accepted answer per round, even with very fast repeated taps. */
export function useLock() {
  const r = useRef(false);
  return {
    tryLock: () => {
      if (r.current) return false;
      r.current = true;
      return true;
    },
    release: () => {
      r.current = false;
    },
  };
}
