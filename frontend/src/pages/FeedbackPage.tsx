import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  TrendingUp,
  MoreHorizontal,
  Plus,
  ThumbsUp,
  Send,
  X,
  Check,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button, Badge, LoadingSpinner, Input } from '@/components/common';
import { feedbackService, Feedback, CreateFeedbackRequest } from '@/services/feedbackService';
import { formatDistanceToNow } from 'date-fns';

const typeIcons: Record<string, React.ReactNode> = {
  bug: <Bug className="w-4 h-4" />,
  feature: <Lightbulb className="w-4 h-4" />,
  improvement: <TrendingUp className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  bug: 'text-red-400',
  feature: 'text-blue-400',
  improvement: 'text-green-400',
  other: 'text-gray-400',
};

const priorityColors: Record<string, 'error' | 'warning' | 'info' | 'secondary'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'secondary',
};

const statusColors: Record<string, 'success' | 'warning' | 'info' | 'secondary' | 'error'> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'secondary',
  wont_fix: 'error',
};

export function FeedbackPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [newComment, setNewComment] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: feedbackList, isLoading } = useQuery({
    queryKey: ['feedback', filterType, filterStatus],
    queryFn: () => feedbackService.getAll({ type: filterType || undefined, status: filterStatus || undefined }),
  });

  const { data: stats } = useQuery({
    queryKey: ['feedback-stats'],
    queryFn: feedbackService.getStats,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateFeedbackRequest) => feedbackService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-stats'] });
      setShowCreateModal(false);
    },
  });

  const voteMutation = useMutation({
    mutationFn: (id: number) => feedbackService.vote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => 
      feedbackService.addComment(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      setNewComment('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      feedbackService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-stats'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            Feedback Portal
          </h1>
          <p className="text-gray-400 mt-1">
            Submit and track feature requests, bug reports, and improvements
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Submit Feedback
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-2xl font-bold text-white">{stats.total_count}</p>
            <p className="text-sm text-gray-400">Total Items</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-2xl font-bold text-blue-400">{stats.open_count}</p>
            <p className="text-sm text-gray-400">Open</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-2xl font-bold text-green-400">{stats.resolved_count}</p>
            <p className="text-sm text-gray-400">Resolved</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-2xl font-bold text-purple-400">
              {stats.by_type?.feature || 0}
            </p>
            <p className="text-sm text-gray-400">Feature Requests</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300"
          >
            <option value="">All Types</option>
            <option value="bug">Bug Reports</option>
            <option value="feature">Feature Requests</option>
            <option value="improvement">Improvements</option>
            <option value="other">Other</option>
          </select>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {feedbackList?.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No feedback items yet</p>
            <Button onClick={() => setShowCreateModal(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Be the first to submit feedback
            </Button>
          </div>
        ) : (
          feedbackList?.map((item: Feedback) => (
            <div key={item.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => voteMutation.mutate(item.id)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <ThumbsUp className={`w-5 h-5 ${item.votes > 0 ? 'text-blue-400' : 'text-gray-500'}`} />
                      <span className="text-sm font-medium text-gray-300">{item.votes}</span>
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={typeColors[item.type]}>
                          {typeIcons[item.type]}
                        </span>
                        <h3 className="font-medium text-white">{item.title}</h3>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant={statusColors[item.status]}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant={priorityColors[item.priority]}>
                          {item.priority}
                        </Badge>
                        {item.category && (
                          <Badge variant="secondary">{item.category}</Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          by {item.user?.username || 'Unknown'} • {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg"
                  >
                    {expandedId === item.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              {/* Expanded Content */}
              {expandedId === item.id && (
                <div className="border-t border-gray-700 p-4 space-y-4">
                  {/* Full description */}
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{item.description}</p>
                  </div>
                  
                  {/* Status Actions */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Change status:</span>
                    {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => statusMutation.mutate({ id: item.id, status })}
                        disabled={item.status === status}
                        className={`px-2 py-1 text-xs rounded ${
                          item.status === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                  
                  {/* Comments */}
                  {item.comments && item.comments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-400">Comments</h4>
                      {item.comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-900/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-300">
                              {comment.user?.username || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Comment */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newComment.trim()) {
                          commentMutation.mutate({ id: item.id, content: newComment.trim() });
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        if (newComment.trim()) {
                          commentMutation.mutate({ id: item.id, content: newComment.trim() });
                        }
                      }}
                      disabled={!newComment.trim() || commentMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateFeedbackModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateFeedbackModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (data: CreateFeedbackRequest) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CreateFeedbackRequest>({
    type: 'feature',
    title: '',
    description: '',
    priority: 'medium',
    category: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Submit Feedback</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as CreateFeedbackRequest['type'] })}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300"
            >
              <option value="bug">🐛 Bug Report</option>
              <option value="feature">💡 Feature Request</option>
              <option value="improvement">📈 Improvement</option>
              <option value="other">📝 Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief summary..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description..."
              rows={4}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as CreateFeedbackRequest['priority'] })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300"
              >
                <option value="">Select...</option>
                <option value="ui">User Interface</option>
                <option value="performance">Performance</option>
                <option value="security">Security</option>
                <option value="functionality">Functionality</option>
                <option value="documentation">Documentation</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title || !formData.description}>
              {isLoading ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4 mr-2" />}
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FeedbackPage;
