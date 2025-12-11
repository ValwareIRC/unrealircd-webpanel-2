import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  FileText, 
  Download, 
  Play,
  Settings2,
  Calendar,
  Clock,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Button, Badge, LoadingSpinner } from '@/components/common';
import { reportService, ReportConfig, MetricInfo, ReportResult } from '@/services/reportService';

export function ReportBuilderPage() {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['users', 'channels']);
  const [timeRange, setTimeRange] = useState<ReportConfig['time_range']>('24h');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format] = useState<ReportConfig['format']>('json');
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [filters, setFilters] = useState<ReportConfig['filters']>({});

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['report-metrics'],
    queryFn: reportService.getMetrics,
  });

  const { data: presets } = useQuery({
    queryKey: ['report-presets'],
    queryFn: reportService.getPresets,
  });

  const generateMutation = useMutation({
    mutationFn: (config: ReportConfig) => reportService.generate(config),
    onSuccess: (data) => {
      setReportResult(data);
    },
  });

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId)
        ? prev.filter((id) => id !== metricId)
        : [...prev, metricId]
    );
  };

  const applyPreset = (preset: typeof presets extends (infer T)[] | undefined ? T : never) => {
    if (!preset) return;
    setSelectedMetrics(preset.config.metrics);
    setTimeRange(preset.config.time_range);
    if (preset.config.filters) {
      setFilters(preset.config.filters);
    }
  };

  const generateReport = () => {
    const config: ReportConfig = {
      name: 'Custom Report',
      metrics: selectedMetrics,
      time_range: timeRange,
      format,
      filters,
    };

    if (timeRange === 'custom') {
      config.start_date = startDate;
      config.end_date = endDate;
    }

    generateMutation.mutate(config);
  };

  const downloadReport = async (downloadFormat: 'csv' | 'html') => {
    const config: ReportConfig = {
      name: 'Custom Report',
      metrics: selectedMetrics,
      time_range: timeRange,
      format: downloadFormat,
      filters,
    };

    try {
      const blob = downloadFormat === 'csv'
        ? await reportService.downloadCSV(config)
        : await reportService.downloadHTML(config);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${new Date().toISOString().split('T')[0]}.${downloadFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-400" />
          Custom Report Builder
        </h1>
        <p className="text-gray-400 mt-1">
          Build custom reports with selected metrics and time ranges
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Presets */}
          {presets && presets.length > 0 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Quick Presets
              </h3>
              <div className="space-y-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="w-full text-left p-3 bg-gray-900/50 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <p className="text-sm font-medium text-white">{preset.name}</p>
                    <p className="text-xs text-gray-400">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Metrics Selection */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Select Metrics
            </h3>
            <div className="space-y-2">
              {metrics?.map((metric: MetricInfo) => (
                <button
                  key={metric.id}
                  onClick={() => toggleMetric(metric.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 ${
                    selectedMetrics.includes(metric.id)
                      ? 'bg-blue-600/20 border border-blue-500/50'
                      : 'bg-gray-900/50 hover:bg-gray-700'
                  }`}
                >
                  {selectedMetrics.includes(metric.id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{metric.name}</p>
                    <p className="text-xs text-gray-400">{metric.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Range
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: '1h', label: 'Last Hour' },
                { value: '24h', label: 'Last 24h' },
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value as ReportConfig['time_range'])}
                  className={`px-3 py-2 text-sm rounded-lg ${
                    timeRange === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setTimeRange('custom')}
              className={`w-full mt-2 px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 ${
                timeRange === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Custom Range
            </button>
            
            {timeRange === 'custom' && (
              <div className="mt-3 space-y-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300"
                />
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters (Optional)
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Server filter..."
                value={filters?.server_filter || ''}
                onChange={(e) => setFilters({ ...filters, server_filter: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300"
              />
              <input
                type="text"
                placeholder="User filter..."
                value={filters?.user_filter || ''}
                onChange={(e) => setFilters({ ...filters, user_filter: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300"
              />
              <input
                type="text"
                placeholder="Channel filter..."
                value={filters?.channel_filter || ''}
                onChange={(e) => setFilters({ ...filters, channel_filter: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={generateReport}
              disabled={selectedMetrics.length === 0 || generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => downloadReport('csv')}
                disabled={selectedMetrics.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="secondary"
                onClick={() => downloadReport('html')}
                disabled={selectedMetrics.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                HTML
              </Button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg border border-gray-700 min-h-[600px]">
            {!reportResult ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <Eye className="w-12 h-12 mb-4 text-gray-600" />
                <p>Select metrics and generate a report to see results</p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Report Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Report Results</h2>
                    <p className="text-sm text-gray-400">
                      Generated: {new Date(reportResult.generated_at).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={generateReport} size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {/* Summary */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(reportResult.summary).map(([key, value]) => {
                      if (typeof value === 'object') return null;
                      return (
                        <div key={key} className="bg-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="text-xl font-bold text-white">
                            {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Data Sections */}
                {Object.entries(reportResult.data).map(([section, data]) => (
                  <div key={section} className="bg-gray-900/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-3 capitalize flex items-center gap-2">
                      <Badge variant="info">{section}</Badge>
                    </h3>
                    <div className="overflow-x-auto">
                      <pre className="text-xs text-gray-400 bg-gray-800 p-3 rounded-lg overflow-auto max-h-64">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportBuilderPage;
