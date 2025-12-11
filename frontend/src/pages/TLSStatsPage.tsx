import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Lock, 
  LockOpen, 
  Shield,
  RefreshCw,
  Key,
  Users,
  Server,
  ChevronDown,
  ChevronRight,
  Search,
  Copy,
  CheckCircle
} from 'lucide-react';
import { Button, Badge, LoadingSpinner, Input } from '@/components/common';
import { tlsService, TLSUserInfo, CertFPGroup } from '@/services/tlsService';
import { Link } from 'react-router-dom';

export function TLSStatsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'fingerprints' | 'ciphers'>('overview');
  const [userFilter, setUserFilter] = useState<'all' | 'tls' | 'plain'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFP, setExpandedFP] = useState<string | null>(null);
  const [copiedFP, setCopiedFP] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['tls-stats'],
    queryFn: tlsService.getStats,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['tls-users', userFilter],
    queryFn: () => tlsService.getUsers({
      tlsOnly: userFilter === 'tls',
      plainOnly: userFilter === 'plain',
    }),
    enabled: activeTab === 'users',
  });

  const { data: fingerprints, isLoading: fpLoading } = useQuery({
    queryKey: ['tls-fingerprints'],
    queryFn: tlsService.getFingerprints,
    enabled: activeTab === 'fingerprints',
  });

  const { data: ciphers, isLoading: ciphersLoading } = useQuery({
    queryKey: ['tls-ciphers'],
    queryFn: tlsService.getCiphers,
    enabled: activeTab === 'ciphers',
  });

  const copyFingerprint = async (fp: string) => {
    await navigator.clipboard.writeText(fp);
    setCopiedFP(fp);
    setTimeout(() => setCopiedFP(null), 2000);
  };

  const filteredUsers = users?.filter((user: TLSUserInfo) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.nick.toLowerCase().includes(term) ||
      user.hostname.toLowerCase().includes(term) ||
      user.certfp?.toLowerCase().includes(term)
    );
  });

  if (statsLoading) {
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
            <Shield className="w-6 h-6 text-green-400" />
            TLS/SSL Statistics
          </h1>
          <p className="text-gray-400 mt-1">
            Monitor secure connections and certificate usage
          </p>
        </div>
        <Button variant="secondary" onClick={() => refetchStats()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.total_users}</p>
                <p className="text-sm text-gray-400">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.tls_users}</p>
                <p className="text-sm text-gray-400">TLS Users ({stats.tls_percentage.toFixed(1)}%)</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <LockOpen className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-yellow-400">{stats.plain_users}</p>
                <p className="text-sm text-gray-400">Plain Text</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <Key className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-purple-400">{stats.unique_fingerprints}</p>
                <p className="text-sm text-gray-400">Unique Certificates</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TLS Percentage Bar */}
      {stats && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">TLS Adoption Rate</span>
            <span className="text-sm text-green-400">{stats.tls_percentage.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{ width: `${stats.tls_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'users', label: 'Users' },
          { id: 'fingerprints', label: 'Fingerprints' },
          { id: 'ciphers', label: 'Ciphers' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-blue-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Cipher Usage</h3>
            {Object.keys(stats.cipher_usage).length === 0 ? (
              <p className="text-gray-400">No TLS connections detected</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.cipher_usage)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cipher, count]) => (
                    <div key={cipher} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-300 font-mono">{cipher}</span>
                          <span className="text-sm text-gray-400">{count} users</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500"
                            style={{ width: `${(count / stats.tls_users) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="p-4 border-b border-gray-700 flex items-center gap-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex rounded-lg overflow-hidden border border-gray-700">
                {['all', 'tls', 'plain'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setUserFilter(filter as typeof userFilter)}
                    className={`px-3 py-1.5 text-sm ${
                      userFilter === filter
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {filter === 'all' ? 'All' : filter === 'tls' ? 'TLS Only' : 'Plain Only'}
                  </button>
                ))}
              </div>
            </div>
            
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="divide-y divide-gray-700 max-h-[500px] overflow-y-auto">
                {filteredUsers?.map((user: TLSUserInfo) => (
                  <div key={user.nick} className="p-4 hover:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {user.has_tls ? (
                          <Lock className="w-5 h-5 text-green-400" />
                        ) : (
                          <LockOpen className="w-5 h-5 text-yellow-400" />
                        )}
                        <div>
                          <Link 
                            to={`/users/${encodeURIComponent(user.nick)}`}
                            className="font-medium text-white hover:text-blue-400"
                          >
                            {user.nick}
                          </Link>
                          <p className="text-sm text-gray-400">
                            {user.ident}@{user.hostname}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {user.server && (
                          <Badge variant="secondary">
                            <Server className="w-3 h-3 mr-1" />
                            {user.server}
                          </Badge>
                        )}
                        {user.has_tls ? (
                          <Badge variant="success">TLS</Badge>
                        ) : (
                          <Badge variant="warning">Plain</Badge>
                        )}
                      </div>
                    </div>
                    {user.has_tls && (
                      <div className="mt-2 pl-8 text-sm">
                        {user.cipher && (
                          <p className="text-gray-400">
                            Cipher: <span className="text-gray-300 font-mono">{user.cipher}</span>
                          </p>
                        )}
                        {user.certfp && (
                          <p className="text-gray-400">
                            Fingerprint: <span className="text-gray-300 font-mono text-xs">{user.certfp}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {filteredUsers?.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    No users found
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fingerprints Tab */}
        {activeTab === 'fingerprints' && (
          <div>
            {fpLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : fingerprints?.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No certificate fingerprints found
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {fingerprints?.map((group: CertFPGroup) => (
                  <div key={group.fingerprint}>
                    <button
                      onClick={() => setExpandedFP(expandedFP === group.fingerprint ? null : group.fingerprint)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-700/50"
                    >
                      <div className="flex items-center gap-3">
                        {expandedFP === group.fingerprint ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                        <Key className="w-5 h-5 text-purple-400" />
                        <span className="font-mono text-sm text-gray-300">
                          {group.fingerprint.slice(0, 20)}...{group.fingerprint.slice(-10)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyFingerprint(group.fingerprint);
                          }}
                          className="p-1 hover:bg-gray-600 rounded"
                        >
                          {copiedFP === group.fingerprint ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <Badge variant="info">{group.count} user{group.count !== 1 ? 's' : ''}</Badge>
                      </div>
                    </button>
                    {expandedFP === group.fingerprint && (
                      <div className="px-4 pb-4 pl-12 space-y-2">
                        <p className="text-xs text-gray-500 font-mono break-all mb-3">
                          Full fingerprint: {group.fingerprint}
                        </p>
                        {group.users.map((user: TLSUserInfo) => (
                          <div key={user.nick} className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-gray-400" />
                            <Link 
                              to={`/users/${encodeURIComponent(user.nick)}`}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              {user.nick}
                            </Link>
                            <span className="text-gray-500">({user.hostname})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ciphers Tab */}
        {activeTab === 'ciphers' && (
          <div className="p-6">
            {ciphersLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : ciphers?.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No cipher data available
              </div>
            ) : (
              <div className="space-y-4">
                {ciphers?.map((cipher) => (
                  <div key={cipher.cipher} className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm text-gray-300">{cipher.cipher}</span>
                      <Badge variant="info">{cipher.count} user{cipher.count !== 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${(cipher.count / (stats?.tls_users || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TLSStatsPage;
