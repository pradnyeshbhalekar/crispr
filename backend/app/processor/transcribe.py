import stable_whisper

model = stable_whisper.load_model("medium")

def transcribe(audio_path: str) -> list[dict]:
    result = model.transcribe(audio_path,word_timestamps=True)

    words = []
    for segment in result.segments:
        for word in segment.words:
            words.append({
                "word": word.word.strip().lower(),
                "start": round(word.start, 3),
                "end": round(word.end, 3)
            })

    return words