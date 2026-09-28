"""Generate narrator recordings once and store them in public/audio/{pt,en}.

Usage: bun ./scripts/voice-phrases.ts > /tmp/phrases.json && python3 scripts/generate-voice.py /tmp/phrases.json
Existing files are skipped, so any file can be replaced by a real human recording
with the same name and the game will use it automatically.
"""
import json, os, re, subprocess, sys, tempfile, unicodedata, urllib.request
from concurrent.futures import ThreadPoolExecutor

MODEL = "google/gemini-3.1-flash-tts-preview"
VOICE = "Aoede"
URL = "https://ai.gateway.lovable.dev/v1/audio/speech"
VARIANTS = 2  # extra takes for short praise/encouragement lines
MULTI = {"Muito bem!", "Isso mesmo!", "Boa!", "Uau!", "Oba!", "Uhuu!", "Olha!", "Vamos tentar!", "Quase!", "Olha aqui!", "Isso!", "Achou!", "Você conseguiu!", "Que legal!"}

PT_STYLES = [
    "Fale em português do Brasil, com voz feminina carinhosa, alegre e suave, como uma mãe brincando com um bebê",
    "Fale em português do Brasil, com voz feminina doce e animada, sorrindo, para uma criança pequena",
]
EN_STYLE = "Say it in natural native American English, with a warm, cheerful, gentle female voice, to a toddler"


def key(t):
    t = unicodedata.normalize("NFD", t)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", t))


def synth(text, style, out):
    if os.path.exists(out):
        return True
    body = {
        "model": MODEL,
        "contents": [{"role": "user", "parts": [{"text": f"{style}: {text}"}]}],
        "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}},
    }
    req = urllib.request.Request(URL, json.dumps(body).encode(), {"Authorization": "Bearer " + os.environ["LOVABLE_API_KEY"], "Content-Type": "application/json"})
    for _ in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                wav = r.read()
            with tempfile.NamedTemporaryFile(suffix=".wav") as f:
                f.write(wav); f.flush()
                # trim silence, normalize loudness, small mp3
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f.name, "-af",
                                "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-3",
                                "-ar", "24000", "-ac", "1", "-b:a", "48k", out], check=True)
            return True
        except Exception as e:  # noqa
            print("retry", text, e, flush=True)
    return False


def main():
    phrases = json.load(open(sys.argv[1]))
    jobs, manifest = [], {"pt": {}, "en": {}}
    for lang in ("pt", "en"):
        os.makedirs(f"public/audio/{lang}", exist_ok=True)
        for t in phrases[lang]:
            k = key(t)
            if not k or k in manifest[lang]:
                continue
            n = VARIANTS if t in MULTI else 1
            files = []
            for v in range(n):
                name = k if v == 0 else f"{k}-{v + 1}"
                files.append(f"/audio/{lang}/{name}.mp3")
                jobs.append((t, EN_STYLE if lang == "en" else PT_STYLES[v % 2], f"public/audio/{lang}/{name}.mp3"))
            manifest[lang][k] = files
    with ThreadPoolExecutor(4) as ex:
        ok = list(ex.map(lambda j: synth(*j), jobs))
    print("done", sum(ok), "/", len(ok), flush=True)
    m = json.load(open("src/game/voice-manifest.json"))
    for lang in ("pt", "en"):
        m[lang] = {k: [f for f in v if os.path.exists("public" + f)] for k, v in manifest[lang].items()}
        m[lang] = {k: v for k, v in m[lang].items() if v}
    json.dump(m, open("src/game/voice-manifest.json", "w"), ensure_ascii=False, indent=1)


main()
