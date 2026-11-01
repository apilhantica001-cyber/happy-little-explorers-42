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
  const projectile = useRef<HTMLDivElement>(null);
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
    for (const ref of [guide, ghost, burst, projectile]) if (ref.current) ref.current.hidden = true;
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
      const W = window.innerWidth;
      let frames: Keyframe[];
      if (reduced) frames = [{ transform: at(end.x, end.y) }];
      else if (style === "archery") {
        // The bow stays put, draws back and shoots a real arrow at the answer.
        const bow = { x: Math.max(55, Math.min(end.x - 170, W * .18)), y: Math.min(window.innerHeight - 90, end.y + 60) };
        const angle = Math.atan2(end.y - bow.y, end.x - bow.x) * 180 / Math.PI;
        frames = [
          { transform: at(bow.x, bow.y, .3, angle + 45), opacity: 0, offset: 0 },
          { transform: at(bow.x, bow.y, 1.1, angle + 45), opacity: 1, offset: .15 },
          { transform: at(bow.x - 14, bow.y + 6, 1.2, angle + 45), opacity: 1, offset: .38 },
          { transform: at(bow.x, bow.y, 1, angle + 45), opacity: 1, offset: .45 },
          { transform: at(bow.x, bow.y, 1, angle + 45), opacity: 0, offset: 1 },
        ];
        const arrow = projectile.current;
        if (arrow) {
          arrow.hidden = false;
          animations.current.push(arrow.animate([
            { transform: at(bow.x, bow.y, 1, angle), opacity: 0, offset: 0 },
            { transform: at(bow.x - 14, bow.y + 6, 1, angle), opacity: 1, offset: .38 },
            { transform: at(bow.x, bow.y, 1, angle), opacity: 1, offset: .45, easing: "cubic-bezier(.3,0,.9,.6)" },
            { transform: at(end.x, end.y, 1, angle), opacity: 1, offset: .8 },
            { transform: at(end.x, end.y, 1, angle), opacity: 1, offset: 1 },
          ], { duration, fill: "forwards" }));
        }
      } else if (style === "parachute") {
        // Floats down from the sky, swaying gently, onto the answer.
        frames = [0, .2, .4, .6, .8, 1].map((o) => ({
          transform: at(end.x + (o < 1 ? Math.sin(o * Math.PI * 3) * 60 : 0), -80 + (end.y + 80) * o, 1, o < 1 ? Math.sin(o * Math.PI * 3) * 12 : 0), offset: o,
        }));
      } else if (style === "sunflower") {
        // A seed drops onto the answer and a sunflower grows right there.
        frames = [
          { transform: at(end.x, -60, .5), offset: 0 },
          { transform: at(end.x, end.y, .5), offset: .4, easing: "ease-out" },
          { transform: at(end.x, end.y, .3), offset: .5 },
          { transform: at(end.x, end.y - 20, 1.5, -8), offset: .8 },
          { transform: at(end.x, end.y, 1.2, 0), offset: 1 },
        ];
        window.setTimeout(() => { if (actor.dataset['style'] === "sunflower") actor.textContent = "🌱"; }, 0);
        window.setTimeout(() => { if (actor.dataset['style'] === "sunflower") actor.textContent = "🌻"; }, duration * .55);
      } else if (style === "stars") {
        // A shooting star streaks from the top corner straight to the answer.
        frames = [
          { transform: at(W + 60, -60, .6, 0), offset: 0 },
          { transform: at(W + 60, -60, .6, 0), offset: .2 },
          { transform: at(end.x, end.y, 1.3, -360), offset: .85, easing: "ease-out" },
          { transform: at(end.x, end.y, 1, -360), offset: 1 },
        ];
      } else {
        // Rocket loops around the screen before landing.
        frames = [
          { transform: at(start.x, start.y, 1, 0), offset: 0 },
          { transform: at(W * .85, 120, 1, 45), offset: .3 },
          { transform: at(W * .15, 180, 1, -60), offset: .6 },
          { transform: at(end.x, end.y - 60, 1, 150), offset: .85 },
          { transform: at(end.x, end.y, 1, 180), offset: 1 },
        ];
      }
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
        actor.hidden = true;
        if (projectile.current) projectile.current.hidden = true;
        target.classList.add("manual-hint-target");
        highlighted.current = target;
        const flowers = burst.current;
        if (flowers) {
          flowers.style.transform = at(landing.x, landing.y);
          flowers.textContent = style === "sunflower" ? "🌼 🌻 🌼" : style === "archery" ? "🎯 💥 🎯" : style === "parachute" ? "🎈 ✨ 🎈" : style === "rocket" ? "🎆 ✨ 🎇" : "✨ ⭐ ✨";
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
    <div ref={projectile} hidden aria-hidden className="creative-hint hint-arrow pointer-events-none fixed left-0 top-0 z-40" />
    <div ref={ghost} hidden aria-hidden className="creative-hint hint-copy pointer-events-none fixed left-0 top-0 z-40 text-6xl" />
    <div ref={burst} hidden aria-hidden className="creative-hint hint-reveal pointer-events-none fixed left-0 top-0 z-40 text-4xl" />
  </>;
}