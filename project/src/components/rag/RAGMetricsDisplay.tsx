import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Clock, Database, FileText, Settings, TrendingUp } from 'lucide-react';

interface RetrievalMetrics {
  id: string;
  query: string;
  retrieved_nodes: number;
  retrieved_edges: number;
  context_tokens: number;
  retrieval_time_ms: number;
  completeness_score: 'complete' | 'partial' | 'insufficient';
  similarity_threshold: number;
  max_results: number;
  response_length: number;
  created_at: string;
}

interface MetricsSummary {
  total_queries: number;
  avg_retrieval_time_ms: number;
  avg_context_tokens: number;
  completeness_distribution: Record<string, number>;
}

interface RAGMetricsDisplayProps {
  userId: string;
  visible?: boolean;
}

export function RAGMetricsDisplay({ userId, visible = false }: RAGMetricsDisplayProps) {
  const [metrics, setMetrics] = useState<RetrievalMetrics[]>([]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState('balanced');
  const [showDetails, setShowDetails] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/zep/metrics/${userId}?limit=20`);
      const data = await response.json();
      setMetrics(data.metrics || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Failed to fetch RAG metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && userId) {
      fetchMetrics();
    }
  }, [visible, userId]);

  const getCompletenessColor = (score: string) => {
    switch (score) {
      case 'complete': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'insufficient': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (!visible) return null;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">RAG Configuration</span>
          <Select value={config} onValueChange={setConfig}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimal">Minimal</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="comprehensive">Comprehensive</SelectItem>
              <SelectItem value="maximum">Maximum</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Hide' : 'Show'} Details
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Total Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_queries}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Avg Retrieval Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(summary.avg_retrieval_time_ms)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Avg Context Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(summary.avg_context_tokens)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Completeness Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.total_queries > 0 
                  ? `${Math.round((summary.completeness_distribution.complete || 0) / summary.total_queries * 100)}%`
                  : '0%'
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Completeness Distribution */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Completeness Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              {Object.entries(summary.completeness_distribution).map(([score, count]) => (
                <Badge key={score} className={getCompletenessColor(score)}>
                  {score}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics */}
      {showDetails && metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.map((metric) => (
                <div key={metric.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate flex-1 mr-2">
                      {metric.query}
                    </p>
                    <Badge className={getCompletenessColor(metric.completeness_score)}>
                      {metric.completeness_score}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <div>Nodes: {metric.retrieved_nodes}</div>
                    <div>Edges: {metric.retrieved_edges}</div>
                    <div>Tokens: {metric.context_tokens}</div>
                    <div>Time: {formatTime(metric.retrieval_time_ms)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Threshold: {metric.similarity_threshold}</div>
                    <div>Max Results: {metric.max_results}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
