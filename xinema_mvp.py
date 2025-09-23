from sentence_transformers import SentenceTransformer
from utils import load_clips_csv, load_script, embed_texts, match_script_to_clips
import pandas as pd

def main():
    # 1. Load data
    clips = load_clips_csv("data/clips.csv")
    script_lines = load_script("data/script.txt")
    
    # 2. Load embedding model
    model = SentenceTransformer("all-MiniLM-L6-v2")
    
    # 3. Embed clip descriptions
    clip_texts = [c["description"] for c in clips]
    clip_embeddings = embed_texts(clip_texts, model)
    
    # 4. Match script lines to clips
    results = match_script_to_clips(script_lines, clips, clip_embeddings, model)
    
    # 5. Convert results to DataFrame for CSV
    df = pd.DataFrame(results)
    
    # 6. Save to CSV
    df.to_csv("output/matches.csv", index=False)
    print("✅ Matching complete! Results saved to output/matches.csv")

if __name__ == "__main__":
    main()
