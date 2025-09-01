"""
Answer Generation Accuracy Test Suite
Tests the complete QA system to ensure it generates correct, complete, and helpful answers.
"""

import json
import os
import sys
from typing import Dict, List, Tuple, Any
import re

# Add the parent directory to the path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.chatbot import load_chain, filter_response

class AnswerGenerationTester:
    def __init__(self, test_data_path: str = "test_data/answer_generation_test_data.json"):
        """Initialize the answer generation tester."""
        self.test_data_path = test_data_path
        self.test_cases = self.load_test_data()
        self.qa_chain = None
        self.results = []
        
        # Load the QA chain
        self.load_qa_system()
    
    def load_test_data(self) -> List[Dict]:
        """Load test cases from JSON file."""
        try:
            with open(self.test_data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('answer_generation_test_cases', [])
        except FileNotFoundError:
            print(f"Error: Test data file '{self.test_data_path}' not found.")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in test data file: {e}")
            sys.exit(1)
    
    def load_qa_system(self):
        """Load the complete QA chain system."""
        try:
            print("Loading QA system...")
            self.qa_chain = load_chain()
            print("QA system loaded successfully!")
            
        except Exception as e:
            print(f"Error loading QA system: {e}")
            print("Please ensure your PDFs are in the 'pdfs' folder and the system is properly configured.")
            sys.exit(1)
    
    def generate_answer(self, question: str) -> str:
        """Generate answer for a question using the complete QA pipeline."""
        try:
            # Use the complete pipeline: retrieval + generation + filtering
            result = self.qa_chain.invoke({"query": question})
            filtered_answer = filter_response(question, result)
            return filtered_answer
            
        except Exception as e:
            return f"Error generating answer: {str(e)}"
    
    def evaluate_answer_quality(self, question: str, generated_answer: str, test_case: Dict) -> Dict:
        """Evaluate the quality of a generated answer."""
        evaluation = {
            'question': question,
            'generated_answer': generated_answer,
            'test_case_id': test_case['id'],
            'category': test_case['category'],
            'difficulty': test_case['difficulty']
        }
        
        # Check if it's an "unanswerable" test case
        if test_case.get('expected_response_type') == 'should_refuse':
            return self.evaluate_refusal_answer(generated_answer, test_case, evaluation)
        
        # Standard answer evaluation
        expected_points = test_case.get('expected_answer_points', [])
        must_include = test_case.get('must_include', [])
        must_not_include = test_case.get('must_not_include', [])
        
        # Convert to lowercase for comparison
        answer_lower = generated_answer.lower()
        
        # Check must_include items
        included_items = []
        missing_required = []
        for item in must_include:
            if item.lower() in answer_lower:
                included_items.append(item)
            else:
                missing_required.append(item)
        
        # Check must_not_include items (hallucinations)
        hallucinated_items = []
        for item in must_not_include:
            if item.lower() in answer_lower:
                hallucinated_items.append(item)
        
        # Check coverage of expected answer points
        covered_points = []
        for point in expected_points:
            # Simple keyword matching - could be improved with semantic similarity
            point_keywords = point.lower().split()
            if any(keyword in answer_lower for keyword in point_keywords if len(keyword) > 3):
                covered_points.append(point)
        
        # Calculate scores
        inclusion_score = len(included_items) / len(must_include) if must_include else 1.0
        hallucination_penalty = len(hallucinated_items) * 0.2  # 20% penalty per hallucination
        coverage_score = len(covered_points) / len(expected_points) if expected_points else 1.0
        
        # Overall quality score (0-1)
        quality_score = max(0, (inclusion_score + coverage_score) / 2 - hallucination_penalty)
        
        # Determine answer quality category
        if quality_score >= 0.8:
            quality_category = "excellent"
        elif quality_score >= 0.6:
            quality_category = "good"
        elif quality_score >= 0.4:
            quality_category = "fair"
        else:
            quality_category = "poor"
        
        # Check for default responses (system might be refusing inappropriately)
        is_default_response = any(phrase in answer_lower for phrase in [
            "i'm here to help with hotel-related questions",
            "i'm not confident enough to answer",
            "according to the provided context"
        ])
        
        evaluation.update({
            'inclusion_score': inclusion_score,
            'coverage_score': coverage_score,
            'quality_score': quality_score,
            'quality_category': quality_category,
            'included_items': included_items,
            'missing_required': missing_required,
            'hallucinated_items': hallucinated_items,
            'covered_points': covered_points,
            'is_default_response': is_default_response,
            'answer_length': len(generated_answer),
            'has_hallucinations': len(hallucinated_items) > 0
        })
        
        return evaluation
    
    def evaluate_refusal_answer(self, generated_answer: str, test_case: Dict, evaluation: Dict) -> Dict:
        """Evaluate answers that should refuse to answer (unanswerable questions)."""
        answer_lower = generated_answer.lower()
        
        # Check if it appropriately refused
        refusal_indicators = [
            "i'm here to help with hotel-related questions",
            "i don't have information",
            "i'm not confident enough",
            "cannot find",
            "not available in",
            "don't know"
        ]
        
        refused_appropriately = any(indicator in answer_lower for indicator in refusal_indicators)
        
        # Check if it hallucinated information it shouldn't know
        must_not_include = test_case.get('must_not_include', [])
        hallucinated_items = [item for item in must_not_include if item.lower() in answer_lower]
        
        quality_score = 1.0 if refused_appropriately and not hallucinated_items else 0.0
        quality_category = "excellent" if quality_score == 1.0 else "poor"
        
        evaluation.update({
            'refused_appropriately': refused_appropriately,
            'should_refuse': True,
            'quality_score': quality_score,
            'quality_category': quality_category,
            'hallucinated_items': hallucinated_items,
            'has_hallucinations': len(hallucinated_items) > 0,
            'answer_length': len(generated_answer)
        })
        
        return evaluation
    
    def run_answer_generation_tests(self):
        """Run answer generation tests on all test cases."""
        print("Running Answer Generation Tests...")
        print("=" * 50)
        
        total_cases = len(self.test_cases)
        
        for i, test_case in enumerate(self.test_cases, 1):
            question = test_case['question']
            print(f"Testing {i}/{total_cases}: {question[:60]}...")
            
            # Generate answer
            generated_answer = self.generate_answer(question)
            
            # Evaluate answer quality
            evaluation = self.evaluate_answer_quality(question, generated_answer, test_case)
            self.results.append(evaluation)
            
            # Show poor results immediately
            if evaluation['quality_score'] < 0.6:
                print(f"  ❌ {evaluation['quality_category'].upper()} ({evaluation['quality_score']:.2f})")
                if evaluation.get('missing_required'):
                    print(f"     Missing: {evaluation['missing_required']}")
                if evaluation.get('hallucinated_items'):
                    print(f"     Hallucinated: {evaluation['hallucinated_items']}")
            elif evaluation.get('has_hallucinations'):
                print(f"  ⚠️  HALLUCINATION: {evaluation['hallucinated_items']}")
    
    def calculate_metrics(self) -> Dict[str, float]:
        """Calculate overall answer generation metrics."""
        if not self.results:
            return {}
        
        # Overall metrics
        total_cases = len(self.results)
        avg_quality_score = sum(r['quality_score'] for r in self.results) / total_cases
        
        # Quality distribution
        quality_counts = {'excellent': 0, 'good': 0, 'fair': 0, 'poor': 0}
        for result in self.results:
            quality_counts[result['quality_category']] += 1
        
        # Specific issues
        hallucination_cases = sum(1 for r in self.results if r.get('has_hallucinations', False))
        default_response_cases = sum(1 for r in self.results if r.get('is_default_response', False))
        refusal_cases = [r for r in self.results if r.get('should_refuse', False)]
        
        # Refusal accuracy (for unanswerable questions)
        if refusal_cases:
            appropriate_refusals = sum(1 for r in refusal_cases if r.get('refused_appropriately', False))
            refusal_accuracy = appropriate_refusals / len(refusal_cases)
        else:
            refusal_accuracy = None
        
        # Average answer length
        avg_answer_length = sum(r['answer_length'] for r in self.results) / total_cases
        
        return {
            'avg_quality_score': avg_quality_score,
            'quality_distribution': quality_counts,
            'hallucination_rate': hallucination_cases / total_cases,
            'default_response_rate': default_response_cases / total_cases,
            'refusal_accuracy': refusal_accuracy,
            'avg_answer_length': avg_answer_length,
            'total_cases': total_cases
        }
    
    def get_category_performance(self) -> Dict[str, Dict]:
        """Get performance breakdown by category."""
        category_stats = {}
        
        for result in self.results:
            category = result['category']
            if category not in category_stats:
                category_stats[category] = {
                    'total': 0,
                    'scores': [],
                    'excellent': 0,
                    'good': 0,
                    'fair': 0,
                    'poor': 0,
                    'hallucinations': 0
                }
            
            stats = category_stats[category]
            stats['total'] += 1
            stats['scores'].append(result['quality_score'])
            stats[result['quality_category']] += 1
            if result.get('has_hallucinations'):
                stats['hallucinations'] += 1
        
        # Calculate averages
        for category, stats in category_stats.items():
            stats['avg_score'] = sum(stats['scores']) / len(stats['scores'])
            stats['hallucination_rate'] = stats['hallucinations'] / stats['total']
        
        return category_stats
    
    def print_results(self):
        """Print detailed test results."""
        print("\n" + "=" * 50)
        print("ANSWER GENERATION TEST RESULTS")
        print("=" * 50)
        
        metrics = self.calculate_metrics()
        category_stats = self.get_category_performance()
        
        # Overall Performance
        print(f"\nOVERALL PERFORMANCE:")
        print(f"Total Test Cases:        {metrics['total_cases']}")
        print(f"Average Quality Score:   {metrics['avg_quality_score']:.3f}")
        print(f"Average Answer Length:   {metrics['avg_answer_length']:.0f} characters")
        
        # Quality Distribution
        print(f"\nQUALITY DISTRIBUTION:")
        quality_dist = metrics['quality_distribution']
        for quality, count in quality_dist.items():
            percentage = (count / metrics['total_cases']) * 100
            print(f"{quality.title():<10}: {count:2d} cases ({percentage:4.1f}%)")
        
        # Issue Rates
        print(f"\nISSUE ANALYSIS:")
        print(f"Hallucination Rate:      {metrics['hallucination_rate']:.1%}")
        print(f"Default Response Rate:   {metrics['default_response_rate']:.1%}")
        if metrics['refusal_accuracy'] is not None:
            print(f"Refusal Accuracy:        {metrics['refusal_accuracy']:.1%}")
        
        # Performance by Category
        print(f"\nPERFORMANCE BY CATEGORY:")
        for category, stats in category_stats.items():
            print(f"{category.replace('_', ' ').title():<25}: {stats['avg_score']:.3f} avg, "
                  f"{stats['excellent']+stats['good']}/{stats['total']} good+, "
                  f"{stats['hallucination_rate']:.1%} hallucinations")
        
        # Worst Performing Cases
        print(f"\nWORST PERFORMING CASES:")
        sorted_results = sorted(self.results, key=lambda x: x['quality_score'])
        for i, result in enumerate(sorted_results[:5], 1):
            question = result['question'][:60] + "..." if len(result['question']) > 60 else result['question']
            print(f"{i}. {question}")
            print(f"   Score: {result['quality_score']:.3f} ({result['quality_category']})")
            if result.get('missing_required'):
                print(f"   Missing: {result['missing_required']}")
            if result.get('hallucinated_items'):
                print(f"   Hallucinated: {result['hallucinated_items']}")
        
        # Best Performing Cases
        print(f"\nBEST PERFORMING CASES:")
        best_results = sorted(self.results, key=lambda x: x['quality_score'], reverse=True)
        for i, result in enumerate(best_results[:3], 1):
            question = result['question'][:60] + "..." if len(result['question']) > 60 else result['question']
            print(f"{i}. {question}")
            print(f"   Score: {result['quality_score']:.3f} ({result['quality_category']})")
        
        # Recommendations
        print(f"\nRECOMMENDATIONS:")
        if metrics['avg_quality_score'] < 0.7:
            print("- Overall answer quality needs improvement")
        if metrics['hallucination_rate'] > 0.1:
            print("- High hallucination rate - review system prompts and retrieval")
        if metrics['default_response_rate'] > 0.2:
            print("- Too many default responses - may need to lower confidence threshold")
        if metrics.get('refusal_accuracy', 1.0) < 0.8:
            print("- Improve handling of unanswerable questions")
        
        # Identify weak categories
        weak_categories = [cat for cat, stats in category_stats.items() 
                          if stats['avg_score'] < 0.6]
        if weak_categories:
            print(f"- Focus on improving these categories: {', '.join(weak_categories)}")
        
        high_hallucination_categories = [cat for cat, stats in category_stats.items() 
                                       if stats['hallucination_rate'] > 0.2]
        if high_hallucination_categories:
            print(f"- Address hallucinations in: {', '.join(high_hallucination_categories)}")
    
    def save_detailed_results(self, output_path: str = "test_results/answer_generation_results.json"):
        """Save detailed results to file."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        results_data = {
            'test_summary': {
                'metrics': self.calculate_metrics(),
                'category_performance': self.get_category_performance()
            },
            'detailed_results': self.results
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(results_data, f, indent=2, ensure_ascii=False)
        
        print(f"\nDetailed results saved to: {output_path}")


def main():
    """Main function to run answer generation tests."""
    # Check if test data file exists
    test_data_path = "test_data/answer_generation_test_data.json"
    if not os.path.exists(test_data_path):
        print(f"Error: Test data file '{test_data_path}' not found.")
        print("\nPlease create the test data file first.")
        return
    
    # Check if PDFs directory exists
    if not os.path.exists("pdfs") or not os.listdir("pdfs"):
        print("Error: No PDFs found in 'pdfs' directory.")
        print("Please ensure your hotel PDFs are in the 'pdfs' folder.")
        return
    
    # Initialize and run tests
    tester = AnswerGenerationTester(test_data_path)
    tester.run_answer_generation_tests()
    tester.print_results()
    tester.save_detailed_results()


if __name__ == "__main__":
    main()