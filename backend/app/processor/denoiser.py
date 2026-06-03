import os
import torchaudio
import torch
from df.enhance import enhance, init_df, load_audio, save_audio

def denoise(audio_path: str, output_path: str) -> str:
    model, df_state, _ = init_df()
    

    audio, sample_rate = load_audio(audio_path, sr=df_state.sr())
    

    enhanced = enhance(model, df_state, audio)
    

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    save_audio(output_path, enhanced, df_state.sr())
    
    print(f"Denoised audio saved to: {output_path}")
    return output_path