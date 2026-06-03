from pydub import AudioSegment
from pydub.silence import detect_leading_silence
import os


def trim_leading_silence(segment: AudioSegment, max_trim_ms: int = 300, silence_thresh: int = -45) -> AudioSegment:
    """Trim up to max_trim_ms of leading silence from a segment."""
    trim_ms = detect_leading_silence(segment, silence_threshold=silence_thresh)
    trim_ms = min(trim_ms, max_trim_ms)
    return segment[trim_ms:] if trim_ms > 0 else segment


def splice_audio(audio_path: str, fillers: list[dict], output_path: str, crossfade_ms: int = 60) -> str:
    """
    Cuts filler words out of audio and stitches remaining parts together.
    Filler end times already include trailing silence (set in filler.py).
    Applies fade edges to prevent clicks and crossfades joins.
    """
    audio = AudioSegment.from_file(audio_path)

    if not fillers:
        print("No fillers to remove, returning original audio")
        audio.export(output_path, format="mp3")
        return output_path

    fillers = sorted(fillers, key=lambda x: x["start"])

    FADE_MS = 15  # short fade at each cut edge to kill clicks

    keep_segments = []
    cursor = 0

    for filler in fillers:
        filler_start_ms = int(filler["start"] * 1000)
        filler_end_ms = int(filler["end"] * 1000)

        # Small pad on the start side only — filler end already includes silence
        filler_start_ms = max(cursor, filler_start_ms - 15)
        filler_end_ms = min(len(audio), filler_end_ms)

        if cursor < filler_start_ms:
            segment = audio[cursor:filler_start_ms]
            if len(segment) > FADE_MS:
                segment = segment.fade_out(FADE_MS)
            keep_segments.append(segment)

        cursor = filler_end_ms
        print(f"Cutting: '{filler['word']}' ({filler['start']}s → {filler['end']}s)")

    if cursor < len(audio):
        segment = audio[cursor:]
        # Trim any residual silence left at the head after the last cut
        segment = trim_leading_silence(segment, max_trim_ms=200)
        if len(segment) > FADE_MS:
            segment = segment.fade_in(FADE_MS)
        keep_segments.append(segment)

    if not keep_segments:
        print("Nothing left after splicing")
        return output_path

    result = keep_segments[0]
    for segment in keep_segments[1:]:
        # Trim residual silence from head of each joining segment
        segment = trim_leading_silence(segment, max_trim_ms=200)
        if len(segment) > FADE_MS:
            segment = segment.fade_in(FADE_MS)
        if len(result) > crossfade_ms and len(segment) > crossfade_ms:
            result = result.append(segment, crossfade=crossfade_ms)
        else:
            result = result + segment

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    result.export(output_path, format="mp3")
    print(f"Saved clean audio to: {output_path}")
    return output_path
