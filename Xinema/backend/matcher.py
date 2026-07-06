"""
matcher.py — Xinema semantic clip matching

Primary:  sentence-transformers cosine similarity (local model, no API)
Fallback: TF-IDF cosine similarity (pure Python, no extra deps)

Install for best results:
    pip install sentence-transformers
"""

import json
import sys
import re
import math
from collections import Counter

def tokenize(text):
    """Tokenize without removing stopwords — all words carry meaning."""
    if not text:
        return []
    return re.findall(r'[a-z]+', text.lower())


# ---------------------------------------------------------------------------
# TF-IDF cosine similarity (fallback — pure Python, no extra dependencies)
# ---------------------------------------------------------------------------

def _tfidf_cosine(query_tokens, corpus_token_lists):
    N = len(corpus_token_lists)
    if N == 0:
        return []

    # Smoothed IDF across corpus
    df = Counter()
    for doc in corpus_token_lists:
        for term in set(doc):
            df[term] += 1

    def idf(term):
        return math.log((N + 1) / (df.get(term, 0) + 1)) + 1

    def vec(tokens):
        if not tokens:
            return {}
        tf = Counter(tokens)
        total = len(tokens)
        return {t: (tf[t] / total) * idf(t) for t in tokens}

    q_vec = vec(query_tokens)
    if not q_vec:
        return [0.0] * N

    q_mag = math.sqrt(sum(v * v for v in q_vec.values()))

    scores = []
    for doc_tokens in corpus_token_lists:
        d_vec = vec(doc_tokens)
        if not d_vec:
            scores.append(0.0)
            continue
        dot = sum(q_vec[t] * d_vec[t] for t in q_vec if t in d_vec)
        d_mag = math.sqrt(sum(v * v for v in d_vec.values()))
        scores.append(dot / (q_mag * d_mag) if q_mag * d_mag > 0 else 0.0)

    return scores


def _match_tfidf(sentences, clips):
    clip_token_lists = [
        tokenize(
            (c.get('description', '') or '') + ' ' +
            (c.get('character', '') or '') + ' ' +
            (c.get('filename', '') or '') + ' ' +
            (c.get('tags', '') or '')
        )
        for c in clips
    ]
    matches = []
    for i, sentence in enumerate(sentences):
        sent_tokens = tokenize(sentence)
        scores = _tfidf_cosine(sent_tokens, clip_token_lists)
        best_idx = max(range(len(scores)), key=lambda j: scores[j]) if scores else 0
        best_clip = clips[best_idx]
        matches.append({
            'sentenceIndex': i,
            'sentence': sentence,
            'character': best_clip.get('character'),
            'filename': best_clip.get('filename'),
            'score': round(scores[best_idx] if scores else 0.0, 4),
        })
    return matches


# ---------------------------------------------------------------------------
# Sentence-transformer cosine similarity (primary — semantic embeddings)
# ---------------------------------------------------------------------------

def _match_semantic(sentences, clips):
    from sentence_transformers import SentenceTransformer
    import numpy as np

    model = SentenceTransformer('all-MiniLM-L6-v2')

    clip_texts = [
        (c.get('description', '') or '') + ' ' +
        (c.get('character', '') or '') + ' ' +
        (c.get('filename', '') or '') + ' ' +
        (c.get('tags', '') or '')
        for c in clips
    ]

    all_texts = list(sentences) + clip_texts
    embeddings = model.encode(all_texts, convert_to_numpy=True, show_progress_bar=False)

    sent_embs = embeddings[:len(sentences)]
    clip_embs = embeddings[len(sentences):]

    # Normalise for fast cosine via dot product
    sent_norms = np.linalg.norm(sent_embs, axis=1, keepdims=True)
    clip_norms = np.linalg.norm(clip_embs, axis=1, keepdims=True)
    sent_embs_n = sent_embs / np.where(sent_norms == 0, 1, sent_norms)
    clip_embs_n = clip_embs / np.where(clip_norms == 0, 1, clip_norms)

    sim_matrix = sent_embs_n @ clip_embs_n.T  # shape: (n_sentences, n_clips)

    matches = []
    for i, sentence in enumerate(sentences):
        best_idx = int(np.argmax(sim_matrix[i]))
        best_score = float(sim_matrix[i, best_idx])
        best_clip = clips[best_idx]
        matches.append({
            'sentenceIndex': i,
            'sentence': sentence,
            'character': best_clip.get('character'),
            'filename': best_clip.get('filename'),
            'score': round(best_score, 4),
        })
    return matches


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    raw = sys.stdin.read()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON input: {e}'}), file=sys.stderr)
        sys.exit(1)

    sentences = data.get('sentences', [])
    clips = data.get('clips', [])

    if not sentences or not clips:
        print(json.dumps({'matches': []}))
        return

    try:
        matches = _match_semantic(sentences, clips)
    except ImportError:
        # sentence-transformers not installed — use TF-IDF cosine similarity
        matches = _match_tfidf(sentences, clips)

    print(json.dumps({'matches': matches}))


if __name__ == '__main__':
    main()
