import torch
import os
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "filler_model", "saved_model")

CANDIDATE_WORDS = {
    "um", "uh", "umm", "uhh", "hmm",
    "like", "so", "okay", "right", "well",
    "actually", "basically", "honestly",
    "you", "know", "i", "mean"
}



tokenizer = DistilBertTokenizer.from_pretrained(MODEL_PATH)
model = DistilBertForSequenceClassification.from_pretrained(MODEL_PATH)

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
model.to(device)
model.eval()

def classify_word(target_word: str, context: str) -> bool:
    text = f"[TARGET] {target_word} [CONTEXT] {context}"
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=64
    ).to(device)
    
    with torch.no_grad():
        outputs = model(**inputs)
        pred = torch.argmax(outputs.logits, dim=1).item()
    
    return pred == 1  # 1 = filler

def merge_adjacent_fillers(fillers: list[dict], gap_threshold=0.3) -> list[dict]:
    """
    Merges fillers that are right next to each other into one.
    e.g. 'you' + 'know' → single filler span
    """
    if not fillers:
        return []
    
    merged = [fillers[0].copy()]
    
    for current in fillers[1:]:
        last = merged[-1]
        gap = current["start"] - last["end"]
        
        if gap <= gap_threshold:
            # merge into previous
            last["word"] = last["word"] + " " + current["word"]
            last["end"] = current["end"]
        else:
            merged.append(current.copy())
    
    return merged

def detect_fillers(words: list[dict]) -> list[dict]:
    fillers = []
    word_list = [w["word"] for w in words]
    
    for i, word in enumerate(words):
        w = word["word"].strip().lower().rstrip(".,!?...")
        
        if w not in CANDIDATE_WORDS:
            continue
        
        start = max(0, i - 3)
        end = min(len(word_list), i + 4)
        context = " ".join(word_list[start:end])
        
        if classify_word(w, context):
            fillers.append(word)
            print(f"Filler: '{word['word']}' at {word['start']}s → {word['end']}s")
    
    return merge_adjacent_fillers(fillers)