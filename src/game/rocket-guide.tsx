import { useEffect, useRef } from "react";

/** One shared flight follows the real answer element, never a guessed position. */
export function RocketGuide() {
  const rocket = useRef<HTMLDivElement>(null);
  const burst = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = rocket.current?.closest(".game-stage");
    if (!stage) return;
    let target: Element | null = null;
    let flight: Animation | undefined;
    let timer: number | undefined;
    const clear = () => {
      flight?.cancel();
      window.clearTimeout(timer);
      if (rocket.current) rocket.current.hidden = true;
      if (burst.current) burst.current.hidden = true;
    };
    const check = () => {
      const next = stage.querySelector('[data-answer-hint="true"]');
      if (next === target) return;
      if (!next) { target = null; clear(); return; }
      target = next;
      clear();
      const ship = rocket.current;
      const fireworks = burst.current;
      if (!ship || !fireworks) return;
      const box = next.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const land = () => {
        ship.hidden = true;
        fireworks.style.left = `${x}px`;
        fireworks.style.top = `${y}px`;
        fireworks.hidden = false;
        fireworks.getAnimations({ subtree: true }).forEach((a) => { a.cancel(); a.play(); });
        timer = window.setTimeout(() => { fireworks.hidden = true; }, 1800);
      };
      if (reduced) { land(); return; }
      ship.hidden = false;
      const w = window.innerWidth;
      const h = window.innerHeight;
      flight = ship.animate([
        { transform: `translate(${w * .12}px, ${h * .72}px) rotate(35deg)` },
        { transform: `translate(${w * .24}px, ${h * .2}px) rotate(70deg)` },
        { transform: `translate(${w * .8}px, ${h * .24}px) rotate(140deg)` },
        { transform: `translate(${w * .84}px, ${h * .58}px) rotate(210deg)` },
        { transform: `translate(${x}px, ${y}px) rotate(180deg) scale(.85)` },
      ], { duration: 2800, easing: "ease-in-out", fill: "forwards" });
      flight.onfinish = land;
    };
    const observer = new MutationObserver(check);
    observer.observe(stage, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-answer-hint"] });
    check();
    return () => { observer.disconnect(); clear(); };
  }, []);
  return (
    <div className="rocket-guide pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      <div ref={rocket} hidden className="hint-rocket absolute left-0 top-0"><span>🚀</span><i>✨</i></div>
      <div ref={burst} hidden className="hint-fireworks absolute">
        <div className="hint-landing-ring" />
        {Array.from({ length: 12 }, (_, i) => <span key={i} style={{ "--ray": `${i * 30}deg` } as React.CSSProperties}>{i % 3 === 0 ? "⭐" : i % 3 === 1 ? "✨" : "🌟"}</span>)}
      </div>
    </div>
  );
}