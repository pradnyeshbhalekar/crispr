from app.processor.transcribe import transcribe
from app.processor.filler import detect_fillers
from app.processor.splicer import splice_audio
from app.processor.denoiser import denoise
denoised_path = "outputs/denoised.mp3"
denoise("test.mp3", denoised_path)


words = transcribe(denoised_path)
fillers = detect_fillers(words)

print(f"\n--- {len(fillers)} fillers found ---")
for f in fillers:
    print(f"{f['start']}s → {f['end']}s : '{f['word']}'")


output = splice_audio(denoised_path, fillers, "outputs/clean.mp3")
print(f"\nClean audio: {output}")

