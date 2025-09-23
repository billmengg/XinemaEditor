import pandas as pd
from sentence_transformers import util
import re

def load_clips_csv(filepath):
    df = pd.read_csv(filepath)
    df.columns = [c.lower() for c in df.columns]
    clips = df.to_dict(orient="records")
    return clips

def load_script(filepath):
    with open(filepath, "r") as f:
        text = f.read().strip()
    sentences = re.split(r'(?<=[.?!])\s+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    return sentences

def embed_texts(texts, model):
    return model.encode(texts, convert_to_tensor=True)

def match_script_to_clips(script_lines, clips, clip_embeddings, model):
    results = []
    clip_texts = [c["description"] for c in clips]
    
    for line in script_lines:
        line_emb = model.encode(line, convert_to_tensor=True)
        sims = util.cos_sim(line_emb, clip_embeddings)[0]
        best_idx = sims.argmax().item()
        results.append({
            "Sentence": line,
            "start_time": "NA",
            "end_time": "NA",
            "matched_script_id": clips[best_idx]["id"]
        })
    return results
