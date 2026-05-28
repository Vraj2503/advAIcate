"""
Retrieval Evaluator — metrics for document retrieval quality.
Computes Recall@K and MRR using semantic cosine similarity.
"""

import numpy as np
from typing import List, Dict, Any
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from embedding_utils import get_embedding_generator


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    vec1_np = np.array(vec1)
    vec2_np = np.array(vec2)
    dot_product = np.dot(vec1_np, vec2_np)
    norm1 = np.linalg.norm(vec1_np)
    norm2 = np.linalg.norm(vec2_np)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(dot_product / (norm1 * norm2))


def compute_recall(
    retrieved_chunks: List[str],
    gold_chunks: List[str],
    threshold: float = 0.8
) -> float:
    """
    Computes Recall@K by determining if gold chunks are covered by retrieved chunks.
    A gold chunk is marked as 'found' if its cosine similarity with any retrieved chunk >= threshold.

    Args:
        retrieved_chunks: List of retrieved document chunks
        gold_chunks: List of gold standard (ground truth) chunks
        threshold: Minimum cosine similarity to consider a match (default 0.8)

    Returns:
        Recall@K score (0.0 to 1.0)
    """
    if not gold_chunks:
        return 1.0
    if not retrieved_chunks:
        return 0.0

    embedder = get_embedding_generator()

    retrieved_embeddings = embedder.generate_embeddings(retrieved_chunks)
    gold_embeddings = embedder.generate_embeddings(gold_chunks)

    found_count = 0
    for gold_emb in gold_embeddings:
        max_similarity = 0.0
        for ret_emb in retrieved_embeddings:
            sim = cosine_similarity(gold_emb, ret_emb)
            if sim > max_similarity:
                max_similarity = sim
        if max_similarity >= threshold:
            found_count += 1

    return found_count / len(gold_chunks)


def compute_mrr(
    retrieved_chunks: List[str],
    gold_chunks: List[str],
    threshold: float = 0.8
) -> float:
    """
    Computes the Reciprocal Rank of the highest-matching retrieved chunk.
    MRR = 1 / rank_i where rank_i is the 1-indexed position of the first relevant chunk.
    If no matching chunk is found in the retrieved results, returns 0.

    Args:
        retrieved_chunks: List of retrieved document chunks
        gold_chunks: List of gold standard (ground truth) chunks
        threshold: Minimum cosine similarity to consider a match (default 0.8)

    Returns:
        MRR score (0.0 to 1.0)
    """
    if not retrieved_chunks or not gold_chunks:
        return 0.0

    embedder = get_embedding_generator()

    gold_embeddings = embedder.generate_embeddings(gold_chunks)

    for idx, ret_chunk in enumerate(retrieved_chunks):
        ret_emb = embedder.generate_embedding(ret_chunk)
        for gold_emb in gold_embeddings:
            sim = cosine_similarity(ret_emb, gold_emb)
            if sim >= threshold:
                return 1.0 / (idx + 1)

    return 0.0


def compute_recall_at_k(
    retrieved_chunks: List[str],
    gold_chunks: List[str],
    k: int,
    threshold: float = 0.8
) -> float:
    """
    Compute Recall@K for a specific K value.

    Args:
        retrieved_chunks: List of retrieved document chunks
        gold_chunks: List of gold standard chunks
        k: Number of top retrieved chunks to consider
        threshold: Minimum cosine similarity for match

    Returns:
        Recall@K score
    """
    top_k_chunks = retrieved_chunks[:k] if len(retrieved_chunks) >= k else retrieved_chunks
    return compute_recall(top_k_chunks, gold_chunks, threshold)


def evaluate_retrieval(
    retrieved_chunks: List[str],
    gold_chunks: List[str],
    k_values: List[int] = None
) -> Dict[str, Any]:
    """
    Evaluate retrieval performance with multiple metrics.

    Args:
        retrieved_chunks: List of retrieved document chunks
        gold_chunks: List of gold standard chunks
        k_values: List of K values for Recall@K (default [3, 5, 10])

    Returns:
        Dictionary containing recall@k and mrr scores
    """
    if k_values is None:
        k_values = [3, 5, 10]

    results = {
        "mrr": compute_mrr(retrieved_chunks, gold_chunks)
    }

    for k in k_values:
        results[f"recall@{k}"] = compute_recall_at_k(retrieved_chunks, gold_chunks, k)

    return results