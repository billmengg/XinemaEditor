# Xinema MVP

## Overview

Xinema is a tool designed to automatically match a video essay script with relevant video clips.

**MVP (v0.1) Features:**
- **Input:** Script sentences + Arcane clip descriptions
- **Output:** Best matching clip for each script sentence
- **Approach:** Pretrained sentence embeddings + cosine similarity

This MVP is simple, modular, and extendable for future optimizations.

---

## Folder Structure

```
xinema_mvp/
├── data/
│   ├── script.txt            # Script for the video essay (one sentence per line)
│   └── clips.json            # Clip descriptions (id, character, episode, description)
├── output/
│   └── matches.json          # Results of script → clip matching
├── xinema_mvp.py             # Main script
└── utils.py                  # Helper functions (data loading, embedding, matching)
```

---

## Getting Started

### 1. Install Dependencies

```bash
pip install sentence-transformers
```

### 2. Prepare Data

- `data/script.txt`: Each line is a single script sentence.
- `data/clips.json`: JSON array of clip objects. Example format:

```json
[
  {
    "id": "s01e03_17",
    "character": "Vi",
    "episode": 3,
    "desc": "Vi and Jinx fight on the bridge."
  },
  {
    "id": "s01e02_05",
    "character": "Jayce",
    "episode": 2,
    "desc": "Jayce gives a speech to the council."
  }
]
```

### 3. Run the MVP

```bash
python xinema_mvp.py
```

- Output will be saved in `output/matches.json`.
- Each script line maps to the best matching clip.

---

## Workflow (Current MVP)

1. Load data (script + clip descriptions)
2. Load pretrained embedding model (`all-MiniLM-L6-v2`)
3. Embed clip descriptions once
4. Embed script sentences one by one and calculate cosine similarity with clip embeddings
5. Select best match for each script sentence
6. Save results to JSON for later video assembly

---

## Future Plans (Scaling & Optimization)

### Constraints & Rules
- No clip reuse
- Clip duration trimming to fit script line
- Episode/character order for narrative consistency

### Contextual Matching
- Match sequences of script lines → sequences of clips
- Consider surrounding lines for richer context

### Global Optimization
- Implement GRASP-style metaheuristic:
  - Multiple candidate solutions with randomized greedy construction
  - Local search (swap/reassign clips) to improve overall mapping
  - Scoring function accounts for similarity, reuse, timing, order

### AI Enhancements
- Use LLM reranking for ambiguous matches
- Enrich clip descriptions using vision models (BLIP, GPT-4V)
- Integrate dialogue transcripts for more precise matching

### Production-Ready
- Move embeddings into a vector database (FAISS, Pinecone) for fast search
- Modular pipeline ready for large-scale scripts & clips
- Connect to video editing tools (MoviePy / FFmpeg) for automated assembly

---

## Notes

- MVP uses pretrained embeddings, no training required
- Designed to be modular so future constraints and optimization algorithms can be added without rewriting the core matching logic
- Initial MVP focuses on simplicity to validate the concept before adding more complex features