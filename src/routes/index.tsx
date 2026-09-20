import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { ACTIVITIES } from "@/game/activities";
import { shuffle } from "@/game/shuffle";
import { Celebration, Stage } from "@/game/ui";
import { sounds, speak, unlockAudio } from "@/game/audio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Toca Toca — Joguinho para bebês" },
      {
        name: "description",
        content:
          "Jogo infantil sem fim para crianças de 1 a 3 anos: cores, formas, animais, números e muito mais. Sem derrota, sem tempo, só diversão.",
      },
      { property: "og:title", content: "Toca Toca — Joguinho para bebês" },
      {
        property: "og:description",
        content: "Dez atividades coloridas com sons e animações, em rodadas infinitas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

function Game() {
  const [started, setStarted] = useState(false);
  const [order, setOrder] = useState(() => ACTIVITIES.map((_, i) => i));
  const [step, setStep] = useState(0);
  const [round, setRound] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const activity = ACTIVITIES[order[step % order.length]];

  const handleComplete = useCallback(() => {
    setCelebrating(true);
    sounds.cheer();
    speak("Muito bem!");
    window.setTimeout(() => {
      setCelebrating(false);
      setStep((s) => {
        const next = s + 1;
        if (next >= ACTIVITIES.length) {
          setOrder((o) => shuffle(o));
          setRound((r) => r + 1);
          return 0;
        }
        return next;
      });
    }, 1600);
  }, []);

  const key = useMemo(() => `${round}-${step}-${activity.id}`, [round, step, activity.id]);

  if (!started) {
    return (
      <Stage>
        <div className="animate-bob text-[clamp(5rem,28vw,10rem)]">🧸</div>
        <h1 className="text-center text-4xl font-black text-foreground">Toca Toca</h1>
        <button
          type="button"
          onClick={() => {
            unlockAudio();
            sounds.yay();
            speak("Vamos brincar!");
            setStarted(true);
          }}
          style={{ background: "var(--gradient-play)" }}
          className="animate-bob flex h-40 w-40 items-center justify-center rounded-full text-[5rem] text-primary-foreground shadow-soft transition-transform active:scale-95"
          aria-label="Jogar"
        >
          ▶️
        </button>
        <p className="text-xl font-bold text-foreground/70">Toque para brincar</p>
      </Stage>
    );
  }

  return (
    <Stage>
      <div className="flex w-full max-w-md items-center justify-center gap-2">
        {ACTIVITIES.map((a, i) => (
          <span
            key={a.id}
            className={`h-3 rounded-full transition-all ${
              i <= step ? "w-6 bg-card" : "w-3 bg-card/40"
            }`}
          />
        ))}
      </div>
      <div key={key} className="flex w-full flex-col items-center gap-6">
        {activity.render({ onComplete: handleComplete, round })}
      </div>
      <Celebration show={celebrating} />
    </Stage>
  );
}
