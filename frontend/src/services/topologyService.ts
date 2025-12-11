import api from './api';

export interface TopologyNode {
  id: string;
  name: string;
  type: 'hub' | 'leaf' | 'services';
  users: number;
  channels?: number;
  uplink?: string;
  ulined: boolean;
  info?: string;
  online: boolean;
}

export interface TopologyLink {
  source: string;
  target: string;
  type: 'hub' | 'leaf' | 'services';
}

export interface TopologyStats {
  total_servers: number;
  total_users: number;
  total_channels: number;
  total_opers: number;
}

export interface TopologyResponse {
  nodes: TopologyNode[];
  links: TopologyLink[];
  stats: TopologyStats;
}

export interface ServerDetails {
  name: string;
  uplink?: string;
  num_users: number;
  server_info?: string;
  boot?: number;
  synced_since?: number;
  ulined: boolean;
  modules: string[];
  features?: Record<string, unknown>;
}

export const topologyService = {
  getTopology: async (): Promise<TopologyResponse> => {
    const response = await api.get<TopologyResponse>('/topology');
    return response.data;
  },

  getServerDetails: async (serverName: string): Promise<ServerDetails> => {
    const response = await api.get<ServerDetails>(`/topology/server/${encodeURIComponent(serverName)}`);
    return response.data;
  },
};

export default topologyService;
