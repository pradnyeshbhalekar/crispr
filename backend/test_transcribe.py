from app.processor.transcribe import transcribe
from app.processor.filler import detect_fillers
from app.processor.splicer import splice_audio
from app.processor.denoiser import denoise

words = transcribe("test.mp3")
fillers = detect_fillers(words)

print(f"\n--- {len(fillers)} fillers found ---")
for f in fillers:
    print(f"{f['start']}s → {f['end']}s : '{f['word']}'")

# splice
output = splice_audio("test.mp3", fillers, "outputs/clean.mp3")
print(f"\nClean audio saved to: {output}")