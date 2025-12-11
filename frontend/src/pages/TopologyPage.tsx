import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Server, 
  Network, 
  Users, 
  Hash, 
  Shield, 
  RefreshCw,
  Info,
  ExternalLink,
  Cpu,
  Clock
} from 'lucide-react';
import { Button, Badge, LoadingSpinner, Input } from '@/components/common';
import { topologyService, TopologyNode } from '@/services/topologyService';

interface NodePosition {
  x: number;
  y: number;
}

export default function TopologyPage() {
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  const { data: topology, isLoading, error, refetch } = useQuery({
    queryKey: ['topology'],
    queryFn: topologyService.getTopology,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: serverDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['server-details', selectedServer],
    queryFn: () => selectedServer ? topologyService.getServerDetails(selectedServer) : null,
    enabled: !!selectedServer,
  });

  // Calculate node positions for visualization using tree layout
  const nodePositions = useMemo(() => {
    if (!topology?.nodes) return new Map<string, NodePosition>();

    const positions = new Map<string, NodePosition>();
    const nodes = topology.nodes;
    
    // Build adjacency map (parent -> children)
    const children = new Map<string, TopologyNode[]>();
    const roots: TopologyNode[] = [];
    
    nodes.forEach(node => {
      if (!node.uplink) {
        roots.push(node);
      } else {
        const siblings = children.get(node.uplink) || [];
        siblings.push(node);
        children.set(node.uplink, siblings);
      }
    });
    
    // Calculate tree depth for each node
    const getDepth = (nodeId: string, visited = new Set<string>()): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);
      const nodeChildren = children.get(nodeId) || [];
      if (nodeChildren.length === 0) return 0;
      return 1 + Math.max(...nodeChildren.map(c => getDepth(c.id, visited)));
    };
    
    // Count nodes at each level for spacing
    const countDescendants = (nodeId: string, visited = new Set<string>()): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);
      const nodeChildren = children.get(nodeId) || [];
      if (nodeChildren.length === 0) return 1;
      return nodeChildren.reduce((sum, c) => sum + countDescendants(c.id, visited), 0);
    };
    
    const centerX = 400;
    const centerY = 80;
    const levelHeight = 100;
    const nodeSpacing = 120;
    
    // Position nodes level by level
    const positionNode = (node: TopologyNode, x: number, y: number, width: number) => {
      positions.set(node.id, { x, y });
      
      const nodeChildren = children.get(node.id) || [];
      if (nodeChildren.length === 0) return;
      
      // Calculate total width needed for children
      const childWidths = nodeChildren.map(child => {
        const descendants = countDescendants(child.id, new Set([node.id]));
        return Math.max(1, descendants) * nodeSpacing;
      });
      const totalChildWidth = childWidths.reduce((a, b) => a + b, 0);
      
      // Use at least the calculated width
      const effectiveWidth = Math.max(totalChildWidth, width);
      
      // Position children
      let currentX = x - effectiveWidth / 2;
      nodeChildren.forEach((child, i) => {
        const childWidth = childWidths[i];
        const childX = currentX + childWidth / 2;
        const childY = y + levelHeight;
        positionNode(child, childX, childY, childWidth);
        currentX += childWidth;
      });
    };
    
    // Position each root tree
    if (roots.length === 1) {
      positionNode(roots[0], centerX, centerY, 800);
    } else {
      const totalWidth = 700;
      const spacing = totalWidth / (roots.length + 1);
      roots.forEach((root, i) => {
        const x = (i + 1) * spacing + 50;
        positionNode(root, x, centerY, spacing);
      });
    }

    return positions;
  }, [topology?.nodes]);

  // Filter nodes based on search
  const filteredNodes = useMemo(() => {
    if (!topology?.nodes) return [];
    if (!searchTerm) return topology.nodes;
    
    const term = searchTerm.toLowerCase();
    return topology.nodes.filter(node => 
      node.name.toLowerCase().includes(term) ||
      node.info?.toLowerCase().includes(term)
    );
  }, [topology?.nodes, searchTerm]);

  const getNodeColor = useCallback((type: string) => {
    switch (type) {
      case 'hub': return '#3b82f6'; // blue
      case 'services': return '#8b5cf6'; // purple
      default: return '#10b981'; // green
    }
  }, []);

  const getNodeBadgeVariant = useCallback((type: string): 'info' | 'secondary' | 'success' => {
    switch (type) {
      case 'hub': return 'info';
      case 'services': return 'secondary';
      default: return 'success';
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 rounded-lg border border-red-500/20">
        <p className="text-red-400">Failed to load network topology</p>
        <Button variant="secondary" onClick={() => refetch()} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-400" />
            Network Topology
          </h1>
          <p className="text-gray-400 mt-1">
            Visualize server connections and network structure
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              className={`px-3 py-2 text-sm ${viewMode === 'graph' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => setViewMode('graph')}
            >
              Graph
            </button>
            <button
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      {topology?.stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{topology.stats.total_servers}</p>
                <p className="text-sm text-gray-400">Servers</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{topology.stats.total_users}</p>
                <p className="text-sm text-gray-400">Users</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <Hash className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{topology.stats.total_channels}</p>
                <p className="text-sm text-gray-400">Channels</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">{topology.stats.total_opers}</p>
                <p className="text-sm text-gray-400">Operators</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search servers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topology Visualization or List */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {viewMode === 'graph' ? (
            <div className="relative w-full h-[600px] bg-gray-900/50">
              {/* Legend */}
              <div className="absolute top-4 left-4 bg-gray-800/90 rounded-lg p-3 border border-gray-700 text-xs space-y-2 z-10">
                <div className="font-semibold text-gray-300 mb-2">Legend</div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-gray-400">Hub Server</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-400">Leaf Server</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-gray-400">Services</span>
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="flex items-center gap-2">
                    <svg width="24" height="8">
                      <line x1="0" y1="4" x2="20" y2="4" stroke="#6b7280" strokeWidth="2" />
                      <polygon points="20,4 14,1 14,7" fill="#6b7280" />
                    </svg>
                    <span className="text-gray-400">Server Link</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <svg width="24" height="8">
                      <line x1="0" y1="4" x2="20" y2="4" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="3,3" />
                    </svg>
                    <span className="text-gray-400">Services Link</span>
                  </div>
                </div>
              </div>
              
              {/* SVG Topology */}
              <svg className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
                {/* Draw links with arrows */}
                {topology?.links.map((link, i) => {
                  const sourcePos = nodePositions.get(link.source);
                  const targetPos = nodePositions.get(link.target);
                  
                  if (!sourcePos || !targetPos) {
                    return null;
                  }
                  
                  // Calculate the angle and shorten the line to not overlap with nodes
                  const dx = targetPos.x - sourcePos.x;
                  const dy = targetPos.y - sourcePos.y;
                  const angle = Math.atan2(dy, dx);
                  const sourceNode = topology?.nodes.find(n => n.id === link.source);
                  const targetNode = topology?.nodes.find(n => n.id === link.target);
                  const sourceRadius = sourceNode?.type === 'hub' ? 38 : 28;
                  const targetRadius = targetNode?.type === 'hub' ? 38 : 28;
                  
                  // Shorten line to account for node radius + arrow size
                  const arrowSize = 12;
                  const x1 = sourcePos.x + sourceRadius * Math.cos(angle);
                  const y1 = sourcePos.y + sourceRadius * Math.sin(angle);
                  const x2 = targetPos.x - (targetRadius + arrowSize) * Math.cos(angle);
                  const y2 = targetPos.y - (targetRadius + arrowSize) * Math.sin(angle);
                  
                  // Arrow tip position (at edge of target node)
                  const arrowTipX = targetPos.x - targetRadius * Math.cos(angle);
                  const arrowTipY = targetPos.y - targetRadius * Math.sin(angle);
                  
                  // Arrow wing positions
                  const arrowAngle = Math.PI / 6; // 30 degrees
                  const wing1X = arrowTipX - arrowSize * Math.cos(angle - arrowAngle);
                  const wing1Y = arrowTipY - arrowSize * Math.sin(angle - arrowAngle);
                  const wing2X = arrowTipX - arrowSize * Math.cos(angle + arrowAngle);
                  const wing2Y = arrowTipY - arrowSize * Math.sin(angle + arrowAngle);
                  
                  const isServicesLink = link.type === 'services';
                  const isHighlighted = selectedServer === link.source || selectedServer === link.target;
                  const strokeColor = isHighlighted ? '#3b82f6' : isServicesLink ? '#8b5cf6' : '#6b7280';
                  
                  return (
                    <g key={i}>
                      {/* Glow effect for highlighted links */}
                      {isHighlighted && (
                        <line
                          x1={x1}
                          y1={y1}
                          x2={arrowTipX}
                          y2={arrowTipY}
                          stroke="#3b82f6"
                          strokeWidth={8}
                          strokeOpacity={0.3}
                          strokeLinecap="round"
                        />
                      )}
                      {/* Main line */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={strokeColor}
                        strokeWidth={isHighlighted ? 3 : 2}
                        strokeDasharray={isServicesLink ? '5,5' : undefined}
                        strokeLinecap="round"
                      />
                      {/* Arrow head (not for services links) */}
                      {!isServicesLink && (
                        <polygon
                          points={`${arrowTipX},${arrowTipY} ${wing1X},${wing1Y} ${wing2X},${wing2Y}`}
                          fill={strokeColor}
                        />
                      )}
                    </g>
                  );
                })}
                
                {/* Draw nodes */}
                {filteredNodes.map(node => {
                  const pos = nodePositions.get(node.id);
                  if (!pos) return null;
                  
                  const isSelected = selectedServer === node.id;
                  const nodeSize = node.type === 'hub' ? 35 : 25;
                  
                  return (
                    <g key={node.id} className="cursor-pointer" onClick={() => setSelectedServer(node.id)}>
                      {/* Node circle */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={nodeSize}
                        fill={getNodeColor(node.type)}
                        stroke={isSelected ? '#fff' : 'transparent'}
                        strokeWidth={3}
                        className="transition-all duration-200 hover:opacity-80"
                      />
                      
                      {/* User count indicator */}
                      {node.users > 0 && (
                        <text
                          x={pos.x}
                          y={pos.y + 4}
                          textAnchor="middle"
                          className="fill-white text-xs font-bold pointer-events-none"
                        >
                          {node.users}
                        </text>
                      )}
                      
                      {/* Server name */}
                      <text
                        x={pos.x}
                        y={pos.y + nodeSize + 15}
                        textAnchor="middle"
                        className="fill-gray-300 text-xs pointer-events-none"
                      >
                        {node.name.length > 20 ? node.name.slice(0, 17) + '...' : node.name}
                      </text>
                      
                      {/* Services badge */}
                      {node.ulined && (
                        <text
                          x={pos.x + nodeSize + 5}
                          y={pos.y - nodeSize + 5}
                          className="fill-purple-400 text-xs pointer-events-none"
                        >
                          ★
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            /* List View */
            <div className="divide-y divide-gray-700">
              {filteredNodes.map(node => (
                <div
                  key={node.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedServer === node.id ? 'bg-blue-900/30' : 'hover:bg-gray-700/50'
                  }`}
                  onClick={() => setSelectedServer(node.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Server className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-white">{node.name}</p>
                        {node.uplink && (
                          <p className="text-sm text-gray-400">→ {node.uplink}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getNodeBadgeVariant(node.type)}>
                        {node.type}
                      </Badge>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{node.users}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredNodes.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  No servers found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Server Details Panel */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            Server Details
          </h3>
          
          {!selectedServer ? (
            <p className="text-gray-400 text-center py-8">
              Select a server to view details
            </p>
          ) : detailsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : serverDetails ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide">Server Name</label>
                <p className="text-white font-mono">{serverDetails.name}</p>
              </div>
              
              {serverDetails.uplink && (
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide">Uplink (Parent)</label>
                  <p className="text-white font-mono flex items-center gap-2">
                    <span className="text-gray-500">↑</span>
                    {serverDetails.uplink}
                    <button 
                      onClick={() => setSelectedServer(serverDetails.uplink!)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </p>
                </div>
              )}
              
              {/* Show downlinks (children) */}
              {(() => {
                const downlinks = topology?.nodes.filter(n => n.uplink === selectedServer) || [];
                if (downlinks.length === 0) return null;
                return (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">
                      Downlinks ({downlinks.length})
                    </label>
                    <div className="mt-1 space-y-1">
                      {downlinks.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedServer(child.id)}
                          className="w-full text-left px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-700 text-sm text-white font-mono flex items-center gap-2 transition-colors"
                        >
                          <span className="text-gray-500">↓</span>
                          <span className="flex-1 truncate">{child.name}</span>
                          <Badge variant={getNodeBadgeVariant(child.type)} className="text-xs">
                            {child.type}
                          </Badge>
                          <span className="text-gray-400 text-xs">{child.users} users</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide">Users</label>
                <p className="text-white">{serverDetails.num_users}</p>
              </div>
              
              {serverDetails.server_info && (
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide">Description</label>
                  <p className="text-gray-300 text-sm">{serverDetails.server_info}</p>
                </div>
              )}
              
              {serverDetails.boot && (
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Boot Time
                  </label>
                  <p className="text-gray-300 text-sm">
                    {new Date(serverDetails.boot * 1000).toLocaleString()}
                  </p>
                </div>
              )}
              
              {serverDetails.ulined && (
                <Badge variant="secondary">U-Lined (Services)</Badge>
              )}
              
              {serverDetails.modules && serverDetails.modules.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> Modules ({serverDetails.modules.length})
                  </label>
                  <div className="max-h-48 overflow-y-auto mt-2 space-y-1">
                    {serverDetails.modules.slice(0, 20).map((mod, i) => (
                      <p key={i} className="text-xs text-gray-400 font-mono truncate">
                        {mod}
                      </p>
                    ))}
                    {serverDetails.modules.length > 20 && (
                      <p className="text-xs text-gray-500">
                        ... and {serverDetails.modules.length - 20} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400">No details available</p>
          )}
        </div>
      </div>
    </div>
  );
}
