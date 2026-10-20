import { useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNarrating } from "./audio";
import { beginHint, chooseHintStyle, type HintStyle } from "./hint-state";

export const HINT_EVENT = "toca-toca:hint";
const guides: Record<HintStyle, string> = {
  rocket: "🚀", archery: "🏹", sunflower: "🌻", parachute: "🪂", stars: "🌟",
};

/** Only the translucent copy moves. The child's objects never move or complete. */
export function HintControl() {
  const guide = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const burst = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const animations = useRef<Animation[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const release = useRef<(() => void) | undefined>(undefined);
  const highlighted = useRef<HTMLElement | null>(null);
  const clear = () => {
    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
    window.clearTimeout(timer.current);
    highlighted.current?.classList.remove("manual-hint-target");
    highlighted.current = null;
    for (const ref of [guide, ghost, burst]) if (ref.current) ref.current.hidden = true;
    release.current?.();
    release.current = undefined;
  };
  useEffect(() => clear, []);
  const request = () => {
    if (isNarrating()) return;
    const unlock = beginHint();
    if (!unlock) return;
    release.current = unlock;
    setRunning(true);
    const style = chooseHintStyle();
    window.dispatchEvent(new Event(HINT_EVENT));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!release.current) return;
      const stage = guide.current?.closest(".game-stage");
      let target = stage?.querySelector<HTMLElement>('[data-hint-target="true"]');
      let source = stage?.querySelector<HTMLElement>('[data-hint-source="true"]');
      const key = source?.dataset['hintKey'];
      if (key && stage) target = [...stage.querySelectorAll<HTMLElement>('[data-hint-target="true"]')].find((el) => el.dataset['hintSlot'] === key) ?? target;
      const swipe = stage?.querySelector<HTMLElement>('[data-hint-swipe="true"]');
      if (swipe) { target = swipe; source = swipe; }
      const actor = guide.current;
      const copy = ghost.current;
      if (!target || !actor || !copy) { clear(); setRunning(false); return; }
      const center = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      };
      const end = center(target);
      const start = source ? center(source) : { x: window.innerWidth * .15, y: window.innerHeight * .25 };
      if (swipe) { const r = swipe.getBoundingClientRect(); start.x = r.left + r.width * .12; end.x = r.left + r.width * .85; }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const duration = reduced ? 700 : 2600;
      actor.textContent = guides[style];
      actor.dataset['style'] = style;
      actor.hidden = false;
      const at = (x: number, y: number, scale = 1, rotation = 0) => `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`;
      const frames = reduced ? [{ transform: at(end.x, end.y) }] : [
        { transform: at(start.x, start.y, style === "sunflower" ? .4 : 1), offset: 0 },
        { transform: at(style === "rocket" ? window.innerWidth * .8 : (start.x + end.x) / 2, style === "parachute" ? 110 : Math.max(100, Math.min(start.y, end.y) - 80), style === "sunflower" ? 1.2 : 1, style === "archery" ? -20 : 0), offset: .45 },
        { transform: at(end.x, end.y), offset: 1 },
      ];
      const flight = actor.animate(frames, { duration, easing: "ease-in-out", fill: "forwards" });
      animations.current.push(flight);
      if (source) {
        copy.textContent = swipe ? "👆" : source.textContent?.trim() || "✋";
        copy.hidden = false;
        animations.current.push(copy.animate([
          { transform: at(start.x, start.y, .8), opacity: .55 },
          { transform: at(start.x, start.y, 1), opacity: .75, offset: .25 },
          { transform: at(end.x, end.y, 1), opacity: .75, offset: .9 },
          { transform: at(end.x, end.y, .8), opacity: 0 },
        ], { duration, easing: "ease-in-out", fill: "forwards" }));
      }
      flight.onfinish = () => {
        if (!target?.isConnected || !release.current) { clear(); setRunning(false); return; }
        const landing = center(target);
        actor.style.transform = at(landing.x, landing.y);
        target.classList.add("manual-hint-target");
        highlighted.current = target;
        const flowers = burst.current;
        if (flowers) {
          flowers.style.transform = at(landing.x, landing.y);
          flowers.textContent = style === "sunflower" ? "🌼 🌻 🌼" : style === "archery" ? "🎯 ✨" : "✨ ⭐ ✨";
          flowers.hidden = false;
          animations.current.push(flowers.animate([{ opacity: 0, scale: .5 }, { opacity: 1, scale: 1.1 }, { opacity: 1, scale: 1 }], { duration: reduced ? 200 : 600, fill: "forwards" }));
        }
        timer.current = window.setTimeout(() => { clear(); setRunning(false); }, reduced ? 900 : 1500);
      };
    }));
  };
  return <>
    <div data-hint-controls className="fixed left-[max(.75rem,env(safe-area-inset-left))] top-[max(.75rem,env(safe-area-inset-top))] z-40">
      <Button type="button" size="icon" variant="secondary" className="h-12 w-12 rounded-full bg-joy-sun shadow-soft" aria-label="Mostrar dica" title="Mostrar dica" onClick={request} disabled={running}>
        <Lightbulb className="size-7" />
      </Button>
    </div>
    <div ref={guide} hidden aria-hidden className="creative-hint pointer-events-none fixed left-0 top-0 z-40 text-6xl" />
    <div ref={ghost} hidden aria-hidden className="creative-hint hint-copy pointer-events-none fixed left-0 top-0 z-40 text-6xl" />
    <div ref={burst} hidden aria-hidden className="creative-hint hint-reveal pointer-events-none fixed left-0 top-0 z-40 text-4xl" />
  </>;
}