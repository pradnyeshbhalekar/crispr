from pydub import AudioSegment
import os

def splice_audio(audio_path: str, fillers: list[dict], output_path: str, crossfade_ms: int = 30) -> str:
    """
    Cuts filler words out of audio and stitches remaining parts together.
    crossfade_ms: milliseconds of crossfade between cuts to avoid jarring jumps
    """
    audio = AudioSegment.from_file(audio_path)
    
    if not fillers:
        print("No fillers to remove, returning original audio")
        audio.export(output_path, format="mp3")
        return output_path
    

    fillers = sorted(fillers, key=lambda x: x["start"])
    

    keep_segments = []
    cursor = 0 
    
    for filler in fillers:
        filler_start_ms = int(filler["start"] * 1000)
        filler_end_ms = int(filler["end"] * 1000)
        

        filler_start_ms = max(0, filler_start_ms - 20)
        filler_end_ms = min(len(audio), filler_end_ms + 20)
        
        if cursor < filler_start_ms:
            keep_segments.append(audio[cursor:filler_start_ms])
        
        cursor = filler_end_ms
        print(f"Cutting: '{filler['word']}' ({filler['start']}s → {filler['end']}s)")
    

    if cursor < len(audio):
        keep_segments.append(audio[cursor:])
    
    if not keep_segments:
        print("Nothing left after splicing")
        return output_path
    
    result = keep_segments[0]
    for segment in keep_segments[1:]:
        if len(result) > crossfade_ms and len(segment) > crossfade_ms:
            result = result.append(segment, crossfade=crossfade_ms)
        else:
            result = result + segment
    
    # export
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    result.export(output_path, format="mp3")
    print(f"Saved clean audio to: {output_path}")
    
    return output_path