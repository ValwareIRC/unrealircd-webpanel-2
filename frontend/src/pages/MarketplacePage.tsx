import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PuzzlePieceIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ArrowPathIcon,
  StarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import marketplaceService, { MarketplacePlugin, InstalledPlugin } from '../services/marketplaceService';
import { Button, Badge, LoadingSpinner } from '@/components/common';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

const CATEGORY_COLORS: Record<string, string> = {
  security: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  integration: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  monitoring: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  management: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  utilities: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  appearance: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
};

const MarketplacePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation()
  
  const CATEGORY_LABELS: Record<string, string> = {
    all: t('marketplace.categories.all'),
    security: t('marketplace.categories.security'),
    integration: t('marketplace.categories.integration'),
    monitoring: t('marketplace.categories.monitoring'),
    management: t('marketplace.categories.management'),
    utilities: t('marketplace.categories.utilities'),
    appearance: t('marketplace.categories.appearance'),
  };
  const [activeTab, setActiveTab] = useState<'marketplace' | 'installed'>('marketplace');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: marketplaceData, isLoading: marketplaceLoading } = useQuery({
    queryKey: ['marketplace', selectedCategory, searchQuery],
    queryFn: () => marketplaceService.getMarketplacePlugins({
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      search: searchQuery || undefined,
    }),
    enabled: activeTab === 'marketplace',
  });

  const { data: installedPlugins, isLoading: installedLoading } = useQuery({
    queryKey: ['installedPlugins'],
    queryFn: () => marketplaceService.getInstalledPlugins(),
    enabled: activeTab === 'installed',
  });

  const installMutation = useMutation({
    mutationFn: (id: string) => marketplaceService.installPlugin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      queryClient.invalidateQueries({ queryKey: ['installedPlugins'] });
      queryClient.invalidateQueries({ queryKey: ['pluginNavItems'] });
      queryClient.invalidateQueries({ queryKey: ['pluginDashboardCards'] });
      queryClient.invalidateQueries({ queryKey: ['pluginFrontendAssets'] });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: (id: string) => marketplaceService.uninstallPlugin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      queryClient.invalidateQueries({ queryKey: ['installedPlugins'] });
      queryClient.invalidateQueries({ queryKey: ['pluginNavItems'] });
      queryClient.invalidateQueries({ queryKey: ['pluginDashboardCards'] });
      // Force immediate refetch so PluginLoader gets updated data right away
      queryClient.refetchQueries({ queryKey: ['pluginFrontendAssets'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      marketplaceService.togglePlugin(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installedPlugins'] });
      queryClient.invalidateQueries({ queryKey: ['pluginNavItems'] });
      queryClient.invalidateQueries({ queryKey: ['pluginDashboardCards'] });
      // Force immediate refetch so PluginLoader gets updated data right away
      queryClient.refetchQueries({ queryKey: ['pluginFrontendAssets'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => marketplaceService.updatePlugin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      queryClient.invalidateQueries({ queryKey: ['installedPlugins'] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => marketplaceService.refreshPluginCache(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<StarIconSolid key={i} className="w-4 h-4 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarIconSolid key={i} className="w-4 h-4 text-yellow-400/50" />);
      } else {
        stars.push(<StarIcon key={i} className="w-4 h-4 text-gray-300 dark:text-gray-600" />);
      }
    }
    return stars;
  };

  const PluginCard: React.FC<{ plugin: MarketplacePlugin }> = ({ plugin }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <PuzzlePieceIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{plugin.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('marketplace.byAuthor', { author: plugin.author })}</p>
            </div>
          </div>
          {plugin.installed && (
            <Badge variant="success">{t('marketplace.installed')}</Badge>
          )}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
          {plugin.description}
        </p>

        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1">
            {renderStars(plugin.rating)}
            <span className="ml-1 text-gray-500">{t('marketplace.rating', { count: plugin.rating_count })}</span>
          </div>
          <div className="text-gray-500">
            <ArrowDownTrayIcon className="w-4 h-4 inline mr-1" />
            {plugin.downloads.toLocaleString()}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${CATEGORY_COLORS[plugin.category] || 'bg-gray-100 text-gray-800'}`}>
            {CATEGORY_LABELS[plugin.category] || plugin.category}
          </span>
          {(plugin.tags || []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500">
            v{plugin.version} • {t('marketplace.updatedAgo', { time: formatDistanceToNow(new Date(plugin.last_updated)) })}
          </div>
          <div className="flex gap-2">
            {plugin.installed ? (
              <>
                {plugin.update_available && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateMutation.mutate(plugin.id)}
                    disabled={updateMutation.isPending}
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => uninstallMutation.mutate(plugin.id)}
                  disabled={uninstallMutation.isPending}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => installMutation.mutate(plugin.id)}
                disabled={installMutation.isPending}
              >
                {t('marketplace.install')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const InstalledPluginRow: React.FC<{ plugin: InstalledPlugin }> = ({ plugin }) => (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
          <PuzzlePieceIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 dark:text-white">{plugin.name}</h4>
            <span className="text-xs text-gray-500">{t('marketplace.version', { version: plugin.version })}</span>
            {plugin.update_available && (
              <Badge variant="warning">{t('marketplace.updateTo', { version: plugin.new_version })}</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('marketplace.byAuthor', { author: plugin.author })} • {t('marketplace.installedAgo', { time: formatDistanceToNow(new Date(plugin.installed_at)) })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => toggleMutation.mutate({ id: plugin.id, enabled: !plugin.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            plugin.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          disabled={toggleMutation.isPending}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              plugin.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>

        {plugin.update_available && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => updateMutation.mutate(plugin.id)}
            disabled={updateMutation.isPending}
          >
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            {t('marketplace.update')}
          </Button>
        )}

        <Button
          variant="danger"
          size="sm"
          onClick={() => uninstallMutation.mutate(plugin.id)}
          disabled={uninstallMutation.isPending}
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plugin Marketplace</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Discover and install plugins to extend your panel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <PuzzlePieceIcon className="w-8 h-8 text-indigo-500" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'marketplace'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {t('marketplace.tabs.browse')}
          </button>
          <button
            onClick={() => setActiveTab('installed')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'installed'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {t('marketplace.tabs.installed')}
            {installedPlugins && (
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                {installedPlugins.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {activeTab === 'marketplace' && (
        <>
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('marketplace.searchPlaceholder')}
                autoComplete="off"
                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedCategory === key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Plugin Grid */}
          {marketplaceLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : marketplaceData?.plugins && marketplaceData.plugins.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketplaceData.plugins.map((plugin) => (
                <PluginCard key={plugin.id} plugin={plugin} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <PuzzlePieceIcon className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">No plugins found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'installed' && (
        <>
          {installedLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : installedPlugins && installedPlugins.length > 0 ? (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {installedPlugins.filter((p) => p.enabled).length}
                      </p>
                      <p className="text-sm text-gray-500">{t('marketplace.activePlugins')}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                      <ArrowPathIcon className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {installedPlugins.filter((p) => p.update_available).length}
                      </p>
                      <p className="text-sm text-gray-500">{t('marketplace.updatesAvailable')}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {installedPlugins.filter((p) => !p.enabled).length}
                      </p>
                      <p className="text-sm text-gray-500">{t('marketplace.disabled')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plugin List */}
              <div className="space-y-3">
                {installedPlugins.map((plugin) => (
                  <InstalledPluginRow key={plugin.id} plugin={plugin} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <PuzzlePieceIcon className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">{t('marketplace.noPlugins')}</p>
              <p className="text-sm text-gray-400 mb-4">{t('marketplace.browseToFind')}</p>
              <Button variant="primary" onClick={() => setActiveTab('marketplace')}>
                {t('marketplace.tabs.browse')}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Success/Error Messages */}
      {(installMutation.isSuccess || uninstallMutation.isSuccess || updateMutation.isSuccess || toggleMutation.isSuccess) && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          ✓ Operation completed successfully
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
