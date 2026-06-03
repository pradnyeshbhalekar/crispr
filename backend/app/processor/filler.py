import torch
import torch.nn.functional as F
import os
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "filler_model", "saved_model")

CANDIDATE_WORDS = {
    "um", "uh", "umm", "uhh", "hmm",
    "like", "so", "okay", "right", "well",
    "actually", "basically", "honestly",
}

STRONG_FILLERS = {"um", "uh", "umm", "uhh", "hmm"}

FILLER_PHRASES = [
    ["you", "know"],
    ["i", "mean"],
    ["you", "know", "what", "i", "mean"],
    ["i", "know", "right"],
    ["so", "yeah"],
    ["and", "so"],
]

SKIP_SOLO = {"you", "know", "i", "mean"}

STRONG_THRESHOLD = 0.55
DEFAULT_THRESHOLD = 0.72

MAX_TRAILING_SILENCE_MS = 600

# Max gap between false-start and correction (seconds)
MAX_FALSE_START_GAP = 0.5
# Minimum shared prefix length to count as a false start
MIN_PREFIX_MATCH = 3

tokenizer = DistilBertTokenizer.from_pretrained(MODEL_PATH)
model = DistilBertForSequenceClassification.from_pretrained(MODEL_PATH)

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
model.to(device)
model.eval()


def _levenshtein(a: str, b: str) -> int:
    if len(a) < len(b):
        return _levenshtein(b, a)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for ca in a:
        curr = [prev[0] + 1]
        for j, cb in enumerate(b):
            curr.append(min(prev[j + 1] + 1, curr[-1] + 1, prev[j] + (ca != cb)))
        prev = curr
    return prev[-1]


def _shared_prefix_len(a: str, b: str) -> int:
    count = 0
    for ca, cb in zip(a, b):
        if ca == cb:
            count += 1
        else:
            break
    return count


def is_false_start(word_a: str, word_b: str) -> bool:
    """
    True when word_a looks like a botched attempt at word_b:
      - exact repetition ("the the")
      - word_a is a prefix fragment of word_b ("secc sections")
      - word_a is short and edit-distance-similar to word_b
    """
    a, b = word_a.lower().rstrip(".,!?"), word_b.lower().rstrip(".,!?")

    if not a or not b:
        return False

    # Exact repetition
    if a == b:
        return True

    # word_a is the shorter, mangled attempt; word_b is the correction
    shorter, longer = (a, b) if len(a) <= len(b) else (b, a)
    if shorter == longer:
        return True

    prefix = _shared_prefix_len(shorter, longer)

    # Strong prefix match: at least MIN_PREFIX_MATCH chars align from the start
    if prefix >= MIN_PREFIX_MATCH:
        return True

    # Covers very short mangled words (2-char typos): high similarity ratio
    if len(shorter) >= 2:
        dist = _levenshtein(shorter, longer)
        similarity = 1 - dist / max(len(shorter), len(longer))
        if similarity >= 0.75:
            return True

    return False


def detect_false_starts(words: list[dict]) -> list[dict]:
    """
    Scan consecutive word pairs. When word[i] looks like a botched attempt at
    word[i+1] (close in time + similar stem), mark word[i] for removal.
    Also handles runs: "secc secc sections" removes both false starts.
    """
    remove_indices = set()
    n = len(words)
    i = 0

    while i < n - 1:
        a = words[i]["word"].strip().lower().rstrip(".,!?")
        b = words[i + 1]["word"].strip().lower().rstrip(".,!?")
        gap = words[i + 1]["start"] - words[i]["end"]

        if gap <= MAX_FALSE_START_GAP and is_false_start(a, b):
            remove_indices.add(i)
            print(f"Disfluency: '{words[i]['word']}' → corrected as '{words[i+1]['word']}' "
                  f"at {words[i]['start']}s")
            # Don't skip i+1; it may itself be a false start for i+2
        i += 1

    disfluencies = []
    for idx in sorted(remove_indices):
        word = words[idx].copy()
        # Extend end to the start of the correction so no gap is left
        next_start = words[idx + 1]["start"]
        word["end"] = next_start
        disfluencies.append(word)

    return disfluencies


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
        probs = F.softmax(outputs.logits, dim=1)
        filler_prob = probs[0][1].item()

    threshold = STRONG_THRESHOLD if target_word in STRONG_FILLERS else DEFAULT_THRESHOLD
    return filler_prob >= threshold


def is_sentence_initial(i: int, words: list[dict], pause_threshold: float = 0.5) -> bool:
    if i == 0:
        return True
    return (words[i]["start"] - words[i - 1]["end"]) >= pause_threshold


def detect_phrase_fillers(words: list[dict]) -> set[int]:
    word_texts = [w["word"].strip().lower().rstrip(".,!?") for w in words]
    phrase_indices = set()
    for phrase in FILLER_PHRASES:
        plen = len(phrase)
        for i in range(len(word_texts) - plen + 1):
            if word_texts[i:i + plen] == phrase:
                for j in range(plen):
                    phrase_indices.add(i + j)
    return phrase_indices


def absorb_trailing_silence(filler: dict, words: list[dict], filler_idx: int) -> dict:
    next_idx = filler_idx + 1
    if next_idx >= len(words):
        return filler
    next_start = words[next_idx]["start"]
    gap_ms = (next_start - filler["end"]) * 1000
    if 0 < gap_ms <= MAX_TRAILING_SILENCE_MS:
        filler = filler.copy()
        filler["end"] = next_start
    return filler


def merge_adjacent(cuts: list[dict], gap_threshold: float = 0.15) -> list[dict]:
    if not cuts:
        return []
    merged = [cuts[0].copy()]
    for current in cuts[1:]:
        last = merged[-1]
        if current["start"] - last["end"] <= gap_threshold:
            last["word"] = last["word"] + " " + current["word"]
            last["end"] = current["end"]
        else:
            merged.append(current.copy())
    return merged


def detect_fillers(words: list[dict]) -> list[dict]:
    cuts = []
    phrase_filler_indices = detect_phrase_fillers(words)
    added_indices = set()
    word_list = [w["word"] for w in words]

    # --- False starts / disfluencies ---
    for d in detect_false_starts(words):
        cuts.append(d)
        # Mark the index so filler detection skips it
        for i, w in enumerate(words):
            if w["start"] == d["start"]:
                added_indices.add(i)
                break

    # --- Filler words ---
    POSITIONAL_FILLERS = {"so", "okay", "well", "right", "and", "but"}

    for i, word in enumerate(words):
        if i in added_indices:
            continue

        w = word["word"].strip().lower().rstrip(".,!?")

        if i in phrase_filler_indices:
            filler = absorb_trailing_silence(word, words, i)
            cuts.append(filler)
            added_indices.add(i)
            print(f"Filler (phrase): '{word['word']}' at {word['start']}s → {filler['end']}s")
            continue

        if w in SKIP_SOLO:
            continue

        if w not in CANDIDATE_WORDS:
            continue

        if w in POSITIONAL_FILLERS and is_sentence_initial(i, words):
            filler = absorb_trailing_silence(word, words, i)
            cuts.append(filler)
            added_indices.add(i)
            print(f"Filler (positional): '{word['word']}' at {word['start']}s → {filler['end']}s")
            continue

        context = " ".join(word_list[max(0, i - 4):min(len(word_list), i + 5)])
        if classify_word(w, context):
            filler = absorb_trailing_silence(word, words, i)
            cuts.append(filler)
            added_indices.add(i)
            print(f"Filler (model): '{word['word']}' at {word['start']}s → {filler['end']}s")

    cuts.sort(key=lambda x: x["start"])
    return merge_adjacent(cuts)
