import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../../contexts/auth-context';
import { useMomentum } from '../../hooks/useMomentum';
import { 
  Calendar, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  BookOpen,
  Filter,
  Download,
  TrendingUp,
  Clock,
  CheckCircle,
  FileText
} from 'lucide-react';


interface MonthlyJournal {
  month: string;
  entries: MomentumEntry[];
  completionPercentage: number;
  isDraft: boolean;
  lastUpdated: string;
}

interface MomentumHistoryProps {
  onEditMonth?: (month: Date) => void;
}

export function MomentumHistory({ onEditMonth }: MomentumHistoryProps) {
  const { user } = useAuth();
  const { entriesByMonth, loading, refreshEntries } = useMomentum();
  const [journals, setJournals] = useState<MonthlyJournal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'draft'>('all');

  useEffect(() => {
    // Convert entriesByMonth to journals format
    const allJournals: MonthlyJournal[] = Object.entries(entriesByMonth).map(([month, entries]) => {
      const completedEntries = entries.filter(e => e.content.trim().length > 0);
      const completionPercentage = entries.length > 0 ? Math.round((completedEntries.length / entries.length) * 100) : 0;
      const isDraft = entries.some(e => e.is_draft);
      const lastUpdated = entries.reduce((latest, entry) => 
        entry.updated_at > latest ? entry.updated_at : latest, entries[0]?.updated_at || ''
      );
      
      return {
        month,
        entries,
        completionPercentage,
        isDraft,
        lastUpdated
      };
    });
    
    // Sort by month descending
    allJournals.sort((a, b) => b.month.localeCompare(a.month));
    setJournals(allJournals);
  }, [entriesByMonth]);

  const filteredJournals = journals.filter(journal => {
    const matchesSearch = searchTerm === '' || 
      journal.entries.some(entry => 
        entry.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'completed' && !journal.isDraft && journal.completionPercentage === 100) ||
      (filterStatus === 'draft' && (journal.isDraft || journal.completionPercentage < 100));
    
    return matchesSearch && matchesFilter;
  });

  const deleteJournal = async (month: string) => {
    if (!user?.id) return;
    
    if (window.confirm(`Are you sure you want to delete the journal for ${formatMonth(month)}?`)) {
      // Delete all entries for this month
      const monthEntries = entriesByMonth[month] || [];
      // Note: You'd need to add a deleteEntry function to useMomentum hook
      // For now, we'll refresh the data
      refreshEntries();
    }
  };

  const exportJournal = (journal: MonthlyJournal) => {
    const content = journal.entries
      .filter(entry => entry.content.trim().length > 0)
      .map(entry => `${entry.section.toUpperCase()}\n${entry.content}\n`)
      .join('\n---\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `momentum-journal-${journal.month}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getStatusBadge = (journal: MonthlyJournal) => {
    if (journal.completionPercentage === 100 && !journal.isDraft) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          Complete
        </span>
      );
    } else if (journal.completionPercentage > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3" />
          In Progress ({journal.completionPercentage}%)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
          <FileText className="h-3 w-3" />
          Not Started
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-muted">Loading your journal history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Journal History</h2>
          <p className="text-muted">Review and manage your monthly momentum entries</p>
        </div>
        <div className="text-sm text-muted">
          {journals.length} journal{journals.length !== 1 ? 's' : ''} total
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
                <Input
                  placeholder="Search journal entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-input border border-border rounded-lg text-foreground"
              >
                <option value="all">All Journals</option>
                <option value="completed">Completed</option>
                <option value="draft">In Progress</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journal List */}
      {filteredJournals.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm || filterStatus !== 'all' ? 'No matching journals found' : 'No journals yet'}
              </h3>
              <p className="text-muted">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start your first monthly journal to track your business momentum.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJournals.map((journal) => (
            <Card key={journal.month} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {formatMonth(journal.month)}
                  </CardTitle>
                  {getStatusBadge(journal)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Completion</span>
                    <span className="font-medium text-foreground">{journal.completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${journal.completionPercentage}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-xs text-muted">
                  Last updated: {new Date(journal.lastUpdated).toLocaleDateString()}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditMonth?.(new Date(journal.month + '-01'))}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => exportJournal(journal)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteJournal(journal.month)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {journals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Journal Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {journals.length}
                </div>
                <div className="text-sm text-muted">Total Journals</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {journals.filter(j => j.completionPercentage === 100 && !j.isDraft).length}
                </div>
                <div className="text-sm text-muted">Completed</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {journals.filter(j => j.completionPercentage > 0 && j.completionPercentage < 100).length}
                </div>
                <div className="text-sm text-muted">In Progress</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">
                  {Math.round(journals.reduce((sum, j) => sum + j.completionPercentage, 0) / journals.length)}%
                </div>
                <div className="text-sm text-muted">Avg Completion</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}