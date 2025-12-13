"""
RAG Metrics Service - Track and analyze retrieval performance
"""
import tiktoken
from typing import Dict, Any, List, Optional
from datetime import datetime
from logging_config import get_logger
import json

logger = get_logger(__name__)

def calculate_tokens(text: str) -> int:
    """Calculate approximate token count for text"""
    try:
        encoding = tiktoken.encoding_for_model("gpt-4")
        return len(encoding.encode(text))
    except:
        # Fallback: rough estimate (1 token ≈ 4 characters)
        return len(text) // 4

def evaluate_context_completeness(query: str, context: str, response: str) -> str:
    """
    Evaluate if retrieved context was sufficient for the query
    
    Returns: 'complete', 'partial', or 'insufficient'
    """
    # Simple heuristic-based evaluation
    query_lower = query.lower()
    context_lower = context.lower()
    response_lower = response.lower()
    
    # Check for specific data requests
    data_indicators = [
        'how much', 'what was', 'revenue', 'profit', 'cost', 'percentage',
        'number of', 'total', 'average', 'compare', 'vs', 'versus'
    ]
    
    has_data_request = any(indicator in query_lower for indicator in data_indicators)
    
    # Check if response contains specific numbers/data
    has_numbers = any(char.isdigit() for char in response)
    
    # Check for "I don't know" or similar phrases
    insufficient_phrases = [
        "i don't know", "not enough information", "insufficient data",
        "cannot determine", "unable to", "no information", "unclear"
    ]
    
    has_insufficient = any(phrase in response_lower for phrase in insufficient_phrases)
    
    # Decision logic
    if has_insufficient:
        return 'insufficient'
    elif has_data_request and not has_numbers:
        return 'partial'
    elif len(context) < 100:  # Very short context
        return 'insufficient'
    elif len(response) < 50:  # Very short response
        return 'partial'
    else:
        return 'complete'

class RetrievalMetrics:
    """Track metrics for a single retrieval operation"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.start_time = datetime.now()
        self.metrics = {
            'query': '',
            'retrieved_nodes': 0,
            'retrieved_edges': 0,
            'context_tokens': 0,
            'retrieval_time_ms': 0,
            'completeness_score': 'insufficient',
            'similarity_threshold': 0.8,
            'max_results': 10,
            'response_length': 0
        }
    
    def set_query(self, query: str):
        """Set the query text"""
        self.metrics['query'] = query
    
    def set_retrieval_results(self, nodes: List, edges: List, context: str):
        """Set retrieval metrics"""
        self.metrics['retrieved_nodes'] = len(nodes)
        self.metrics['retrieved_edges'] = len(edges)
        self.metrics['context_tokens'] = calculate_tokens(context)
    
    def set_timing(self, retrieval_time_ms: int):
        """Set retrieval timing"""
        self.metrics['retrieval_time_ms'] = retrieval_time_ms
    
    def set_parameters(self, similarity_threshold: float, max_results: int):
        """Set retrieval parameters"""
        self.metrics['similarity_threshold'] = similarity_threshold
        self.metrics['max_results'] = max_results
    
    def evaluate_response(self, response: str):
        """Evaluate response completeness"""
        self.metrics['response_length'] = len(response)
        self.metrics['completeness_score'] = evaluate_context_completeness(
            self.metrics['query'],
            '',  # context would be passed if available
            response
        )
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all metrics"""
        return self.metrics.copy()
    
    def log_metrics(self):
        """Log metrics to console"""
        logger.info(f"📊 RAG Metrics for {self.user_id}:")
        logger.info(f"  Nodes: {self.metrics['retrieved_nodes']}, Edges: {self.metrics['retrieved_edges']}")
        logger.info(f"  Context tokens: {self.metrics['context_tokens']}")
        logger.info(f"  Retrieval time: {self.metrics['retrieval_time_ms']}ms")
        logger.info(f"  Completeness: {self.metrics['completeness_score']}")
        logger.info(f"  Parameters: threshold={self.metrics['similarity_threshold']}, max_results={self.metrics['max_results']}")

# Parameter testing configurations
RETRIEVAL_CONFIGS = {
    'minimal': {
        'similarity_threshold': 0.9,
        'max_results': 5,
        'description': 'High precision, low recall'
    },
    'balanced': {
        'similarity_threshold': 0.8,
        'max_results': 10,
        'description': 'Default configuration'
    },
    'comprehensive': {
        'similarity_threshold': 0.7,
        'max_results': 15,
        'description': 'High recall, more context'
    },
    'maximum': {
        'similarity_threshold': 0.6,
        'max_results': 20,
        'description': 'Maximum context'
    }
}

def get_config(config_name: str) -> Dict[str, Any]:
    """Get retrieval configuration by name"""
    return RETRIEVAL_CONFIGS.get(config_name, RETRIEVAL_CONFIGS['balanced'])

def list_configs() -> List[Dict[str, Any]]:
    """List all available configurations"""
    return [
        {
            'name': name,
            **config
        }
        for name, config in RETRIEVAL_CONFIGS.items()
    ]
