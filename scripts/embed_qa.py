"""
Precompute embeddings for the RAG demo's Q&A dataset.

Reads data/rag-qa.json and writes js/data/rag-embeddings.json, which the
frontend loads statically at runtime (no server, no live embedding calls).

Usage:
    python scripts/embed_qa.py

Requires a Python env with sentence-transformers installed. On Windows
with Miniconda:

    conda create -n rag-embed python=3.11 -y
    conda activate rag-embed
    pip install sentence-transformers

Re-run this script any time data/rag-qa.json changes, then commit the
regenerated js/data/rag-embeddings.json.
"""

import json
from pathlib import Path

from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"
REPO_ROOT = Path(__file__).resolve().parent.parent
INPUT_PATH = REPO_ROOT / "data" / "rag-qa.json"
OUTPUT_PATH = REPO_ROOT / "js" / "data" / "rag-embeddings.json"


def main():
    with open(INPUT_PATH, encoding="utf-8") as f:
        qa_pairs = json.load(f)

    model = SentenceTransformer(MODEL_NAME)
    questions = [pair["question"] for pair in qa_pairs]
    embeddings = model.encode(questions, normalize_embeddings=True)

    output = [
        {
            "question": pair["question"],
            "answer": pair["answer"],
            "topic": pair["topic"],
            "embedding": embedding.tolist(),
        }
        for pair, embedding in zip(qa_pairs, embeddings)
    ]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {len(output)} embedded Q&A pairs to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
