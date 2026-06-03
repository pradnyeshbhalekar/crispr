from app.processor.transcribe import transcribe
from app.processor.filler import detect_fillers

words = transcribe("test.mp3")
fillers = detect_fillers(words)

print(f"\n--- {len(fillers)} fillers found ---")
for f in fillers:
    print(f"{f['start']}s → {f['end']}s : '{f['word']}'")