import api from './api';

export interface MarketplacePlugin {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  category: string;
  downloads: number;
  rating: number;
  rating_count: number;
  tags: string[];
  repository?: string;
  license: string;
  installed: boolean;
  update_available?: boolean;
  last_updated: string;
}

export interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  author: string;
  description: string;
  installed_at: string;
  update_available: boolean;
  new_version?: string;
}

export interface PluginDetails {
  plugin: MarketplacePlugin;
  readme: string;
  changelog: {
    version: string;
    date: string;
    changes: string[];
  }[];
  screenshots: string[];
  requirements: {
    panel_version: string;
    php_version: string;
  };
}

export interface PluginNavItem {
  label: string;
  icon: string;
  path: string;
  order: number;
  plugin?: string;
  children?: PluginNavItem[];
}

export interface PluginDashboardCard {
  title: string;
  icon: string;
  content: unknown;
  order: number;
  size: string;
  plugin?: string;
}

export interface LoadedPlugin {
  handle: string;
  name: string;
  version: string;
  author: string;
  description: string;
  enabled: boolean;
  path: string;
}

export interface PluginHook {
  type: number;
  name: string;
  category: string;
  description: string;
}

class MarketplaceService {
  async getMarketplacePlugins(params?: { category?: string; search?: string }): Promise<{
    plugins: MarketplacePlugin[];
    total: number;
    categories: string[];
  }> {
    const response = await api.get('/plugins/marketplace', { params });
    return response.data;
  }

  async getInstalledPlugins(): Promise<InstalledPlugin[]> {
    const response = await api.get('/plugins/installed');
    return response.data;
  }

  async getPluginDetails(id: string): Promise<PluginDetails> {
    const response = await api.get(`/plugins/${id}`);
    return response.data;
  }

  async installPlugin(id: string): Promise<{ message: string }> {
    const response = await api.post(`/plugins/${id}/install`);
    return response.data;
  }

  async uninstallPlugin(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/plugins/${id}`);
    return response.data;
  }

  async togglePlugin(id: string, enabled: boolean): Promise<{ message: string; enabled: boolean }> {
    const response = await api.put(`/plugins/${id}/toggle`, { enabled });
    return response.data;
  }

  async updatePlugin(id: string): Promise<{ message: string }> {
    const response = await api.post(`/plugins/${id}/update`);
    return response.data;
  }

  async refreshPluginCache(): Promise<{ message: string; plugin_count: number }> {
    const response = await api.post('/plugins/refresh');
    return response.data;
  }

  async getLoadedPlugins(): Promise<LoadedPlugin[]> {
    const response = await api.get('/plugins/loaded');
    return response.data;
  }

  async getPluginNavItems(): Promise<PluginNavItem[]> {
    const response = await api.get('/plugins/nav-items');
    return response.data;
  }

  async getPluginDashboardCards(): Promise<PluginDashboardCard[]> {
    const response = await api.get('/plugins/dashboard-cards');
    return response.data;
  }

  async getAvailableHooks(): Promise<PluginHook[]> {
    const response = await api.get('/plugins/hooks');
    return response.data;
  }

  async enablePlugin(id: string): Promise<{ message: string }> {
    const response = await api.put(`/plugins/${id}/enable`);
    return response.data;
  }

  async disablePlugin(id: string): Promise<{ message: string }> {
    const response = await api.put(`/plugins/${id}/disable`);
    return response.data;
  }
}

export const marketplaceService = new MarketplaceService();
export default marketplaceService;
