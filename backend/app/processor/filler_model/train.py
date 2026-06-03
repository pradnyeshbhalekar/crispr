import json
import os
import torch
from transformers import (
    DistilBertTokenizer,
    DistilBertForSequenceClassification,
    Trainer,
    TrainingArguments
)
from torch.utils.data import Dataset

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(SCRIPT_DIR, "train_data.json")) as f:
    data = json.load(f)

tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")

class FillerDataset(Dataset):
    def __init__(self, data):
        self.data = data
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        encoding = tokenizer(
            item["text"],
            truncation=True,
            padding="max_length",
            max_length=64,
            return_tensors="pt"
        )
        return {
            "input_ids": encoding["input_ids"].squeeze(),
            "attention_mask": encoding["attention_mask"].squeeze(),
            "labels": torch.tensor(item["label"], dtype=torch.long)
        }

dataset = FillerDataset(data)

model = DistilBertForSequenceClassification.from_pretrained(
    "distilbert-base-uncased",
    num_labels=2
)

# use M2 GPU
device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
print(f"Training on: {device}")
model.to(device)

training_args = TrainingArguments(
    output_dir=os.path.join(SCRIPT_DIR, "checkpoints"),
    num_train_epochs=10,
    per_device_train_batch_size=8,
    save_steps=50,
    logging_steps=10,
    learning_rate=2e-5,
     weight_decay=0.01, 
     warmup_steps=10,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
)

trainer.train()

# save final model
model.save_pretrained(os.path.join(SCRIPT_DIR, "saved_model"))
tokenizer.save_pretrained(os.path.join(SCRIPT_DIR, "saved_model"))
print("Model saved.")