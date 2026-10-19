"""Strike Legends - the commentary of the browser game recorded with Chatterbox (Resemble AI).

Reads web/assets/voice/lines.json (the Italian texts and the team names), speaks every text with
Chatterbox Multilingual (language "it") on the CPU, and writes one .mp3 per text into
web/assets/voice/, then the file names back into lines.json under "audio". The game plays the
clips when they are there and falls back to the browser's voice when they are not
(web/js/voice.js).

Setup (the container starts empty):
    python3 -m venv /opt/chatterbox && /opt/chatterbox/bin/pip install chatterbox-tts
The weights (about 3 GB) come from huggingface.co/ResembleAI/chatterbox, whose files are served by
us.aws.cdn.hf.co: that domain has to be allowed in the environment's network settings.

Run: /opt/chatterbox/bin/python tools/make_commentary.py [--only goal,save]
Env: EXAGGERATION (0,5; 0,85 on goals), CFG (0,5; 0,3 on goals), SEED (7)
"""
import json, os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = os.path.join(ROOT, "web", "assets", "voice")
LINES = os.path.join(VOICE, "lines.json")


def main():
    import torch
    import torchaudio as ta
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    doc = json.load(open(LINES, encoding="utf-8"))
    audio = doc.get("audio") or {"texts": {}, "teams": {}}
    torch.manual_seed(int(os.environ.get("SEED", "7")))
    model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    tmp = tempfile.mkdtemp(prefix="voice_")

    def speak(text, name, excited):
        wav = model.generate(text, language_id="it",
                             exaggeration=float(os.environ.get("EXAGGERATION", "0.85" if excited else "0.5")),
                             cfg_weight=float(os.environ.get("CFG", "0.3" if excited else "0.5")))
        raw = os.path.join(tmp, name + ".wav")
        ta.save(raw, wav, model.sr)
        out = os.path.join(VOICE, name + ".mp3")
        # mono, loudness-normalised, 64 kbit/s: a phrase weighs 15-40 kB
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", "loudnorm=I=-16:TP=-1.5", "-ac", "1", "-b:a", "64k", out], check=True)
        print("[[ %s %.2f s: %s ]]" % (name, wav.shape[-1] / model.sr, text), flush=True)
        return name + ".mp3"

    for kind, texts in doc["texts"].items():
        if only and kind not in only:
            continue
        excited = kind.startswith("goal") or kind in ("equalizer", "lead", "golden", "special")
        audio["texts"][kind] = [speak(t, "%s_%d" % (kind, i), excited) for i, t in enumerate(texts)]
    if not only or "teams" in only:
        for tid, name in doc["teams"].items():
            audio["teams"][tid] = speak(name + "!", "team_" + tid, True)
    audio["model"] = "Chatterbox Multilingual (ResembleAI/chatterbox), language it"
    doc["audio"] = audio
    json.dump(doc, open(LINES, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("[[ commentary: %d texts, %d names -> %s ]]" % (sum(len(v) for v in audio["texts"].values()), len(audio["teams"]), os.path.relpath(VOICE, ROOT)))


main()
