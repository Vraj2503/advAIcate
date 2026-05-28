"""
Answer Evaluator — LLM-as-a-Judge for grading response quality.
Evaluates answers on Grounding, Correctness, and Completeness dimensions.
"""

import json
import logging
import time
from typing import Dict, Any, Optional
from groq import Groq

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import GROQ_MODEL, GROQ_CHAT_TEMPERATURE

logger = logging.getLogger(__name__)


class AnswerEvaluator:
    """LLM-as-Judge evaluator for RAG response quality."""

    JUDGE_PROMPT = """You are an expert legal evaluator assessing the quality of AI-generated legal responses.

Evaluate the generated answer against the ground truth across three dimensions.
Provide your assessment in the exact JSON format specified below.

## Evaluation Dimensions

1. **Grounding (1-5)**: Is the generated answer fully grounded in and supported by the retrieved document context?
   - 5: Perfectly grounded, no hallucination, strictly adheres to context
   - 4: Mostly grounded, minor extrapolations beyond context
   - 3: Partially grounded, some information from context mixed with external knowledge
   - 2: Mostly not grounded, significant reliance on external knowledge
   - 1: Not grounded, entirely hallucinated or contradicts context

2. **Correctness (1-5)**: How factually aligned is the generated answer with the legal ground truth?
   - 5: Completely accurate, all legal provisions and citations correct
   - 4: Mostly accurate, minor factual errors or omissions
   - 3: Partially accurate, some correct information but missing key points
   - 2: Mostly inaccurate, significant factual errors
   - 1: Completely inaccurate, legally incorrect

3. **Completeness (1-5)**: Does the generated answer completely address the query, covering all core aspects?
   - 5: Fully complete, addresses all aspects of the question
   - 4: Mostly complete, minor aspects omitted
   - 3: Moderately complete, key aspects missing
   - 2: Incomplete, significant aspects not addressed
   - 1: Not complete, fails to address the core question

## Output Format
You MUST respond with ONLY a valid JSON object, no additional text:
{{
  "grounding": {{"score": <1-5>, "reason": "<2-3 sentence explanation>"}},
  "correctness": {{"score": <1-5>, "reason": "<2-3 sentence explanation>"}},
  "completeness": {{"score": <1-5>, "reason": "<2-3 sentence explanation>"}}
}}


## Input Data
Generated Answer:
{generated_answer}

Retrieved Context:
{retrieved_context}

Ground Truth Answer:
{ground_truth_answer}

Query:
{question}

## Your Evaluation (JSON only):
"""

    def __init__(self, groq_client: Optional[Groq] = None):
        self.groq_client = groq_client
        self.max_retries = 3
        self.retry_delay = 2

    def evaluate(
        self,
        question: str,
        generated_answer: str,
        ground_truth_answer: str,
        retrieved_context: str,
        delay: float = 0
    ) -> Dict[str, Any]:
        """
        Evaluate a generated answer using LLM-as-Judge.

        Args:
            question: The original user question
            generated_answer: The AI-generated response
            ground_truth_answer: The expected correct answer
            retrieved_context: The context retrieved for answering
            delay: Optional delay before API call (for rate limiting)

        Returns:
            Dictionary with grounding, correctness, and completeness scores and reasons
        """
        if not self.groq_client:
            raise RuntimeError("Groq client not configured for AnswerEvaluator")

        if delay > 0:
            time.sleep(delay)

        prompt = self.JUDGE_PROMPT.format(
            generated_answer=generated_answer[:4000],
            retrieved_context=retrieved_context[:3000] if retrieved_context else "No context retrieved",
            ground_truth_answer=ground_truth_answer[:3000],
            question=question
        )

        for attempt in range(self.max_retries):
            try:
                response = self.groq_client.chat.completions.create(
                    model=GROQ_MODEL,
                    temperature=0.1,
                    max_tokens=1024,
                    messages=[
                        {"role": "system", "content": "You are a precise legal evaluation assistant. Respond ONLY with valid JSON."},
                        {"role": "user", "content": prompt}
                    ]
                )

                result_text = response.choices[0].message.content.strip()
                return self._parse_judge_response(result_text)

            except Exception as e:
                logger.warning(f"Evaluation attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    return self._error_response(str(e))

        return self._error_response("Max retries exceeded")

    def _parse_judge_response(self, response_text: str) -> Dict[str, Any]:
        """Parse the LLM judge's JSON response."""
        try:
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            if json_start != -1 and json_end != 0:
                json_str = response_text[json_start:json_end]
                parsed = json.loads(json_str)

                if self._validate_evaluation(parsed):
                    return parsed
                else:
                    logger.warning(f"Invalid evaluation structure: {parsed}")
                    return self._error_response("Invalid evaluation structure")

        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error: {e}")
            return self._error_response(f"JSON parse error: {e}")

        return self._error_response("Failed to parse judge response")

    def _validate_evaluation(self, eval_data: Dict[str, Any]) -> bool:
        """Validate that the evaluation has the required structure."""
        required_dims = ["grounding", "correctness", "completeness"]
        if not all(dim in eval_data for dim in required_dims):
            return False

        for dim in required_dims:
            if not isinstance(eval_data[dim], dict):
                return False
            if "score" not in eval_data[dim] or "reason" not in eval_data[dim]:
                return False
            score = eval_data[dim]["score"]
            if not isinstance(score, int) or score < 1 or score > 5:
                return False

        return True

    def _error_response(self, error: str) -> Dict[str, Any]:
        """Return an error response with lowest scores."""
        return {
            "grounding": {"score": 0, "reason": f"Evaluation error: {error}"},
            "correctness": {"score": 0, "reason": f"Evaluation error: {error}"},
            "completeness": {"score": 0, "reason": f"Evaluation error: {error}"},
            "error": error
        }

    def compute_average_scores(self, evaluations: list) -> Dict[str, float]:
        """
        Compute average scores from a list of evaluations.

        Args:
            evaluations: List of evaluation dictionaries

        Returns:
            Dictionary with average scores for each dimension
        """
        if not evaluations:
            return {"grounding": 0.0, "correctness": 0.0, "completeness": 0.0}

        valid_evals = [e for e in evaluations if "error" not in e]

        if not valid_evals:
            return {"grounding": 0.0, "correctness": 0.0, "completeness": 0.0}

        return {
            "grounding": sum(e["grounding"]["score"] for e in valid_evals) / len(valid_evals),
            "correctness": sum(e["correctness"]["score"] for e in valid_evals) / len(valid_evals),
            "completeness": sum(e["completeness"]["score"] for e in valid_evals) / len(valid_evals)
        }