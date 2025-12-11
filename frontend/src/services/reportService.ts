import api from './api';

export interface MetricInfo {
  id: string;
  name: string;
  description: string;
  fields: string[];
}

export interface ReportFilters {
  server_filter?: string;
  user_filter?: string;
  channel_filter?: string;
  min_users?: number;
}

export interface ReportConfig {
  name: string;
  metrics: string[];
  time_range: '1h' | '24h' | '7d' | '30d' | 'custom';
  start_date?: string;
  end_date?: string;
  filters?: ReportFilters;
  format: 'json' | 'csv' | 'html';
  group_by?: 'hour' | 'day' | 'server';
}

export interface ReportResult {
  generated_at: string;
  config: ReportConfig;
  data: Record<string, unknown>;
  summary: Record<string, unknown>;
}

export interface SavedReport {
  id: string;
  name: string;
  description: string;
  config: ReportConfig;
}

export const reportService = {
  getMetrics: async (): Promise<MetricInfo[]> => {
    const response = await api.get<MetricInfo[]>('/reports/metrics');
    return response.data;
  },

  getPresets: async (): Promise<SavedReport[]> => {
    const response = await api.get<SavedReport[]>('/reports/presets');
    return response.data;
  },

  getPreview: async (metric: string): Promise<{ metric: string; preview: unknown }> => {
    const response = await api.get<{ metric: string; preview: unknown }>(`/reports/preview?metric=${metric}`);
    return response.data;
  },

  generate: async (config: ReportConfig): Promise<ReportResult> => {
    const response = await api.post<ReportResult>('/reports/generate', config);
    return response.data;
  },

  downloadCSV: async (config: ReportConfig): Promise<Blob> => {
    const response = await api.post('/reports/generate', { ...config, format: 'csv' }, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadHTML: async (config: ReportConfig): Promise<Blob> => {
    const response = await api.post('/reports/generate', { ...config, format: 'html' }, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default reportService;
