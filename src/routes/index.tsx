import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Music, RotateCcw, Settings as SettingsIcon, Volume2, VolumeX } from "lucide-react";
import { ACTIVITIES } from "@/game/activities";
import { shuffle } from "@/game/shuffle";
import { Celebration, Stage } from "@/game/ui";
import {
  loadSettings,
  setMusic,
  setSound,
  setVolume,
  settings,
  sounds,
  speak,
  subscribeSettings,
  unlockAudio,
} from "@/game/audio";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

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
  const [audioSettings, setAudioSettings] = useState({ ...settings });

  useEffect(() => {
    loadSettings();
    setAudioSettings({ ...settings });
    return subscribeSettings(() => setAudioSettings({ ...settings }));
  }, []);

  const activity = ACTIVITIES[order[step % order.length]!]!;

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

  const restart = useCallback(() => {
    setCelebrating(false);
    setOrder(ACTIVITIES.map((_, i) => i));
    setStep(0);
    setRound((r) => r + 1);
  }, []);

  const audioControls = started ? (
    <div className="fixed right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex gap-2">
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="h-12 w-12 rounded-full bg-card/80 shadow-soft"
        onClick={() => setSound(!audioSettings.sound)}
        aria-label={audioSettings.sound ? "Desligar som" : "Ligar som"}
        title={audioSettings.sound ? "Desligar som" : "Ligar som"}
      >
        {audioSettings.sound ? <Volume2 className="size-6" /> : <VolumeX className="size-6" />}
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full bg-card/30 opacity-55"
            aria-label="Configurações dos responsáveis"
            title="Configurações dos responsáveis"
          >
            <SettingsIcon className="size-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-xl border-card/60 bg-card p-6" overlayClassName="bg-foreground/45">
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
            <DialogDescription>Controles para os responsáveis</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-2">
            <label className="flex min-h-12 items-center justify-between gap-4 text-lg font-bold">
              <span className="flex items-center gap-3"><Volume2 /> Som</span>
              <Switch checked={audioSettings.sound} onCheckedChange={setSound} aria-label="Som" />
            </label>
            <label className="flex min-h-12 items-center justify-between gap-4 text-lg font-bold">
              <span className="flex items-center gap-3"><Music /> Música</span>
              <Switch
                checked={audioSettings.music}
                onCheckedChange={setMusic}
                disabled={!audioSettings.sound}
                aria-label="Música"
              />
            </label>
            <div className="grid gap-3">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Volume</span>
                <span>{Math.round(audioSettings.volume * 100)}%</span>
              </div>
              <Slider
                value={[audioSettings.volume * 100]}
                min={0}
                max={100}
                step={5}
                disabled={!audioSettings.sound}
                onValueChange={(value) => setVolume((value[0] ?? 0) / 100)}
                className="h-10"
                aria-label="Volume"
              />
            </div>
            <Button type="button" variant="secondary" className="h-12 text-base" onClick={restart}>
              <RotateCcw className="size-5" /> Reiniciar brincadeiras
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  ) : null;

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
          className="flex h-40 w-40 items-center justify-center rounded-full text-[5rem] text-primary-foreground shadow-soft transition-transform active:scale-95"
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
      {audioControls}
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
