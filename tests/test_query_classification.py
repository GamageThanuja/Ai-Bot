"""
Query Classification Test Suite
Tests the is_hotel_query() function for accuracy in classifying hotel vs non-hotel queries.
"""

import json
import os
import sys
from typing import Dict, List, Tuple

# Add the parent directory to the path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.chatbot import is_hotel_query

class QueryClassificationTester:
    def __init__(self, test_data_path: str = "test_data/query_classification_test_data.json"):
        """Initialize the tester with test data."""
        self.test_data_path = test_data_path
        self.test_data = self.load_test_data()
        self.results = {
            'tp': 0,  # True Positives
            'fp': 0,  # False Positives  
            'tn': 0,  # True Negatives
            'fn': 0   # False Negatives
        }
        self.detailed_results = []
    
    def load_test_data(self) -> Dict[str, List[str]]:
        """Load test data from JSON file."""
        try:
            with open(self.test_data_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Error: Test data file '{self.test_data_path}' not found.")
            print("Please ensure the test data file exists in the correct location.")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in test data file: {e}")
            sys.exit(1)
    
    def run_classification_test(self) -> None:
        """Run classification tests on all queries."""
        print("Running Query Classification Tests...")
        print("=" * 50)
        
        # Test hotel queries (should be classified as True)
        hotel_queries = self.test_data.get('hotel_queries', [])
        print(f"Testing {len(hotel_queries)} hotel queries...")
        
        for i, query in enumerate(hotel_queries, 1):
            prediction = is_hotel_query(query)
            is_correct = prediction == True  # Expected: True
            
            if prediction:
                self.results['tp'] += 1  # Correctly identified as hotel
            else:
                self.results['fn'] += 1  # Incorrectly rejected as non-hotel
            
            self.detailed_results.append({
                'query': query,
                'expected': True,
                'predicted': prediction,
                'correct': is_correct,
                'type': 'hotel'
            })
            
            if not is_correct:
                print(f"  ❌ MISSED: '{query}' -> {prediction}")
        
        # Test non-hotel queries (should be classified as False)
        non_hotel_queries = self.test_data.get('non_hotel_queries', [])
        print(f"\nTesting {len(non_hotel_queries)} non-hotel queries...")
        
        for i, query in enumerate(non_hotel_queries, 1):
            prediction = is_hotel_query(query)
            is_correct = prediction == False  # Expected: False
            
            if not prediction:
                self.results['tn'] += 1  # Correctly rejected as non-hotel
            else:
                self.results['fp'] += 1  # Incorrectly identified as hotel
            
            self.detailed_results.append({
                'query': query,
                'expected': False,
                'predicted': prediction,
                'correct': is_correct,
                'type': 'non_hotel'
            })
            
            if not is_correct:
                print(f"  ❌ FALSE POSITIVE: '{query}' -> {prediction}")
    
    def calculate_metrics(self) -> Dict[str, float]:
        """Calculate classification metrics."""
        tp, fp, tn, fn = self.results['tp'], self.results['fp'], self.results['tn'], self.results['fn']
        
        # Avoid division by zero
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        accuracy = (tp + tn) / (tp + fp + tn + fn) if (tp + fp + tn + fn) > 0 else 0.0
        
        # False positive rate: FP / (FP + TN)
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        
        # False negative rate: FN / (FN + TP)  
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
        
        return {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1_score,
            'false_positive_rate': fpr,
            'false_negative_rate': fnr
        }
    
    def print_results(self) -> None:
        """Print detailed test results."""
        print("\n" + "=" * 50)
        print("QUERY CLASSIFICATION TEST RESULTS")
        print("=" * 50)
        
        # Confusion Matrix
        tp, fp, tn, fn = self.results['tp'], self.results['fp'], self.results['tn'], self.results['fn']
        print("\nCONFUSION MATRIX:")
        print("                 Predicted")
        print("                Hotel  Non-Hotel")
        print(f"Actual Hotel     {tp:4d}    {fn:4d}")
        print(f"   Non-Hotel     {fp:4d}    {tn:4d}")
        
        # Raw counts
        print(f"\nRAW COUNTS:")
        print(f"True Positives (TP):  {tp}")
        print(f"False Positives (FP): {fp}")
        print(f"True Negatives (TN):  {tn}")
        print(f"False Negatives (FN): {fn}")
        print(f"Total Queries:        {tp + fp + tn + fn}")
        
        # Calculated metrics
        metrics = self.calculate_metrics()
        print(f"\nCLASSIFICATION METRICS:")
        print(f"Accuracy:              {metrics['accuracy']:.3f} ({metrics['accuracy']*100:.1f}%)")
        print(f"Precision:             {metrics['precision']:.3f} ({metrics['precision']*100:.1f}%)")
        print(f"Recall:                {metrics['recall']:.3f} ({metrics['recall']*100:.1f}%)")
        print(f"F1 Score:              {metrics['f1_score']:.3f}")
        print(f"False Positive Rate:   {metrics['false_positive_rate']:.3f} ({metrics['false_positive_rate']*100:.1f}%)")
        print(f"False Negative Rate:   {metrics['false_negative_rate']:.3f} ({metrics['false_negative_rate']*100:.1f}%)")
        
        # Performance summary
        print(f"\nPERFORMANCE SUMMARY:")
        total_hotel = tp + fn
        total_non_hotel = tn + fp
        hotel_accuracy = tp / total_hotel if total_hotel > 0 else 0
        non_hotel_accuracy = tn / total_non_hotel if total_non_hotel > 0 else 0
        
        print(f"Hotel Query Accuracy:     {hotel_accuracy:.3f} ({hotel_accuracy*100:.1f}%)")
        print(f"Non-Hotel Query Accuracy: {non_hotel_accuracy:.3f} ({non_hotel_accuracy*100:.1f}%)")
        
        # Recommendations
        print(f"\nRECOMMENDATIONS:")
        if metrics['precision'] < 0.8:
            print("- Consider refining hotel keywords to reduce false positives")
        if metrics['recall'] < 0.8:
            print("- Consider adding more hotel keywords to catch missed queries")
        if metrics['f1_score'] < 0.8:
            print("- Overall classification needs improvement")
        if metrics['false_positive_rate'] > 0.1:
            print("- Too many non-hotel queries being processed - review keyword list")
        if metrics['false_negative_rate'] > 0.1:
            print("- Too many hotel queries being rejected - expand keyword coverage")
    
    def save_detailed_results(self, output_path: str = "test_results/query_classification_results.json") -> None:
        """Save detailed results to file."""
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        results_data = {
            'test_summary': {
                'total_queries': len(self.detailed_results),
                'confusion_matrix': self.results,
                'metrics': self.calculate_metrics()
            },
            'detailed_results': self.detailed_results
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(results_data, f, indent=2, ensure_ascii=False)
        
        print(f"\nDetailed results saved to: {output_path}")


def main():
    """Main function to run the query classification tests."""
    # Check if test data file exists
    test_data_path = "test_data/query_classification_test_data.json"
    if not os.path.exists(test_data_path):
        print(f"Error: Test data file '{test_data_path}' not found.")
        print("\nPlease create the test data file first:")
        print("1. Create a 'test_data' directory in your project root")
        print("2. Create 'query_classification_test_data.json' with hotel and non-hotel queries")
        return
    
    # Initialize and run tests
    tester = QueryClassificationTester(test_data_path)
    tester.run_classification_test()
    tester.print_results()
    tester.save_detailed_results()


if __name__ == "__main__":
    main()