import { useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNarrating } from "./audio";

export const HINT_EVENT = "toca-toca:hint";

/** Demonstrations never press a button or move the child's real objects. */
export function HintControl() {
  const hand = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const animations = useRef<Animation[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const lastRequest = useRef(0);
  const clear = () => {
    animations.current.forEach((a) => a.cancel());
    animations.current = [];
    window.clearTimeout(timer.current);
    if (hand.current) hand.current.hidden = true;
  };
  useEffect(() => clear, []);
  const request = () => {
    if (isNarrating() || Date.now() - lastRequest.current < 1800) return;
    lastRequest.current = Date.now();
    clear();
    setRunning(true);
    window.dispatchEvent(new Event(HINT_EVENT));
    // Let every activity render its strongest hint before measuring it.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const stage = hand.current?.closest(".game-stage");
      const target = stage?.querySelector<HTMLElement>('[data-hint-target="true"]');
      const source = stage?.querySelector<HTMLElement>('[data-hint-source="true"]');
      if (!target || !hand.current) { setRunning(false); return; }
      const center = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      };
      const end = center(target);
      const start = source ? center(source) : end;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const frames = source ? [
        { transform: `translate(${start.x}px, ${start.y}px) scale(1)`, opacity: 1, offset: 0 },
        { transform: `translate(${start.x}px, ${start.y}px) scale(.9)`, opacity: 1, offset: .18 },
        { transform: `translate(${end.x}px, ${end.y}px) scale(1)`, opacity: 1, offset: .8 },
        { transform: `translate(${end.x}px, ${end.y}px) scale(1.15)`, opacity: .5, offset: 1 },
      ] : [
        { transform: `translate(${end.x}px, ${end.y + 28}px) scale(1)`, opacity: 1 },
        { transform: `translate(${end.x}px, ${end.y}px) scale(.85)`, opacity: 1 },
        { transform: `translate(${end.x}px, ${end.y + 28}px) scale(1)`, opacity: 1 },
      ];
      hand.current.hidden = false;
      hand.current.textContent = source ? "✋" : "👆";
      const demo = hand.current.animate(reduced ? [frames[frames.length - 1] ?? {}] : frames,
        { duration: reduced ? 1600 : source ? 2200 : 1100, iterations: reduced ? 1 : 2, fill: "forwards", easing: "ease-in-out" });
      animations.current.push(demo);
      const highlight = target.animate([{ outlineOffset: "4px", opacity: 1 }, { outlineOffset: "12px", opacity: .7 }, { outlineOffset: "4px", opacity: 1 }], { duration: 1200, iterations: reduced ? 1 : 3 });
      target.classList.add("manual-hint-target");
      animations.current.push(highlight);
      timer.current = window.setTimeout(() => { target.classList.remove("manual-hint-target"); clear(); setRunning(false); }, 4500);
    }));
  };
  return <>
    <div data-hint-controls className="fixed left-[max(.75rem,env(safe-area-inset-left))] top-[max(.75rem,env(safe-area-inset-top))] z-40">
      <Button type="button" size="icon" variant="secondary" className="h-12 w-12 rounded-full bg-joy-sun shadow-soft" aria-label="Mostrar dica" title="Mostrar dica" onClick={request} disabled={running}>
        <Lightbulb className="size-7" />
      </Button>
    </div>
    <div ref={hand} hidden aria-hidden className="hint-hand pointer-events-none fixed left-0 top-0 z-40 text-6xl" />
  </>;
}