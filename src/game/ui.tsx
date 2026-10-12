import { useSyncExternalStore, type ReactNode, type SyntheticEvent } from "react";
import { isNarrating, subscribeNarration } from "./audio";
import { RocketGuide } from "./rocket-guide";
import { HintControl } from "./hints";

export function Stage({ children, hints = false, hintKey }: { children: ReactNode; hints?: boolean; hintKey?: string }) {
  const busy = useSyncExternalStore(subscribeNarration, isNarrating, () => false);
  const guard = (event: SyntheticEvent) => {
    if (!isNarrating()) return;
    const target = event.target;
    if (target instanceof Element && target.closest("[data-parent-controls]")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  return (
    <main aria-busy={busy} onClickCapture={guard} onPointerDownCapture={guard} onPointerMoveCapture={guard} onKeyDownCapture={guard} className="game-stage flex h-[100dvh] w-full flex-col items-center justify-center gap-4 overflow-hidden px-4">
      {children}
      {hints && <HintControl key={hintKey} />}
      <RocketGuide />
    </main>
  );
}

export function Prompt({ children }: { children: ReactNode }) {
  return (
    <div className="animate-bob flex items-center justify-center gap-3 rounded-full bg-card/80 px-6 py-3 shadow-soft">
      {children}
    </div>
  );
}

export function TileGrid({ children, cols = 2 }: { children: ReactNode; cols?: number }) {
  return (
    <div
      className="grid w-full max-w-md gap-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

export function Tile({
  onClick,
  children,
  bg,
  state,
  hint = false,
  hintTarget = false,
}: {
  onClick: () => void;
  children: ReactNode;
  bg?: string | undefined;
  state?: "idle" | "happy" | "wiggle" | "done" | undefined;
  hint?: boolean;
  hintTarget?: boolean;
}) {
  return (
    <button
      type="button"
      data-answer-hint={hint && state !== "happy" ? "true" : undefined}
      data-hint-target={hintTarget || (hint && state !== "happy") ? "true" : undefined}
      onClick={onClick}
      style={bg ? { background: bg } : {}}
      className={[
        "flex aspect-square w-full select-none items-center justify-center rounded-4xl text-[clamp(3rem,18vw,6rem)] shadow-soft transition-transform active:scale-95",
        bg ? "" : "bg-card",
        state === "happy" ? "animate-pop" : "",
        state === "wiggle" ? "animate-wiggle" : "",
        state === "done" ? "opacity-60" : "",
        hint && state !== "happy" ? "animate-bob ring-4 ring-primary/40" : "",
      ].join(" ")}
    >
      <span className="drop-shadow">{children}</span>
    </button>
  );
}

export function Celebration({ show }: { show: boolean }) {
  if (!show) return null;
  const emojis = ["⭐", "🎉", "✨", "🌟", "🎈", "💫", "🎊", "⭐"];
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {emojis.map((e, i) => (
        <span
          key={i}
          className="animate-rise absolute text-6xl"
          style={{ left: `${6 + i * 12}%`, bottom: "-10%", animationDelay: `${i * 0.08}s` }}
        >
          {e}
        </span>
      ))}
    </div>
  );
}
