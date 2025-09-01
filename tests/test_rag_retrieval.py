"""
RAG System Retrieval Test Suite
Tests the document retrieval system to ensure it finds relevant content from PDFs.
"""

import json
import os
import sys
from typing import Dict, List, Tuple, Any

# Add the parent directory to the path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.chatbot import load_chain

class RAGRetrievalTester:
    def __init__(self, test_data_path: str = "test_data/rag_retrieval_test_data.json"):
        """Initialize the RAG retrieval tester."""
        self.test_data_path = test_data_path
        self.test_cases = self.load_test_data()
        self.qa_chain = None
        self.retriever = None
        self.results = []
        
        # Load the QA chain and extract retriever
        self.load_retrieval_system()
    
    def load_test_data(self) -> List[Dict]:
        """Load test cases from JSON file."""
        try:
            with open(self.test_data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('retrieval_test_cases', [])
        except FileNotFoundError:
            print(f"Error: Test data file '{self.test_data_path}' not found.")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in test data file: {e}")
            sys.exit(1)
    
    def load_retrieval_system(self):
        """Load the QA chain and extract the retriever."""
        try:
            print("Loading RAG system...")
            self.qa_chain = load_chain()
            
            # Extract retriever from the chain
            if hasattr(self.qa_chain, 'retriever'):
                self.retriever = self.qa_chain.retriever
            elif hasattr(self.qa_chain, 'combine_documents_chain'):
                # Try to get retriever from RetrievalQA chain structure
                if hasattr(self.qa_chain.combine_documents_chain, 'retriever'):
                    self.retriever = self.qa_chain.combine_documents_chain.retriever
            
            if self.retriever is None:
                # Fallback: try to invoke the chain to get retriever
                print("Warning: Could not directly extract retriever. Using chain invoke method.")
                
            print("RAG system loaded successfully!")
            
        except Exception as e:
            print(f"Error loading RAG system: {e}")
            print("Please ensure your PDFs are in the 'pdfs' folder and the system is properly configured.")
            sys.exit(1)
    
    def retrieve_documents(self, query: str, k: int = 3) -> List[Any]:
        """Retrieve documents for a given query."""
        try:
            if self.retriever:
                # Direct retriever approach
                docs = self.retriever.get_relevant_documents(query)
                return docs
            else:
                # Fallback: use chain invoke and extract source documents
                result = self.qa_chain.invoke({"query": query})
                return result.get('source_documents', [])
                
        except Exception as e:
            print(f"Error retrieving documents for query '{query}': {e}")
            return []
    
    def evaluate_retrieval_quality(self, query: str, retrieved_docs: List[Any], expected_keywords: List[str]) -> Dict:
        """Evaluate the quality of retrieved documents."""
        if not retrieved_docs:
            return {
                'has_relevant_content': False,
                'keyword_matches': 0,
                'total_keywords': len(expected_keywords),
                'matched_keywords': [],
                'retrieval_score': 0.0,
                'doc_count': 0
            }
        
        # Combine all retrieved document content
        all_content = ""
        for doc in retrieved_docs:
            if hasattr(doc, 'page_content'):
                all_content += doc.page_content.lower() + " "
            else:
                all_content += str(doc).lower() + " "
        
        # Check for keyword matches
        matched_keywords = []
        for keyword in expected_keywords:
            if keyword.lower() in all_content:
                matched_keywords.append(keyword)
        
        keyword_match_rate = len(matched_keywords) / len(expected_keywords) if expected_keywords else 0
        
        return {
            'has_relevant_content': len(matched_keywords) > 0,
            'keyword_matches': len(matched_keywords),
            'total_keywords': len(expected_keywords),
            'matched_keywords': matched_keywords,
            'retrieval_score': keyword_match_rate,
            'doc_count': len(retrieved_docs)
        }
    
    def run_retrieval_tests(self):
        """Run retrieval tests on all test cases."""
        print("Running RAG Retrieval Tests...")
        print("=" * 50)
        
        total_cases = len(self.test_cases)
        successful_retrievals = 0
        total_keyword_matches = 0
        total_keywords = 0
        
        category_stats = {}
        difficulty_stats = {}
        
        for i, test_case in enumerate(self.test_cases, 1):
            print(f"Testing {i}/{total_cases}: {test_case['question'][:60]}...")
            
            # Retrieve documents
            retrieved_docs = self.retrieve_documents(test_case['question'])
            
            # Evaluate retrieval quality
            evaluation = self.evaluate_retrieval_quality(
                test_case['question'],
                retrieved_docs,
                test_case['expected_keywords']
            )
            
            # Store results
            result = {
                'test_case': test_case,
                'evaluation': evaluation,
                'retrieved_doc_count': len(retrieved_docs)
            }
            self.results.append(result)
            
            # Update statistics
            if evaluation['has_relevant_content']:
                successful_retrievals += 1
            
            total_keyword_matches += evaluation['keyword_matches']
            total_keywords += evaluation['total_keywords']
            
            # Category statistics
            category = test_case['category']
            if category not in category_stats:
                category_stats[category] = {'total': 0, 'successful': 0, 'keyword_matches': 0, 'total_keywords': 0}
            category_stats[category]['total'] += 1
            if evaluation['has_relevant_content']:
                category_stats[category]['successful'] += 1
            category_stats[category]['keyword_matches'] += evaluation['keyword_matches']
            category_stats[category]['total_keywords'] += evaluation['total_keywords']
            
            # Difficulty statistics
            difficulty = test_case['difficulty']
            if difficulty not in difficulty_stats:
                difficulty_stats[difficulty] = {'total': 0, 'successful': 0, 'keyword_matches': 0, 'total_keywords': 0}
            difficulty_stats[difficulty]['total'] += 1
            if evaluation['has_relevant_content']:
                difficulty_stats[difficulty]['successful'] += 1
            difficulty_stats[difficulty]['keyword_matches'] += evaluation['keyword_matches']
            difficulty_stats[difficulty]['total_keywords'] += evaluation['total_keywords']
            
            # Show poor results
            if evaluation['retrieval_score'] < 0.5:
                print(f"  ❌ LOW SCORE ({evaluation['retrieval_score']:.2f}): Only {evaluation['keyword_matches']}/{evaluation['total_keywords']} keywords found")
        
        # Store statistics
        self.category_stats = category_stats
        self.difficulty_stats = difficulty_stats
        self.overall_stats = {
            'total_cases': total_cases,
            'successful_retrievals': successful_retrievals,
            'total_keyword_matches': total_keyword_matches,
            'total_keywords': total_keywords
        }
    
    def calculate_metrics(self) -> Dict[str, float]:
        """Calculate retrieval metrics."""
        stats = self.overall_stats
        
        # Overall metrics
        retrieval_success_rate = stats['successful_retrievals'] / stats['total_cases']
        keyword_coverage = stats['total_keyword_matches'] / stats['total_keywords'] if stats['total_keywords'] > 0 else 0
        
        # Average retrieval score
        avg_retrieval_score = sum(result['evaluation']['retrieval_score'] for result in self.results) / len(self.results)
        
        # Document retrieval rate (how often we get any documents back)
        cases_with_docs = sum(1 for result in self.results if result['retrieved_doc_count'] > 0)
        doc_retrieval_rate = cases_with_docs / len(self.results)
        
        return {
            'retrieval_success_rate': retrieval_success_rate,
            'keyword_coverage': keyword_coverage,
            'avg_retrieval_score': avg_retrieval_score,
            'doc_retrieval_rate': doc_retrieval_rate
        }
    
    def print_results(self):
        """Print detailed test results."""
        print("\n" + "=" * 50)
        print("RAG RETRIEVAL TEST RESULTS")
        print("=" * 50)
        
        metrics = self.calculate_metrics()
        stats = self.overall_stats
        
        # Overall Performance
        print(f"\nOVERALL PERFORMANCE:")
        print(f"Total Test Cases:          {stats['total_cases']}")
        print(f"Successful Retrievals:     {stats['successful_retrievals']} ({metrics['retrieval_success_rate']:.1%})")
        print(f"Document Retrieval Rate:   {metrics['doc_retrieval_rate']:.1%}")
        print(f"Keyword Coverage:          {stats['total_keyword_matches']}/{stats['total_keywords']} ({metrics['keyword_coverage']:.1%})")
        print(f"Average Retrieval Score:   {metrics['avg_retrieval_score']:.3f}")
        
        # Performance by Category
        print(f"\nPERFORMANCE BY CATEGORY:")
        for category, cat_stats in self.category_stats.items():
            success_rate = cat_stats['successful'] / cat_stats['total']
            keyword_rate = cat_stats['keyword_matches'] / cat_stats['total_keywords'] if cat_stats['total_keywords'] > 0 else 0
            print(f"{category.replace('_', ' ').title():<25}: {success_rate:.1%} success, {keyword_rate:.1%} keywords ({cat_stats['total']} cases)")
        
        # Performance by Difficulty
        print(f"\nPERFORMANCE BY DIFFICULTY:")
        for difficulty, diff_stats in self.difficulty_stats.items():
            success_rate = diff_stats['successful'] / diff_stats['total']
            keyword_rate = diff_stats['keyword_matches'] / diff_stats['total_keywords'] if diff_stats['total_keywords'] > 0 else 0
            print(f"{difficulty.title():<10}: {success_rate:.1%} success, {keyword_rate:.1%} keywords ({diff_stats['total']} cases)")
        
        # Top 5 Worst Performing Cases
        print(f"\nWORST PERFORMING CASES:")
        sorted_results = sorted(self.results, key=lambda x: x['evaluation']['retrieval_score'])
        for i, result in enumerate(sorted_results[:5], 1):
            eval_data = result['evaluation']
            question = result['test_case']['question'][:60] + "..." if len(result['test_case']['question']) > 60 else result['test_case']['question']
            print(f"{i}. {question}")
            print(f"   Score: {eval_data['retrieval_score']:.3f} ({eval_data['keyword_matches']}/{eval_data['total_keywords']} keywords)")
            print(f"   Missing: {[kw for kw in result['test_case']['expected_keywords'] if kw not in eval_data['matched_keywords']]}")
        
        # Recommendations
        print(f"\nRECOMMENDATIONS:")
        if metrics['retrieval_success_rate'] < 0.7:
            print("- Consider lowering similarity threshold (currently 0.6)")
        if metrics['doc_retrieval_rate'] < 0.9:
            print("- Check if all PDFs are being processed correctly")
        if metrics['keyword_coverage'] < 0.6:
            print("- Review document chunking strategy - chunks may be too small")
            print("- Consider increasing chunk_size in text splitter")
        if metrics['avg_retrieval_score'] < 0.6:
            print("- Improve embedding quality by using better text preprocessing")
            print("- Consider using different embedding model")
        
        # Identify problematic categories
        weak_categories = [cat for cat, stats in self.category_stats.items() 
                          if stats['successful'] / stats['total'] < 0.6]
        if weak_categories:
            print(f"- Focus on improving these categories: {', '.join(weak_categories)}")
    
    def save_detailed_results(self, output_path: str = "test_results/rag_retrieval_results.json"):
        """Save detailed results to file."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        results_data = {
            'test_summary': {
                'overall_stats': self.overall_stats,
                'metrics': self.calculate_metrics(),
                'category_stats': self.category_stats,
                'difficulty_stats': self.difficulty_stats
            },
            'detailed_results': self.results
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(results_data, f, indent=2, ensure_ascii=False)
        
        print(f"\nDetailed results saved to: {output_path}")


def main():
    """Main function to run RAG retrieval tests."""
    # Check if test data file exists
    test_data_path = "test_data/rag_retrieval_test_data.json"
    if not os.path.exists(test_data_path):
        print(f"Error: Test data file '{test_data_path}' not found.")
        print("\nPlease create the test data file first:")
        print("1. Create 'test_data/rag_retrieval_test_data.json' with test cases")
        return
    
    # Check if PDFs directory exists
    if not os.path.exists("pdfs") or not os.listdir("pdfs"):
        print("Error: No PDFs found in 'pdfs' directory.")
        print("Please ensure your hotel PDFs are in the 'pdfs' folder.")
        return
    
    # Initialize and run tests
    tester = RAGRetrievalTester(test_data_path)
    tester.run_retrieval_tests()
    tester.print_results()
    tester.save_detailed_results()


if __name__ == "__main__":
    main()