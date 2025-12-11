import api from './api';

export interface DigestSettings {
  id: number;
  user_id: number;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week: number;
  time_of_day: string;
  include_stats: boolean;
  include_alerts: boolean;
  include_logs: boolean;
  include_users: boolean;
  include_channels: boolean;
  email_address: string;
  last_sent_at?: string;
}

export interface DigestPreview {
  period: string;
  start_date: string;
  end_date: string;
  stats: {
    total_users: number;
    user_change: number;
    user_change_percent: number;
    total_channels: number;
    channel_change: number;
    total_messages: number;
    peak_users: number;
    peak_time: string;
    uptime: string;
  };
  highlights: string[];
  alerts: {
    type: string;
    message: string;
    severity: string;
    timestamp: string;
  }[];
  top_channels: {
    name: string;
    users: number;
    topic: string;
    activity: number;
  }[];
  user_activity: {
    new_users: number;
    active_opers: number;
    bans_issued: number;
    kicks_issued: number;
  };
}

export interface DigestHistory {
  id: number;
  user_id: number;
  period: string;
  start_date: string;
  end_date: string;
  sent_at: string;
  status: string;
  error?: string;
}

class DigestService {
  async getSettings(): Promise<DigestSettings> {
    const response = await api.get('/digest/settings');
    return response.data;
  }

  async updateSettings(settings: Partial<DigestSettings>): Promise<DigestSettings> {
    const response = await api.put('/digest/settings', settings);
    return response.data;
  }

  async getPreview(period: string = 'weekly'): Promise<DigestPreview> {
    const response = await api.get('/digest/preview', { params: { period } });
    return response.data;
  }

  async sendTestDigest(email: string): Promise<{ message: string; note: string }> {
    const response = await api.post('/digest/test', { email });
    return response.data;
  }

  async getHistory(): Promise<DigestHistory[]> {
    const response = await api.get('/digest/history');
    return response.data;
  }
}

export const digestService = new DigestService();
export default digestService;
