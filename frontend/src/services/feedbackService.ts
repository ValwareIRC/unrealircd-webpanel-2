import api from './api';

export interface FeedbackUser {
  id: number;
  username: string;
}

export interface FeedbackComment {
  id: number;
  created_at: string;
  feedback_id: number;
  user_id: number;
  user?: FeedbackUser;
  content: string;
}

export interface Feedback {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  user?: FeedbackUser;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
  votes: number;
  resolved_at?: string;
  comments?: FeedbackComment[];
}

export interface FeedbackStats {
  total_count: number;
  open_count: number;
  resolved_count: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface CreateFeedbackRequest {
  type: 'bug' | 'feature' | 'improvement' | 'other';
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
}

export const feedbackService = {
  getAll: async (options?: { type?: string; status?: string }): Promise<Feedback[]> => {
    const params = new URLSearchParams();
    if (options?.type) params.set('type', options.type);
    if (options?.status) params.set('status', options.status);
    
    const response = await api.get<Feedback[]>(`/feedback?${params.toString()}`);
    return response.data;
  },

  getById: async (id: number): Promise<Feedback> => {
    const response = await api.get<Feedback>(`/feedback/${id}`);
    return response.data;
  },

  create: async (data: CreateFeedbackRequest): Promise<Feedback> => {
    const response = await api.post<Feedback>('/feedback', data);
    return response.data;
  },

  updateStatus: async (id: number, status: string): Promise<Feedback> => {
    const response = await api.put<Feedback>(`/feedback/${id}/status`, { status });
    return response.data;
  },

  addComment: async (id: number, content: string): Promise<FeedbackComment> => {
    const response = await api.post<FeedbackComment>(`/feedback/${id}/comments`, { content });
    return response.data;
  },

  vote: async (id: number): Promise<{ voted: boolean; message: string }> => {
    const response = await api.post<{ voted: boolean; message: string }>(`/feedback/${id}/vote`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/feedback/${id}`);
  },

  getStats: async (): Promise<FeedbackStats> => {
    const response = await api.get<FeedbackStats>('/feedback/stats');
    return response.data;
  },
};

export default feedbackService;
