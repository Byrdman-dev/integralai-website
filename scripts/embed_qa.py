"""
Precompute embeddings for a Q&A dataset (RAG demo, receptionist demo, etc.).

Reads a question/answer/topic JSON file and writes an embedded version the
frontend loads statically at runtime (no server, no live embedding calls).

Usage:
    python scripts/embed_qa.py
    python scripts/embed_qa.py --input data/receptionist-qa.json --output js/data/receptionist-embeddings.json

Defaults to the RAG demo's dataset paths if --input/--output are omitted.

Requires a Python env with sentence-transformers installed. On Windows
with Miniconda:

    conda create -n rag-embed python=3.11 -y
    conda activate rag-embed
    pip install sentence-transformers

Re-run this script any time a dataset JSON changes, then commit the
regenerated embeddings JSON.
"""

import argparse
import json
from pathlib import Path

from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"
REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT_PATH = REPO_ROOT / "data" / "rag-qa.json"
DEFAULT_OUTPUT_PATH = REPO_ROOT / "js" / "data" / "rag-embeddings.json"


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT_PATH,
                         help="Path to the source question/answer/topic JSON file")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH,
                         help="Path to write the embedded JSON file to")
    return parser.parse_args()


def main():
    args = parse_args()
    input_path = args.input
    output_path = args.output

    with open(input_path, encoding="utf-8") as f:
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

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {len(output)} embedded Q&A pairs to {output_path}")


if __name__ == "__main__":
    main()
