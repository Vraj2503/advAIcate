"""
Quality Gate — CLI validation script for evaluation results.
Validates performance against predefined thresholds and exits with appropriate status code.
"""

import json
import sys
import os
import argparse
from typing import Dict, Any, List


THRESHOLDS = {
    "recall@3": 0.70,
    "mrr": 0.75,
    "correctness": 4.0,
    "grounding": 4.2
}


def load_results(results_path: str) -> Dict[str, Any]:
    """Load evaluation results from JSON file."""
    with open(results_path, "r") as f:
        return json.load(f)


def validate_metrics(aggregate_metrics: Dict[str, float]) -> List[Dict[str, Any]]:
    """
    Validate metrics against thresholds.

    Returns list of validation results with pass/fail status.
    """
    results = []

    metrics_to_check = [
        ("recall@3", "Recall@3", "Retrieval"),
        ("mrr", "MRR", "Retrieval"),
        ("correctness", "Correctness (Answer)", "Answer Quality"),
        ("grounding", "Grounding (Answer)", "Answer Quality")
    ]

    for key, display_name, category in metrics_to_check:
        if key not in aggregate_metrics:
            results.append({
                "metric": display_name,
                "category": category,
                "value": None,
                "threshold": THRESHOLDS[key],
                "status": "MISSING"
            })
        else:
            value = aggregate_metrics[key]
            threshold = THRESHOLDS[key]
            status = "PASS" if value >= threshold else "FAIL"

            results.append({
                "metric": display_name,
                "category": category,
                "value": value,
                "threshold": threshold,
                "status": status
            })

    return results


def print_validation_table(validation_results: List[Dict[str, Any]]) -> None:
    """Print a formatted validation table."""
    print("\n" + "=" * 80)
    print("QUALITY GATE VALIDATION REPORT")
    print("=" * 80)

    header = f"{'Metric':<25} {'Category':<20} {'Value':<12} {'Threshold':<12} {'Status':<10}"
    print(f"\n{header}")
    print("-" * 80)

    for result in validation_results:
        if result["value"] is not None:
            value_str = f"{result['value']:.4f}"
        else:
            value_str = "N/A"

        status_color = ""
        status_reset = ""
        if hasattr(sys.stdout, "isatty") and sys.stdout.isatty():
            if result["status"] == "PASS":
                status_color = "\033[92m"
                status_reset = "\033[0m"
            elif result["status"] == "FAIL":
                status_color = "\033[91m"
                status_reset = "\033[0m"

        print(
            f"{result['metric']:<25} "
            f"{result['category']:<20} "
            f"{value_str:<12} "
            f"{result['threshold']:<12.2f} "
            f"{status_color}{result['status']:<10}{status_reset}"
        )

    print("-" * 80)


def print_summary(passed: int, failed: int, missing: int) -> None:
    """Print validation summary."""
    total = passed + failed + missing
    print(f"\nTotal Metrics: {total}")
    print(f"  Passed:  {passed}")
    print(f"  Failed:  {failed}")
    print(f"  Missing: {missing}")

    if failed > 0:
        print("\n[RESULT] QUALITY GATE FAILED — Some metrics below threshold")
    elif missing > 0:
        print("\n[RESULT] QUALITY GATE FAILED — Missing required metrics")
    else:
        print("\n[RESULT] QUALITY GATE PASSED — All metrics meet thresholds")


def print_category_breakdown(category_metrics: Dict[str, Dict[str, float]]) -> None:
    """Print category-wise breakdown if available."""
    if not category_metrics:
        return

    print("\n" + "=" * 80)
    print("CATEGORY-WISE BREAKDOWN")
    print("=" * 80)

    print(f"\n{'Category':<20} {'Count':<8} {'R@3':<10} {'MRR':<10} {'Ground':<10} {'Correct':<10} {'Complete':<10}")
    print("-" * 80)

    for category, metrics in sorted(category_metrics.items()):
        print(
            f"{category:<20} "
            f"{metrics.get('count', 0):<8} "
            f"{metrics.get('mean_recall@3', 0):<10.4f} "
            f"{metrics.get('mean_mrr', 0):<10.4f} "
            f"{metrics.get('mean_grounding', 0):<10.4f} "
            f"{metrics.get('mean_correctness', 0):<10.4f} "
            f"{metrics.get('mean_completeness', 0):<10.4f}"
        )


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Quality Gate for RAG Evaluation Results")
    parser.add_argument(
        "--results",
        type=str,
        default=None,
        help="Path to evaluation_results.json (default: backend/evaluation/evaluation_results.json)"
    )
    parser.add_argument(
        "--thresholds",
        type=str,
        default=None,
        help="Path to custom thresholds JSON file (optional)"
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress detailed output, only print pass/fail"
    )
    parser.add_argument(
        "--show-categories",
        action="store_true",
        help="Show category-wise breakdown"
    )

    args = parser.parse_args()

    if args.results:
        results_path = args.results
    else:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        results_path = os.path.join(script_dir, "evaluation_results.json")

    if not os.path.exists(results_path):
        print(f"ERROR: Results file not found: {results_path}")
        sys.exit(1)

    try:
        results = load_results(results_path)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in results file: {e}")
        sys.exit(1)

    if args.thresholds and os.path.exists(args.thresholds):
        with open(args.thresholds, "r") as f:
            global THRESHOLDS
            THRESHOLDS = json.load(f)

    aggregate = results.get("aggregate_metrics", {})
    validation_results = validate_metrics(aggregate)

    passed = sum(1 for r in validation_results if r["status"] == "PASS")
    failed = sum(1 for r in validation_results if r["status"] == "FAIL")
    missing = sum(1 for r in validation_results if r["status"] == "MISSING")

    if not args.quiet:
        print_validation_table(validation_results)
        print_summary(passed, failed, missing)

        if args.show_categories:
            print_category_breakdown(results.get("category_metrics", {}))

    if failed > 0 or missing > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()