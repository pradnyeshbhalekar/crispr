# Crispr

**Audio post-processing tool that automatically removes filler words from voice recordings.**

---

## What It Does

Crispr takes a raw voice recording and returns a clean version with filler words (um, uh, like, you know, etc.) removed — without manual editing.

---

## How It Works

The pipeline runs in five stages:

1. **Transcription** — `stable-ts` (Whisper) transcribes the audio and produces word-level timestamps
2. **Classification** — A fine-tuned `DistilBERT` model classifies each word/phrase as filler or non-filler using surrounding context
3. **Segmentation** — Filler segments are identified using the timestamps from step 1
4. **Audio Editing** — `pydub` cuts the filler segments from the audio
5. **Noise Reduction** — `DeepFilterNet` cleans the resulting audio to smooth out any artefacts

**Frontend:** React  
**Backend:** Flask (REST API)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Transcription | stable-ts (Whisper) |
| Classification | DistilBERT (fine-tuned) |
| Audio processing | pydub |
| Noise reduction | DeepFilterNet |
| Backend | Flask |
| Frontend | React |

---

## Project Structure

```
crispr/
├── backend/
│   ├── app.py                  # Flask app entry point
│   ├── pipeline/
│   │   ├── transcribe.py       # stable-ts transcription
│   │   ├── classify.py         # DistilBERT filler detection
│   │   ├── segment.py          # Timestamp-based segmentation
│   │   ├── edit.py             # pydub audio cutting
│   │   └── denoise.py          # DeepFilterNet post-processing
│   └── model/
│       └── distilbert_filler/  # Fine-tuned model weights
├── frontend/
│   ├── src/
│   │   └── App.jsx
│   └── public/
├── requirements.txt
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- FFmpeg installed and on PATH

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Usage

1. Open the app in your browser
2. Upload a `.wav` or `.mp3` voice recording
3. Wait for the pipeline to process
4. Download the cleaned audio

---

## Model

The filler word classifier is a DistilBERT model fine-tuned on labeled transcription data. It uses a context window around each word (not just the word alone) to reduce false positives — e.g., "like" in "I like this" vs "like, I don't know".

To retrain the model:

```bash
cd backend/model
python train.py
```

---

## Limitations

- Works best on single-speaker recordings
- Processing time scales with audio length
- May occasionally remove non-filler words in fast, overlapping speech
- Currently supports English only

---

## Why I Built This

Editing filler words is one of the most tedious parts of audio post-production. Crispr automates the entire thing — transcription to clean audio — with no manual intervention.

---

## License

MIT
