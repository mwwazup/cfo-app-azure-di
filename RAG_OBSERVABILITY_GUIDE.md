# RAG Observability Implementation Guide

## Overview
Added comprehensive observability to your RAG system without requiring Zep's paid plan. This implementation tracks retrieval performance, evaluates context completeness, and provides tools to optimize your context window.

## Features Implemented

### 1. Database Storage
- **Table**: `rag_retrieval_metrics`
- **Tracks**: Query metrics, retrieval time, context tokens, completeness scores
- **Location**: `backend/migrations/20250112_add_rag_metrics_table.sql`

### 2. Retrieval Metrics Tracking
- **Nodes/Edges Count**: Estimates based on context length
- **Context Tokens**: Calculated using tiktoken
- **Retrieval Time**: Milliseconds from request start
- **Completeness Score**: Evaluates if context was sufficient (complete/partial/insufficient)

### 3. Parameter Testing Configurations
Four pre-configured retrieval settings:
- **Minimal**: High precision (0.9 threshold, 5 results)
- **Balanced**: Default (0.8 threshold, 10 results)
- **Comprehensive**: High recall (0.7 threshold, 15 results)
- **Maximum**: Most context (0.6 threshold, 20 results)

### 4. API Endpoints
- `GET /api/zep/context/{user_id}?config={config}` - Get context with metrics
- `GET /api/zep/metrics/{user_id}` - Retrieve stored metrics
- `GET /api/zep/configs` - List available configurations

### 5. Frontend Display
- **Component**: `RAGMetricsDisplay.tsx`
- **Features**: Real-time metrics, historical data, completeness tracking
- **Usage**: Add to any page that uses RAG queries

## Usage Instructions

### 1. Run the Migration
```sql
-- Run in Supabase SQL editor
-- File: backend/migrations/20250112_add_rag_metrics_table.sql
```

### 2. Test Different Configurations
```javascript
// In your RAG query, specify config:
const response = await fetch(`/api/zep/context/${userId}?config=comprehensive`);
```

### 3. View Metrics in Console
Metrics are automatically logged:
```
📊 RAG Metrics for user_123:
  Nodes: 12, Edges: 5
  Context tokens: 1250
  Retrieval time: 245ms
  Completeness: complete
  Parameters: threshold=0.8, max_results=10
```

### 4. Add Metrics Display to UI
```tsx
import { RAGMetricsDisplay } from '@/components/rag/RAGMetricsDisplay';

// In your component:
<RAGMetricsDisplay userId={userId} visible={showMetrics} />
```

## Optimizing Your Context Window

### 1. Monitor Completeness Scores
- **High 'insufficient' scores**: Increase max_results or lower threshold
- **High 'complete' scores with high tokens**: Consider reducing context size
- **Slow retrieval times**: Lower max_results or increase threshold

### 2. Test Different Configurations
```bash
# Test each config with the same query:
curl "http://localhost:8000/api/zep/context/user_123?config=minimal"
curl "http://localhost:8000/api/zep/context/user_123?config=balanced"
curl "http://localhost:8000/api/zep/context/user_123?config=comprehensive"
curl "http://localhost:8000/api/zep/context/user_123?config=maximum"
```

### 3. Analyze Metrics Over Time
```sql
-- Query your metrics directly:
SELECT 
  completeness_score,
  COUNT(*) as count,
  AVG(retrieval_time_ms) as avg_time,
  AVG(context_tokens) as avg_tokens
FROM rag_retrieval_metrics 
WHERE user_id = 'your_user_id'
GROUP BY completeness_score;
```

## Understanding the Metrics

### Retrieval Time
- **< 100ms**: Excellent
- **100-300ms**: Good
- **300-500ms**: Acceptable
- **> 500ms**: Needs optimization

### Context Tokens
- **< 500**: May be insufficient
- **500-2000**: Good balance
- **2000-4000**: Comprehensive
- **> 4000**: May be excessive (cost/latency)

### Completeness Score
- **Complete**: Context had all necessary information
- **Partial**: Some information missing, partial answers
- **Insufficient**: Could not answer the query properly

## Advanced Usage

### Custom Configuration
Add your own config in `ragMetricsService.py`:
```python
RETRIEVAL_CONFIGS['custom'] = {
    'similarity_threshold': 0.75,
    'max_results': 12,
    'description': 'My custom configuration'
}
```

### Export Metrics for Analysis
```python
# Add to zep.py endpoint
@router.get("/metrics/{user_id}/export")
async def export_metrics(user_id: str):
    # Export as CSV for analysis
    pass
```

## Benefits

1. **No Additional Cost**: All tracking done in your database
2. **Real-time Monitoring**: See performance as users query
3. **Optimization Insights**: Data-driven decisions on context size
4. **Debugging Aid**: Track down problematic queries
5. **Performance Tracking**: Monitor improvements over time

## Next Steps

1. Run migration in production
2. Add metrics display to PERL Coach page
3. Monitor for 1-2 weeks to gather baseline data
4. Analyze and optimize based on findings
5. Consider automated config selection based on query type
