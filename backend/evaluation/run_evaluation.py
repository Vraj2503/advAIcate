"""
Evaluation Orchestrator — end-to-end RAG pipeline evaluation.
Ingests test documents, executes queries, and measures retrieval + answer quality.
"""

import json
import logging
import uuid
import time
import sys
import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from groq import Groq
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)
from embedding_utils import get_embedding_generator
from services.retrieval_service import RetrievalService
from services.chat_service import ChatService
from evaluation.retrieval_evaluator import evaluate_retrieval
from evaluation.answer_evaluator import AnswerEvaluator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


class EvaluationOrchestrator:
    """Orchestrates the full RAG evaluation pipeline."""

    def __init__(self):
        self.groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
        self.embedder = get_embedding_generator()
        self.retrieval_service = RetrievalService()
        self.chat_service = ChatService(groq_client=self.groq_client) if self.groq_client else None
        self.answer_evaluator = AnswerEvaluator(groq_client=self.groq_client) if self.groq_client else None
        self.test_user_id = None
        self.test_session_id = None
        self.ingested_document_ids = []
        self.results = []

    def run_evaluation(self, test_cases_path: str, output_path: str) -> Dict[str, Any]:
        """
        Run the complete evaluation pipeline.

        Args:
            test_cases_path: Path to the test_cases.json file
            output_path: Path to save evaluation_results.json

        Returns:
            Dictionary containing all evaluation results
        """
        with open(test_cases_path, "r") as f:
            test_cases = json.load(f)

        logger.info(f"Loaded {len(test_cases)} test cases")

        self.test_user_id = "75c6c120-9019-483e-b4e3-6883db5e3564"
        self.test_session_id = str(uuid.uuid4())
        logger.info(f"Created test context: user_id={self.test_user_id}, session_id={self.test_session_id}")

        try:
            logger.info("Ingesting test documents...")
            self._ingest_test_documents(test_cases)

            logger.info("Running evaluation loop...")
            self._run_evaluation_loop(test_cases)

            logger.info("Computing aggregate metrics...")
            aggregate = self._compute_aggregate_metrics()

            final_results = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "test_user_id": self.test_user_id,
                "test_session_id": self.test_session_id,
                "total_test_cases": len(test_cases),
                "aggregate_metrics": aggregate,
                "category_metrics": self._compute_category_metrics(),
                "per_case_results": self.results
            }

            with open(output_path, "w") as f:
                json.dump(final_results, f, indent=2)
            logger.info(f"Results saved to {output_path}")

            return final_results

        except Exception as e:
            logger.error(f"Evaluation failed: {e}")
            raise

        finally:
            logger.info("Cleaning up test data...")
            self._cleanup()
            logger.info("Cleanup complete")

    def _ingest_test_documents(self, test_cases: List[Dict]) -> None:
        """Ingest source chunks from test cases into the database."""
        from managers.base_manager import BaseManager
        from supabase import create_client

        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # 1. Create a placeholder session record first to satisfy foreign key constraints in user_documents
        session_data = {
            "id": self.test_session_id,
            "user_id": self.test_user_id,
            "title": "Evaluation Session",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        try:
            client.table("chat_sessions").insert(session_data).execute()
            logger.info(f"Created placeholder session in chat_sessions: {self.test_session_id}")
        except Exception as e:
            logger.error(f"Failed to create placeholder session: {e}")
            raise

        doc_count = 0
        chunk_count = 0

        for tc in test_cases:
            source_chunks = tc.get("source_chunks", [])
            document_name = tc.get("document_name", f"doc_{tc['id']}.txt")
            doc_id = str(uuid.uuid4())

            # 2. Insert document metadata first to user_documents referencing the test_session_id
            doc_metadata = {
                "id": doc_id,
                "user_id": self.test_user_id,
                "session_id": self.test_session_id,
                "file_name": document_name,
                "file_type": "text/plain",
                "storage_path": f"evaluation/{document_name}",
                "content": "\n\n".join(source_chunks),
                "metadata": {"test_case_id": tc["id"], "category": tc["category"]},
                "created_at": datetime.now(timezone.utc).isoformat()
            }

            try:
                result = client.table("user_documents").insert(doc_metadata).execute()
                if result.data:
                    self.ingested_document_ids.append(doc_id)
                    doc_count += 1
                    logger.debug(f"Inserted document metadata for {tc['id']}: {document_name} (id={doc_id})")
                else:
                    logger.warning(f"Document insertion returned no data for {tc['id']}")
                    continue
            except Exception as e:
                logger.error(f"Failed to insert document metadata for {tc['id']}: {e}")
                continue

            # 3. Insert chunk insights referencing the parent doc_id
            for idx, chunk_text in enumerate(source_chunks):
                chunk_embedding = self.embedder.generate_embedding(chunk_text)

                insight_data = {
                    "document_id": doc_id,
                    "user_id": self.test_user_id,
                    "session_id": self.test_session_id,
                    "insight_type": "chunk",
                    "content": chunk_text,
                    "embedding": chunk_embedding,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }

                try:
                    client.table("document_insights").insert(insight_data).execute()
                    chunk_count += 1
                    logger.debug(f"Ingested chunk {idx + 1}/{len(source_chunks)} for {tc['id']}: {document_name}")
                except Exception as e:
                    logger.warning(f"Failed to ingest chunk {idx + 1} for {tc['id']}: {e}")

        logger.info(f"Ingested {doc_count} documents and {chunk_count} document insights chunks successfully")

    def _run_evaluation_loop(self, test_cases: List[Dict]) -> None:
        """Execute the evaluation loop for all test cases."""
        for idx, tc in enumerate(test_cases, 1):
            logger.info(f"Processing test case {idx}/{len(test_cases)}: {tc['id']}")

            try:
                result = self._evaluate_single_case(tc)
                self.results.append(result)
            except Exception as e:
                logger.error(f"Failed to evaluate {tc['id']}: {e}")
                self.results.append({
                    "test_case_id": tc["id"],
                    "category": tc["category"],
                    "question": tc["question"],
                    "error": str(e)
                })

            if idx % 5 == 0:
                logger.info(f"Progress: {idx}/{len(test_cases)} test cases completed")

    def _evaluate_single_case(self, tc: Dict) -> Dict[str, Any]:
        """Evaluate a single test case."""
        question = tc["question"]
        gold_chunks = tc.get("source_chunks", [])
        ground_truth = tc["ground_truth_answer"]

        retrieved_data = self.retrieval_service.retrieve(
            query=question,
            user_id=self.test_user_id,
            session_id=self.test_session_id,
            top_k=10,
            include_past_conversations=False
        )

        retrieved_chunks = [doc.get("content", "") for doc in retrieved_data.get("document_context", [])]

        retrieval_metrics = evaluate_retrieval(retrieved_chunks, gold_chunks, k_values=[3, 5, 10])

        context_str = self.retrieval_service.format_context(retrieved_data)

        if self.chat_service and self.groq_client:
            try:
                chat_result = self.chat_service.handle_chat(
                    user_id=self.test_user_id,
                    message=question,
                    session_id=self.test_session_id
                )
                generated_answer = chat_result.get("response", "")
            except Exception as e:
                logger.warning(f"Chat service error for {tc['id']}: {e}")
                generated_answer = f"[Error: {str(e)}]"
        else:
            generated_answer = "[Groq client not available]"

        if self.answer_evaluator and generated_answer and not generated_answer.startswith("[Error"):
            try:
                answer_evaluation = self.answer_evaluator.evaluate(
                    question=question,
                    generated_answer=generated_answer,
                    ground_truth_answer=ground_truth,
                    retrieved_context=context_str,
                    delay=1.0
                )
            except Exception as e:
                logger.warning(f"Answer evaluation error for {tc['id']}: {e}")
                answer_evaluation = {
                    "grounding": {"score": 0, "reason": str(e)},
                    "correctness": {"score": 0, "reason": str(e)},
                    "completeness": {"score": 0, "reason": str(e)}
                }
        else:
            answer_evaluation = {
                "grounding": {"score": 0, "reason": "Evaluation skipped"},
                "correctness": {"score": 0, "reason": "Evaluation skipped"},
                "completeness": {"score": 0, "reason": "Evaluation skipped"}
            }

        return {
            "test_case_id": tc["id"],
            "category": tc["category"],
            "question": question,
            "ground_truth_answer": ground_truth,
            "generated_answer": generated_answer,
            "retrieved_chunks": retrieved_chunks[:5],
            "retrieval_metrics": retrieval_metrics,
            "answer_evaluation": answer_evaluation
        }

    def _compute_aggregate_metrics(self) -> Dict[str, Any]:
        """Compute aggregate metrics across all test cases."""
        valid_results = [r for r in self.results if "error" not in r]

        if not valid_results:
            return {
                "mean_recall@3": 0.0,
                "mean_recall@5": 0.0,
                "mean_mrr": 0.0,
                "mean_grounding": 0.0,
                "mean_correctness": 0.0,
                "mean_completeness": 0.0,
                "recall@3": 0.0,
                "recall@5": 0.0,
                "mrr": 0.0,
                "grounding": 0.0,
                "correctness": 0.0,
                "completeness": 0.0
            }

        retrieval_metrics_list = [r.get("retrieval_metrics", {}) for r in valid_results]
        answer_evals = [r.get("answer_evaluation", {}) for r in valid_results]

        mean_recall3 = sum(r.get("recall@3", 0) for r in retrieval_metrics_list) / len(valid_results)
        mean_recall5 = sum(r.get("recall@5", 0) for r in retrieval_metrics_list) / len(valid_results)
        mean_mrr_val = sum(r.get("mrr", 0) for r in retrieval_metrics_list) / len(valid_results)
        mean_grounding_val = sum(e.get("grounding", {}).get("score", 0) for e in answer_evals) / len(valid_results)
        mean_correctness_val = sum(e.get("correctness", {}).get("score", 0) for e in answer_evals) / len(valid_results)
        mean_completeness_val = sum(e.get("completeness", {}).get("score", 0) for e in answer_evals) / len(valid_results)

        return {
            "mean_recall@3": mean_recall3,
            "mean_recall@5": mean_recall5,
            "mean_mrr": mean_mrr_val,
            "mean_grounding": mean_grounding_val,
            "mean_correctness": mean_correctness_val,
            "mean_completeness": mean_completeness_val,
            "recall@3": mean_recall3,
            "recall@5": mean_recall5,
            "mrr": mean_mrr_val,
            "grounding": mean_grounding_val,
            "correctness": mean_correctness_val,
            "completeness": mean_completeness_val
        }

    def _compute_category_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Compute metrics grouped by legal category."""
        category_results = defaultdict(list)

        for r in self.results:
            if "error" not in r:
                category_results[r["category"]].append(r)

        category_metrics = {}
        for category, cases in category_results.items():
            if not cases:
                continue

            retrieval_metrics_list = [c.get("retrieval_metrics", {}) for c in cases]
            answer_evals = [c.get("answer_evaluation", {}) for c in cases]

            category_metrics[category] = {
                "count": len(cases),
                "mean_recall@3": sum(r.get("recall@3", 0) for r in retrieval_metrics_list) / len(cases),
                "mean_recall@5": sum(r.get("recall@5", 0) for r in retrieval_metrics_list) / len(cases),
                "mean_mrr": sum(r.get("mrr", 0) for r in retrieval_metrics_list) / len(cases),
                "mean_grounding": sum(e.get("grounding", {}).get("score", 0) for e in answer_evals) / len(cases),
                "mean_correctness": sum(e.get("correctness", {}).get("score", 0) for e in answer_evals) / len(cases),
                "mean_completeness": sum(e.get("completeness", {}).get("score", 0) for e in answer_evals) / len(cases)
            }

        return category_metrics

    def _cleanup(self) -> None:
        """Clean up all temporary test data from the database."""
        from supabase import create_client

        if not self.test_session_id:
            return

        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        try:
            client.table("document_insights").delete() \
                .eq("session_id", self.test_session_id) \
                .execute()
            logger.info(f"Deleted document_insights for session_id={self.test_session_id}")
        except Exception as e:
            logger.warning(f"Failed to delete document_insights: {e}")

        try:
            client.table("user_documents").delete() \
                .eq("session_id", self.test_session_id) \
                .execute()
            logger.info(f"Deleted user_documents for session_id={self.test_session_id}")
        except Exception as e:
            logger.warning(f"Failed to delete user_documents: {e}")

        try:
            # Delete messages and summaries specifically for our test session
            try:
                client.table("chat_messages").delete() \
                    .eq("session_id", self.test_session_id) \
                    .execute()
            except Exception:
                pass
            try:
                client.table("messages").delete() \
                    .eq("session_id", self.test_session_id) \
                    .execute()
            except Exception:
                pass
            try:
                client.table("conversation_summaries").delete() \
                    .eq("session_id", self.test_session_id) \
                    .execute()
            except Exception:
                pass
            try:
                client.table("chat_sessions").delete() \
                    .eq("id", self.test_session_id) \
                    .execute()
            except Exception:
                pass

            logger.info(f"Deleted sessions and messages for session_id={self.test_session_id}")
        except Exception as e:
            logger.warning(f"Failed to cleanup sessions: {e}")

        logger.info("Test data cleanup completed")


def print_report(results: Dict[str, Any]) -> None:
    """Print a beautiful report to the console."""
    print("\n" + "=" * 70)
    print("RAG EVALUATION HARNESS — RESULTS REPORT")
    print("=" * 70)

    aggregate = results.get("aggregate_metrics", {})

    print("\n## Overall Retrieval Metrics")
    print(f"  Mean Recall@3:     {aggregate.get('mean_recall@3', 0):.4f}")
    print(f"  Mean Recall@5:     {aggregate.get('mean_recall@5', 0):.4f}")
    print(f"  Mean MRR:          {aggregate.get('mean_mrr', 0):.4f}")

    print("\n## Overall Answer Quality (LLM-as-Judge)")
    print(f"  Mean Grounding:    {aggregate.get('mean_grounding', 0):.4f} / 5.0")
    print(f"  Mean Correctness:  {aggregate.get('mean_correctness', 0):.4f} / 5.0")
    print(f"  Mean Completeness: {aggregate.get('mean_completeness', 0):.4f} / 5.0")

    print("\n## Category Breakdown")
    category_metrics = results.get("category_metrics", {})
    for category, metrics in sorted(category_metrics.items()):
        print(f"\n  [{category.upper()}]")
        print(f"    Count:           {metrics['count']}")
        print(f"    Recall@3:        {metrics['mean_recall@3']:.4f}")
        print(f"    Recall@5:        {metrics['mean_recall@5']:.4f}")
        print(f"    MRR:             {metrics['mean_mrr']:.4f}")
        print(f"    Grounding:       {metrics['mean_grounding']:.4f} / 5.0")
        print(f"    Correctness:     {metrics['mean_correctness']:.4f} / 5.0")
        print(f"    Completeness:    {metrics['mean_completeness']:.4f} / 5.0")

    print("\n## Test Case Summary")
    total = results.get("total_test_cases", 0)
    completed = len([r for r in results.get("per_case_results", []) if "error" not in r])
    print(f"  Total:    {total}")
    print(f"  Completed: {completed}")
    print(f"  Errors:    {total - completed}")

    print("\n" + "=" * 70)


def main():
    """Main entry point."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    test_cases_path = os.path.join(script_dir, "test_cases.json")
    output_path = os.path.join(script_dir, "evaluation_results.json")

    orchestrator = EvaluationOrchestrator()

    results = orchestrator.run_evaluation(test_cases_path, output_path)
    print_report(results)

    return results


if __name__ == "__main__":
    main()