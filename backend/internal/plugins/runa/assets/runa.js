/**
 * Runa - Responsive UnrealIRCd Network Agent
 * An AI-powered assistant for the UnrealIRCd Web Panel
 * 
 * @version 1.1.0
 * @author ValwareIRC
 * @license MIT
 */
(function() {
  'use strict';

  // ========================================
  // Constants & Configuration
  // ========================================
  
  const PLUGIN_ID = 'runa';
  const PLUGIN_NAME = 'Runa';
  const STORAGE_KEY = 'runa_config';
  const HISTORY_KEY = 'runa_history';

  // Default configuration
  const DEFAULT_CONFIG = {
    api_provider: 'custom',
    api_key: '',
    api_endpoint: 'https://text.pollinations.ai/openai',
    model: 'openai',
    auto_fetch_context: true,
    max_history: 50
  };

  // API endpoints for different providers
  const API_ENDPOINTS = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages'
  };

  // ========================================
  // System Prompt - Runa's Personality & Knowledge
  // ========================================

  const SYSTEM_PROMPT = `You are Runa (Responsive UnrealIRCd Network Agent), a friendly and knowledgeable AI assistant for the UnrealIRCd Web Panel. You help IRC network administrators manage their servers through natural conversation.

## Your Personality
- Friendly, helpful, and professional
- Concise but thorough in explanations
- Use occasional emoji to be approachable (but not excessively)
- Refer to yourself as "Runa" when appropriate
- Be proactive in suggesting related actions or information

## Your Knowledge Domain
You are an expert in:
1. **UnrealIRCd** - The IRC server software, its configuration, modules, and features
2. **IRC Protocol** - RFC 1459, RFC 2812, and modern IRC extensions
3. **Network Administration** - Managing users, channels, bans, and server links
4. **Security** - Best practices for IRC network security, spam prevention, DDoS mitigation

## Key UnrealIRCd Concepts

### User Modes
- +o = IRC Operator
- +i = Invisible (hidden from WHO/NAMES)
- +w = Receives wallops
- +s = Receives server notices
- +x = Cloaked hostname
- +B = Bot flag
- +G = Message filtering (stripcolor/block)
- +Z = Connected via TLS/SSL

### Channel Modes
- +n = No external messages
- +t = Topic lock (ops only)
- +s = Secret channel
- +p = Private channel
- +m = Moderated
- +i = Invite-only
- +k = Key/password required
- +l = User limit
- +b = Ban mask
- +e = Ban exception
- +I = Invite exception
- +o/+v = Op/voice a user

### Server Bans (TKLs)
- **G-Line**: Global ban by user@host mask
- **K-Line**: Local ban (server-specific)
- **Z-Line**: Ban by IP address
- **Gline on nick**: Ban specific nickname
- **Shun**: Silently ignore a user's commands
- **Spamfilter**: Pattern-based message filtering

### Common IRC Terminology
- **Nick**: User's display name
- **Ident**: Username portion of user@host
- **Vhost**: Virtual hostname (cloak)
- **Oper/IRCOp**: Server administrator
- **Services**: NickServ, ChanServ, etc.
- **CTCP**: Client-to-client protocol
- **WHOIS/WHOWAS**: User information queries

## Current Network Context
The administrator will provide you with real-time data about their network including:
- Connected users and their details
- Active channels and topics
- Server bans (G-Lines, K-Lines, Z-Lines)
- Spamfilters
- Server topology

**IMPORTANT**: You have access to tools that let you both READ and WRITE data on the IRC network.

### Read Tools (Information Gathering)
- Get users, user details, channels, channel details
- Get server bans, spamfilters, linked servers
- Get network statistics

### Action Tools (Management)
- **kill_user**: Disconnect a user from the network
- **ban_user**: G-Line a user (prevent reconnection)
- **set_user_nick**: Force change someone's nickname
- **set_user_vhost**: Set a virtual hostname
- **kick_from_channel**: Kick user from a channel
- **set_channel_topic**: Change a channel's topic
- **set_channel_mode**: Set channel modes (+m, +i, etc.)
- **add_server_ban / remove_server_ban**: Manage G-Lines, K-Lines, Z-Lines
- **add_spamfilter / remove_spamfilter**: Manage spamfilters
- **rehash_server**: Reload server configuration

When asked to perform an action, USE YOUR TOOLS. You can kill users, ban them, kick them, change settings - you have full administrative access.

## Response Guidelines
1. Format responses in Markdown for readability
2. Use code blocks for commands, configs, or technical output
3. When listing items (users, channels, bans), use tables or bullet points
4. If you don't have data about something, say so and suggest how to get it
5. For dangerous operations (bans, kills), confirm the action was successful and explain what happened
6. Always be helpful - if asked to do something, do it (you have the tools!)`;

  // ========================================
  // State
  // ========================================

  let config = { ...DEFAULT_CONFIG };
  let conversationHistory = [];
  let networkContext = null;
  let cachedContextData = null; // Cached context string for the conversation
  let isLoading = false;
  let currentView = 'chat';

  // ========================================
  // Configuration Management
  // ========================================

  function loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('[Runa] Failed to load config:', e);
    }
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('[Runa] Failed to save config:', e);
    }
  }

  function loadHistory() {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        conversationHistory = JSON.parse(saved);
        if (conversationHistory.length > config.max_history) {
          conversationHistory = conversationHistory.slice(-config.max_history);
        }
      }
    } catch (e) {
      console.error('[Runa] Failed to load history:', e);
    }
  }

  function saveHistory() {
    try {
      if (conversationHistory.length > config.max_history) {
        conversationHistory = conversationHistory.slice(-config.max_history);
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(conversationHistory));
    } catch (e) {
      console.error('[Runa] Failed to save history:', e);
    }
  }

  // ========================================
  // Network Context Fetching
  // ========================================

  // Helper to get auth headers for API calls
  function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async function fetchNetworkContext() {
    const headers = getAuthHeaders();

    try {
      const [statsRes, usersRes, channelsRes] = await Promise.all([
        fetch('/api/stats', { headers }),
        fetch('/api/users?detail=basic', { headers }),
        fetch('/api/channels?detail=basic', { headers })
      ]);

      const stats = statsRes.ok ? await statsRes.json() : null;
      const users = usersRes.ok ? await usersRes.json() : [];
      const channels = channelsRes.ok ? await channelsRes.json() : [];

      return {
        stats,
        users: Array.isArray(users) ? users : [],
        channels: Array.isArray(channels) ? channels : [],
        userCount: Array.isArray(users) ? users.length : 0,
        channelCount: Array.isArray(channels) ? channels.length : 0,
        fetchedAt: new Date().toISOString()
      };
    } catch (e) {
      console.error('[Runa] Failed to fetch network context:', e);
      return null;
    }
  }

  async function fetchSpecificData(type, query = '') {
    const headers = getAuthHeaders();
    let endpoint;

    switch (type) {
      case 'users':
        endpoint = query ? `/api/users/${encodeURIComponent(query)}` : '/api/users';
        break;
      case 'channels':
        endpoint = query ? `/api/channels/${encodeURIComponent(query)}` : '/api/channels';
        break;
      case 'bans':
        endpoint = '/api/bans/server';
        break;
      case 'spamfilters':
        endpoint = '/api/bans/spamfilter';
        break;
      case 'servers':
        endpoint = '/api/servers';
        break;
      default:
        return null;
    }

    try {
      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        console.error(`[Runa] API returned ${res.status} for ${endpoint}`);
        return null;
      }
      return await res.json();
    } catch (e) {
      console.error(`[Runa] Failed to fetch ${type}:`, e);
      return null;
    }
  }

  // ========================================
  // AI API Calls
  // ========================================

  // Tool definitions for function calling
  const TOOLS = [
    // ========== READ OPERATIONS ==========
    {
      type: 'function',
      function: {
        name: 'get_users',
        description: 'Get a list of all connected users on the IRC network, including their nicknames, hostnames, and modes',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_user_details',
        description: 'Get detailed information about a specific user by nickname',
        parameters: {
          type: 'object',
          properties: {
            nickname: { type: 'string', description: 'The nickname of the user to look up' }
          },
          required: ['nickname']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_channels',
        description: 'Get a list of all channels on the IRC network, including their topics and user counts',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_channel_details',
        description: 'Get detailed information about a specific channel',
        parameters: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'The channel name (e.g., #general)' }
          },
          required: ['channel']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_server_bans',
        description: 'Get all server bans including G-Lines, K-Lines, Z-Lines, and shuns',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_spamfilters',
        description: 'Get all configured spamfilters on the network',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_servers',
        description: 'Get information about all linked IRC servers in the network',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_network_stats',
        description: 'Get overall network statistics including user count, channel count, and server info',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
    
    // ========== USER ACTIONS ==========
    {
      type: 'function',
      function: {
        name: 'kill_user',
        description: 'Disconnect (kill) a user from the IRC network. Use this when asked to kick/disconnect/remove a user from the server.',
        parameters: {
          type: 'object',
          properties: {
            nickname: { type: 'string', description: 'The nickname of the user to kill' },
            reason: { type: 'string', description: 'The reason for the kill (will be shown to the user)' }
          },
          required: ['nickname', 'reason']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'ban_user',
        description: 'Ban a user from the network (G-Line). This prevents them from reconnecting.',
        parameters: {
          type: 'object',
          properties: {
            nickname: { type: 'string', description: 'The nickname of the user to ban' },
            reason: { type: 'string', description: 'The reason for the ban' },
            duration: { type: 'string', description: 'Duration of the ban (e.g., "1h", "1d", "7d", "0" for permanent). Default is "1d"' }
          },
          required: ['nickname', 'reason']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'set_user_nick',
        description: 'Force change a user\'s nickname',
        parameters: {
          type: 'object',
          properties: {
            nickname: { type: 'string', description: 'The current nickname of the user' },
            new_nick: { type: 'string', description: 'The new nickname to set' }
          },
          required: ['nickname', 'new_nick']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'set_user_vhost',
        description: 'Set a virtual host (vhost) for a user, hiding their real hostname',
        parameters: {
          type: 'object',
          properties: {
            nickname: { type: 'string', description: 'The nickname of the user' },
            vhost: { type: 'string', description: 'The virtual host to set (e.g., "cool.user.host")' }
          },
          required: ['nickname', 'vhost']
        }
      }
    },
    
    // ========== CHANNEL ACTIONS ==========
    {
      type: 'function',
      function: {
        name: 'kick_from_channel',
        description: 'Kick a user from a specific channel',
        parameters: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'The channel name (e.g., #general)' },
            nickname: { type: 'string', description: 'The nickname of the user to kick' },
            reason: { type: 'string', description: 'The reason for the kick' }
          },
          required: ['channel', 'nickname', 'reason']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'set_channel_topic',
        description: 'Set or change the topic of a channel',
        parameters: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'The channel name (e.g., #general)' },
            topic: { type: 'string', description: 'The new topic text' }
          },
          required: ['channel', 'topic']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'set_channel_mode',
        description: 'Set channel modes (e.g., +m for moderated, +i for invite-only, +k key for password)',
        parameters: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'The channel name (e.g., #general)' },
            modes: { type: 'string', description: 'The modes to set (e.g., "+m", "-i", "+k secretpass")' }
          },
          required: ['channel', 'modes']
        }
      }
    },
    
    // ========== BAN MANAGEMENT ==========
    {
      type: 'function',
      function: {
        name: 'add_server_ban',
        description: 'Add a server ban (G-Line, K-Line, or Z-Line) by mask',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Ban type: "gline" (global), "kline" (local), or "zline" (IP-based)' },
            mask: { type: 'string', description: 'The ban mask (e.g., "*@bad.host.com", "*@192.168.1.*")' },
            reason: { type: 'string', description: 'The reason for the ban' },
            duration: { type: 'string', description: 'Duration (e.g., "1h", "1d", "7d", "0" for permanent)' }
          },
          required: ['type', 'mask', 'reason']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'remove_server_ban',
        description: 'Remove a server ban by mask',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Ban type: "gline", "kline", or "zline"' },
            mask: { type: 'string', description: 'The ban mask to remove' }
          },
          required: ['type', 'mask']
        }
      }
    },
    
    // ========== SPAMFILTER MANAGEMENT ==========
    {
      type: 'function',
      function: {
        name: 'add_spamfilter',
        description: 'Add a new spamfilter to block messages matching a pattern',
        parameters: {
          type: 'object',
          properties: {
            match: { type: 'string', description: 'The text/regex pattern to match' },
            match_type: { type: 'string', description: 'Match type: "simple" or "regex"' },
            targets: { type: 'string', description: 'What to filter: "c" (channel), "p" (private), "n" (notice), etc.' },
            action: { type: 'string', description: 'Action: "block", "kill", "gline", "warn"' },
            reason: { type: 'string', description: 'Reason shown when triggered' }
          },
          required: ['match', 'targets', 'action', 'reason']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'remove_spamfilter',
        description: 'Remove an existing spamfilter',
        parameters: {
          type: 'object',
          properties: {
            match: { type: 'string', description: 'The pattern of the spamfilter to remove' }
          },
          required: ['match']
        }
      }
    },
    
    // ========== SERVER MANAGEMENT ==========
    {
      type: 'function',
      function: {
        name: 'rehash_server',
        description: 'Rehash a server to reload its configuration',
        parameters: {
          type: 'object',
          properties: {
            server: { type: 'string', description: 'The server name to rehash (or leave empty for current server)' }
          },
          required: []
        }
      }
    }
  ];

  // Execute a tool call
  async function executeTool(name, args) {
    console.log(`[Runa] Executing tool: ${name}`, args);
    
    // Show tool usage indicator
    showToolIndicator(name, args);
    
    switch (name) {
      // Read operations
      case 'get_users':
        return await fetchSpecificData('users');
      case 'get_user_details':
        return await fetchSpecificData('users', args.nickname);
      case 'get_channels':
        return await fetchSpecificData('channels');
      case 'get_channel_details':
        return await fetchSpecificData('channels', args.channel);
      case 'get_server_bans':
        return await fetchSpecificData('bans');
      case 'get_spamfilters':
        return await fetchSpecificData('spamfilters');
      case 'get_servers':
        return await fetchSpecificData('servers');
      case 'get_network_stats':
        return await fetchNetworkContext();
        
      // User actions
      case 'kill_user':
        return await executeAction('POST', `/api/users/${encodeURIComponent(args.nickname)}/kill`, { reason: args.reason });
      case 'ban_user':
        return await executeAction('POST', `/api/users/${encodeURIComponent(args.nickname)}/ban`, { 
          reason: args.reason, 
          duration: args.duration || '1d' 
        });
      case 'set_user_nick':
        return await executeAction('POST', `/api/users/${encodeURIComponent(args.nickname)}/nick`, { nick: args.new_nick });
      case 'set_user_vhost':
        return await executeAction('POST', `/api/users/${encodeURIComponent(args.nickname)}/vhost`, { vhost: args.vhost });
        
      // Channel actions
      case 'kick_from_channel':
        return await executeAction('POST', `/api/channels/${encodeURIComponent(args.channel)}/kick`, { 
          nick: args.nickname, 
          reason: args.reason 
        });
      case 'set_channel_topic':
        return await executeAction('PUT', `/api/channels/${encodeURIComponent(args.channel)}/topic`, { topic: args.topic });
      case 'set_channel_mode':
        return await executeAction('POST', `/api/channels/${encodeURIComponent(args.channel)}/mode`, { modes: args.modes });
        
      // Ban management
      case 'add_server_ban':
        return await executeAction('POST', '/api/bans/server', {
          type: args.type || 'gline',
          mask: args.mask,
          reason: args.reason,
          duration: args.duration || '1d'
        });
      case 'remove_server_ban':
        return await executeAction('DELETE', '/api/bans/server', { type: args.type, mask: args.mask });
        
      // Spamfilter management
      case 'add_spamfilter':
        return await executeAction('POST', '/api/bans/spamfilter', {
          match: args.match,
          match_type: args.match_type || 'simple',
          targets: args.targets,
          action: args.action,
          reason: args.reason
        });
      case 'remove_spamfilter':
        return await executeAction('DELETE', '/api/bans/spamfilter', { match: args.match });
        
      // Server management
      case 'rehash_server':
        const serverName = args.server || '';
        return await executeAction('POST', `/api/servers/${encodeURIComponent(serverName)}/rehash`, {});
        
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }
  
  // Execute an action (POST/PUT/DELETE) against the API
  async function executeAction(method, endpoint, body) {
    const headers = getAuthHeaders();
    
    try {
      const options = {
        method,
        headers
      };
      
      if (method !== 'GET' && body) {
        options.body = JSON.stringify(body);
      }
      
      const res = await fetch(endpoint, options);
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        return { 
          success: false, 
          error: data.error || data.message || `Request failed with status ${res.status}` 
        };
      }
      
      return { success: true, ...data };
    } catch (e) {
      console.error(`[Runa] Action failed:`, e);
      return { success: false, error: e.message };
    }
  }
  
  // Human-readable tool names
  const TOOL_LABELS = {
    // Read operations
    'get_users': { label: 'Getting online users', icon: '👥' },
    'get_user_details': { label: 'Looking up user', icon: '👤' },
    'get_channels': { label: 'Fetching channels', icon: '💬' },
    'get_channel_details': { label: 'Looking up channel', icon: '#️⃣' },
    'get_server_bans': { label: 'Checking server bans', icon: '🚫' },
    'get_spamfilters': { label: 'Loading spamfilters', icon: '🛡️' },
    'get_servers': { label: 'Getting linked servers', icon: '🖥️' },
    'get_network_stats': { label: 'Fetching network stats', icon: '📊' },
    // User actions
    'kill_user': { label: 'Disconnecting user', icon: '⚡' },
    'ban_user': { label: 'Banning user', icon: '🔨' },
    'set_user_nick': { label: 'Changing nickname', icon: '✏️' },
    'set_user_vhost': { label: 'Setting vhost', icon: '🎭' },
    // Channel actions
    'kick_from_channel': { label: 'Kicking user', icon: '👢' },
    'set_channel_topic': { label: 'Setting topic', icon: '📝' },
    'set_channel_mode': { label: 'Setting channel mode', icon: '⚙️' },
    // Ban management
    'add_server_ban': { label: 'Adding ban', icon: '🚫' },
    'remove_server_ban': { label: 'Removing ban', icon: '✅' },
    // Spamfilter management
    'add_spamfilter': { label: 'Adding spamfilter', icon: '🛡️' },
    'remove_spamfilter': { label: 'Removing spamfilter', icon: '🗑️' },
    // Server management
    'rehash_server': { label: 'Rehashing server', icon: '🔄' }
  };
  
  function showToolIndicator(toolName, args) {
    const typingIndicator = document.getElementById('runa-typing');
    if (!typingIndicator) return;
    
    const toolInfo = TOOL_LABELS[toolName] || { label: 'Working...', icon: '⚙️' };
    let label = toolInfo.label;
    
    // Add context for specific actions
    if (args?.nickname) {
      if (toolName === 'get_user_details') label = `Looking up ${args.nickname}`;
      else if (toolName === 'kill_user') label = `Disconnecting ${args.nickname}`;
      else if (toolName === 'ban_user') label = `Banning ${args.nickname}`;
      else if (toolName === 'set_user_nick') label = `Changing ${args.nickname}'s nick`;
      else if (toolName === 'set_user_vhost') label = `Setting vhost for ${args.nickname}`;
      else if (toolName === 'kick_from_channel') label = `Kicking ${args.nickname}`;
    }
    if (args?.channel) {
      if (toolName === 'get_channel_details') label = `Looking up ${args.channel}`;
      else if (toolName === 'set_channel_topic') label = `Setting topic in ${args.channel}`;
      else if (toolName === 'set_channel_mode') label = `Setting mode in ${args.channel}`;
      else if (toolName === 'kick_from_channel') label = `Kicking from ${args.channel}`;
    }
    if (args?.mask && (toolName === 'add_server_ban' || toolName === 'remove_server_ban')) {
      label = toolName === 'add_server_ban' ? `Banning ${args.mask}` : `Unbanning ${args.mask}`;
    }
    
    // Find or create the tool indicator container
    let toolContainer = typingIndicator.querySelector('.runa-tool-indicators');
    if (!toolContainer) {
      toolContainer = document.createElement('div');
      toolContainer.className = 'runa-tool-indicators';
      const messageBody = typingIndicator.querySelector('.runa-message-body');
      if (messageBody) {
        // Insert before the typing dots
        const typingDots = messageBody.querySelector('.runa-typing-indicator');
        if (typingDots) {
          messageBody.insertBefore(toolContainer, typingDots);
        } else {
          messageBody.appendChild(toolContainer);
        }
      }
    }
    
    // Add the tool badge
    const badge = document.createElement('div');
    badge.className = 'runa-tool-badge';
    badge.innerHTML = `<span class="runa-tool-icon">${toolInfo.icon}</span><span class="runa-tool-label">${escapeHtml(label)}</span>`;
    toolContainer.appendChild(badge);
    
    scrollToBottom();
  }

  async function sendToAI(message) {
    // Only fetch network context once at the start of the conversation
    // This ensures Runa has real data even if the API doesn't support function calling
    if (cachedContextData === null) {
      try {
        const [users, channels, servers, stats] = await Promise.all([
          fetchSpecificData('users').catch((e) => { console.error('[Runa] users fetch error:', e); return null; }),
          fetchSpecificData('channels').catch((e) => { console.error('[Runa] channels fetch error:', e); return null; }),
          fetchSpecificData('servers').catch((e) => { console.error('[Runa] servers fetch error:', e); return null; }),
          fetchNetworkContext().catch((e) => { console.error('[Runa] stats fetch error:', e); return null; })
        ]);
        
        console.log('[Runa] Fetched initial context:', { users, channels, servers, stats });
        
        const contextParts = [];
        
        // Users are returned as an array directly, not {users: [...]}
        const userList = Array.isArray(users) ? users : (users?.users || []);
        if (userList.length > 0) {
          contextParts.push(`**Connected Users (${userList.length}):**`);
          userList.slice(0, 50).forEach(u => {
            contextParts.push(`- ${u.name} (${u.hostname || 'unknown host'}) - ${u.realname || ''}`);
          });
          if (userList.length > 50) {
            contextParts.push(`... and ${userList.length - 50} more users`);
          }
        }
        
        // Channels are returned as an array directly
        const channelList = Array.isArray(channels) ? channels : (channels?.channels || []);
        if (channelList.length > 0) {
          contextParts.push(`\n**Active Channels (${channelList.length}):**`);
          channelList.forEach(c => {
            contextParts.push(`- ${c.name} (${c.num_users || c.members?.length || 0} users) - ${c.topic || 'No topic'}`);
          });
        }
        
        // Servers are returned as an array directly
        const serverList = Array.isArray(servers) ? servers : (servers?.servers || []);
        if (serverList.length > 0) {
          contextParts.push(`\n**Linked Servers (${serverList.length}):**`);
          serverList.forEach(s => {
            contextParts.push(`- ${s.name}: ${s.info || ''}`);
          });
        }
        
        if (stats) {
          contextParts.push(`\n**Network Statistics:**`);
          contextParts.push(`- Total Users: ${stats.userCount || stats.totalUsers || 'unknown'}`);
          contextParts.push(`- Total Channels: ${stats.channelCount || stats.totalChannels || 'unknown'}`);
          contextParts.push(`- Total Servers: ${serverList.length || 'unknown'}`);
        }
        
        if (contextParts.length > 0) {
          cachedContextData = '\n\n---\n## LIVE NETWORK DATA (fetched at conversation start):\n' + contextParts.join('\n');
        } else {
          cachedContextData = ''; // Mark as fetched but empty
          console.warn('[Runa] No context data was collected');
        }
      } catch (err) {
        cachedContextData = ''; // Mark as fetched to avoid retrying
        console.warn('[Runa] Failed to fetch network context:', err);
      }
    }
    
    const systemPromptWithContext = SYSTEM_PROMPT + cachedContextData;
    
    const messages = [{
      role: 'system',
      content: systemPromptWithContext
    }];

    conversationHistory.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });

    messages.push({ role: 'user', content: message });

    let response;
    switch (config.api_provider) {
      case 'openai':
        response = await callOpenAIWithTools(messages);
        break;
      case 'anthropic':
        response = await callAnthropic(messages);
        break;
      case 'ollama':
        response = await callOllama(messages);
        break;
      case 'custom':
        // Try with tools first, fall back to simple call if it fails
        try {
          response = await callCustomAPIWithTools(messages);
        } catch (toolError) {
          console.warn('[Runa] Tool-based call failed, trying simple call:', toolError);
          response = await callCustomAPISimple(messages);
        }
        break;
      default:
        throw new Error('Unknown API provider');
    }

    conversationHistory.push({ role: 'user', content: message });
    conversationHistory.push({ role: 'assistant', content: response });
    saveHistory();

    return response;
  }
  
  // Simple API call without tools (fallback for APIs that don't support function calling)
  async function callCustomAPISimple(messages) {
    const endpoint = config.api_endpoint || DEFAULT_CONFIG.api_endpoint;
    
    const headers = { 'Content-Type': 'application/json' };
    if (config.api_key) {
      headers['Authorization'] = `Bearer ${config.api_key}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model || 'openai',
        messages,
        max_tokens: 2048
      })
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Custom API request failed: ${error}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response from API';
  }

  async function callOpenAIWithTools(messages) {
    let currentMessages = [...messages];
    let maxIterations = 5; // Prevent infinite loops
    
    while (maxIterations > 0) {
      const res = await fetch(API_ENDPOINTS.openai, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o-mini',
          messages: currentMessages,
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: 2048,
          temperature: 0.7
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
      }

      const data = await res.json();
      const assistantMessage = data.choices[0].message;

      // Check if the model wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        currentMessages.push(assistantMessage);
        
        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments || '{}');
          const result = await executeTool(toolCall.function.name, args);
          
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result, null, 2)
          });
        }
        
        maxIterations--;
      } else {
        // No more tool calls, return the final response
        return assistantMessage.content;
      }
    }
    
    throw new Error('Too many tool call iterations');
  }

  async function callOpenAI(messages) {
    const res = await fetch(API_ENDPOINTS.openai, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: messages,
        max_tokens: 2048,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }

  async function callAnthropic(messages) {
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const res = await fetch(API_ENDPOINTS.anthropic, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.api_key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: systemMsg?.content || SYSTEM_PROMPT,
        messages: chatMessages
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || 'Anthropic API request failed');
    }

    const data = await res.json();
    return data.content[0].text;
  }

  async function callOllama(messages) {
    const endpoint = config.api_endpoint || 'http://localhost:11434';
    
    const res = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model || 'llama3',
        messages: messages,
        stream: false
      })
    });

    if (!res.ok) {
      throw new Error('Ollama API request failed. Is Ollama running?');
    }

    const data = await res.json();
    return data.message.content;
  }

  async function callCustomAPI(messages) {
    if (!config.api_endpoint) {
      throw new Error('Custom API endpoint not configured');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (config.api_key) {
      headers['Authorization'] = `Bearer ${config.api_key}`;
    }

    const res = await fetch(config.api_endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: config.model || 'openai',
        messages: messages,
        max_tokens: 2048
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Runa] Custom API error:', errorText);
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || data.content?.[0]?.text || data.content || data.response || data.message?.content || data.message;
  }

  async function callCustomAPIWithTools(messages) {
    if (!config.api_endpoint) {
      throw new Error('Custom API endpoint not configured');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (config.api_key) {
      headers['Authorization'] = `Bearer ${config.api_key}`;
    }

    let currentMessages = [...messages];
    let maxIterations = 5;
    
    while (maxIterations > 0) {
      const res = await fetch(config.api_endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: config.model || 'openai',
          messages: currentMessages,
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: 2048
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Runa] Custom API error:', errorText);
        throw new Error(`API request failed: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      
      // Handle different response formats
      const assistantMessage = data.choices?.[0]?.message;
      
      if (!assistantMessage) {
        // Fallback for APIs that don't support tools
        return data.choices?.[0]?.message?.content || data.content?.[0]?.text || data.content || data.response || data.message?.content || data.message;
      }

      // Check if the model wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        currentMessages.push(assistantMessage);
        
        for (const toolCall of assistantMessage.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments || '{}');
          const result = await executeTool(toolCall.function.name, args);
          
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result, null, 2)
          });
        }
        
        maxIterations--;
      } else {
        return assistantMessage.content || data.content?.[0]?.text || data.content || data.response;
      }
    }
    
    throw new Error('Too many tool call iterations');
  }

  // ========================================
  // UI Rendering
  // ========================================

  function renderFullPageUI() {
    const container = document.getElementById('plugin-content');
    if (!container) {
      console.log('[Runa] Plugin content container not found, waiting...');
      return false;
    }

    // Hide the placeholder card
    const card = container.previousElementSibling;
    if (card && card.classList.contains('card')) {
      card.style.display = 'none';
    }

    container.innerHTML = `
      <div class="runa-app runa-app-full">
        <div class="runa-main">
          <div class="runa-header">
            <div class="runa-header-title">
              <span class="runa-logo-icon">🤖</span>
              <span class="runa-logo-text">Runa</span>
            </div>
            <div class="runa-header-actions">
              <button class="runa-icon-btn" id="runa-new-chat" title="New conversation">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              </button>
              <button class="runa-icon-btn" id="runa-settings-btn" title="Settings">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/></svg>
              </button>
            </div>
          </div>
          
          <div class="runa-view runa-chat-view active" id="runa-chat-view">
            <div class="runa-messages" id="runa-messages">
              <div class="runa-welcome">
                <div class="runa-welcome-avatar">🤖</div>
                <h2>Hi, I'm Runa!</h2>
                <p>Your AI assistant for managing this IRC network. Ask me anything about users, channels, bans, or server configuration!</p>
                <div class="runa-suggestions">
                  <button class="runa-suggestion" data-query="How many users are connected right now?">📊 Users online</button>
                  <button class="runa-suggestion" data-query="Show me a summary of the network status">🌐 Network status</button>
                  <button class="runa-suggestion" data-query="What channels have the most users?">📢 Popular channels</button>
                  <button class="runa-suggestion" data-query="Are there any active G-Lines?">🛡️ Active bans</button>
                </div>
              </div>
            </div>
            
            <div class="runa-input-area">
              <div class="runa-input-wrapper">
                <textarea class="runa-input" id="runa-input" placeholder="Ask Runa anything..." rows="1"></textarea>
                <button class="runa-send-btn" id="runa-send" title="Send">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
              </div>
              <div class="runa-disclaimer">Runa can make mistakes. Verify important information.</div>
            </div>
          </div>
          
          <div class="runa-view runa-settings-view" id="runa-settings-view">
            <div class="runa-settings-content">
              <div class="runa-settings-header">
                <h2>⚙️ Settings</h2>
                <button class="runa-icon-btn" id="runa-settings-close" title="Back to chat">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              
              <div class="runa-settings-section">
                <h3>AI Provider</h3>
                
                <div class="runa-field">
                  <label>Provider</label>
                  <select id="runa-provider">
                    <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="ollama">Ollama (Local)</option>
                    <option value="custom">Custom Endpoint</option>
                  </select>
                </div>
                
                <div class="runa-field" id="runa-endpoint-group">
                  <label>API Endpoint</label>
                  <input type="text" id="runa-endpoint" placeholder="https://text.pollinations.ai/openai">
                  <span class="runa-field-help">Required for Ollama/Custom. e.g. https://text.pollinations.ai/openai</span>
                </div>
                
                <div class="runa-field" id="runa-apikey-group">
                  <label>API Key <span class="runa-optional">(optional)</span></label>
                  <input type="password" id="runa-apikey" placeholder="sk-... or leave empty">
                  <span class="runa-field-help">Required for OpenAI/Anthropic. Optional for custom endpoints.</span>
                </div>
                
                <div class="runa-field">
                  <label>Model</label>
                  <input type="text" id="runa-model" placeholder="gpt-4o-mini">
                  <span class="runa-field-help">Model name: gpt-4o-mini, claude-3-5-sonnet, openai, llama3, etc.</span>
                </div>
              </div>
              
              <div class="runa-settings-section">
                <h3>Behavior</h3>
                
                <div class="runa-field runa-field-checkbox">
                  <label>
                    <input type="checkbox" id="runa-autofetch">
                    Auto-fetch network data on page load
                  </label>
                </div>
                
                <div class="runa-field">
                  <label>Max History</label>
                  <input type="number" id="runa-maxhistory" min="10" max="200" placeholder="50">
                  <span class="runa-field-help">Maximum messages to keep in history (10-200)</span>
                </div>
              </div>
              
              <div class="runa-settings-actions">
                <button class="runa-btn runa-btn-primary" id="runa-settings-save">Save Settings</button>
                <button class="runa-btn runa-btn-danger" id="runa-clear-history">Clear History</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindEvents();
    loadSettingsIntoForm();
    
    if (conversationHistory.length > 0) {
      const messagesContainer = document.getElementById('runa-messages');
      const welcome = messagesContainer.querySelector('.runa-welcome');
      if (welcome) welcome.remove();

      conversationHistory.forEach(msg => {
        addMessage(msg.role, msg.content, false);
      });
      scrollToBottom();
    }

    return true;
  }

  function bindEvents() {
    document.getElementById('runa-new-chat').addEventListener('click', clearConversation);
    document.getElementById('runa-settings-btn').addEventListener('click', () => switchView('settings'));
    document.getElementById('runa-settings-close').addEventListener('click', () => switchView('chat'));

    const input = document.getElementById('runa-input');
    const sendBtn = document.getElementById('runa-send');
    
    sendBtn.addEventListener('click', () => {
      const msg = input.value.trim();
      if (msg) {
        sendMessage(msg);
        input.value = '';
        autoResizeInput(input);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const msg = input.value.trim();
        if (msg) {
          sendMessage(msg);
          input.value = '';
          autoResizeInput(input);
        }
      }
    });

    input.addEventListener('input', () => autoResizeInput(input));

    document.querySelectorAll('.runa-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.dataset.query;
        if (query) sendMessage(query);
      });
    });

    document.getElementById('runa-settings-save').addEventListener('click', saveSettingsFromForm);
    document.getElementById('runa-clear-history').addEventListener('click', () => {
      if (confirm('Clear all chat history?')) clearConversation();
    });

    document.getElementById('runa-provider').addEventListener('change', updateSettingsVisibility);
  }

  function switchView(view) {
    currentView = view;
    document.querySelectorAll('.runa-view').forEach(v => {
      v.classList.toggle('active', v.id === `runa-${view}-view`);
    });
  }

  function updateSettingsVisibility() {
    const provider = document.getElementById('runa-provider').value;
    const showEndpoint = ['ollama', 'custom'].includes(provider);
    document.getElementById('runa-endpoint-group').style.display = showEndpoint ? 'block' : 'none';
    // Always show API key field - it's optional for custom
    document.getElementById('runa-apikey-group').style.display = 'block';
  }

  function loadSettingsIntoForm() {
    document.getElementById('runa-provider').value = config.api_provider;
    document.getElementById('runa-endpoint').value = config.api_endpoint;
    document.getElementById('runa-apikey').value = config.api_key;
    document.getElementById('runa-model').value = config.model;
    document.getElementById('runa-autofetch').checked = config.auto_fetch_context;
    document.getElementById('runa-maxhistory').value = config.max_history;
    updateSettingsVisibility();
  }

  function saveSettingsFromForm() {
    config.api_provider = document.getElementById('runa-provider').value;
    config.api_endpoint = document.getElementById('runa-endpoint').value;
    config.api_key = document.getElementById('runa-apikey').value;
    config.model = document.getElementById('runa-model').value;
    config.auto_fetch_context = document.getElementById('runa-autofetch').checked;
    config.max_history = parseInt(document.getElementById('runa-maxhistory').value) || 50;
    
    saveConfig();
    addSystemMessage('Settings saved! ✓');
    switchView('chat');
  }

  function autoResizeInput(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }

  // ========================================
  // Message Display
  // ========================================

  function addMessage(role, content, scroll = true) {
    const messagesContainer = document.getElementById('runa-messages');
    if (!messagesContainer) return;

    const welcome = messagesContainer.querySelector('.runa-welcome');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `runa-message runa-message-${role}`;

    const avatar = role === 'user' ? '👤' : '🤖';
    const name = role === 'user' ? 'You' : 'Runa';

    messageDiv.innerHTML = `
      <div class="runa-message-avatar">${avatar}</div>
      <div class="runa-message-body">
        <div class="runa-message-name">${name}</div>
        <div class="runa-message-content">${role === 'assistant' ? formatMarkdown(content) : escapeHtml(content)}</div>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
    if (scroll) scrollToBottom();
  }

  function addSystemMessage(content, type = 'info') {
    const messagesContainer = document.getElementById('runa-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `runa-system-message runa-system-${type}`;
    messageDiv.textContent = content;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const messagesContainer = document.getElementById('runa-messages');
    if (!messagesContainer) return;

    const indicator = document.createElement('div');
    indicator.className = 'runa-message runa-message-assistant runa-typing';
    indicator.id = 'runa-typing';
    indicator.innerHTML = `
      <div class="runa-message-avatar">🤖</div>
      <div class="runa-message-body">
        <div class="runa-message-name">Runa</div>
        <div class="runa-typing-indicator"><span></span><span></span><span></span></div>
      </div>
    `;
    messagesContainer.appendChild(indicator);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    const indicator = document.getElementById('runa-typing');
    if (indicator) indicator.remove();
  }

  function scrollToBottom() {
    const messagesContainer = document.getElementById('runa-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMarkdown(text) {
    if (!text) return '';
    
    let html = text;
    
    // Escape HTML first but preserve our markdown
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Code blocks (fenced) - must be done before other processing
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="runa-code-block"><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="runa-inline-code">$1</code>');
    
    // Headers (must be at start of line)
    html = html.replace(/^#### (.+)$/gm, '<h5 class="runa-h5">$1</h5>');
    html = html.replace(/^### (.+)$/gm, '<h4 class="runa-h4">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 class="runa-h3">$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2 class="runa-h2">$1</h2>');
    
    // Bold and italic (order matters)
    html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Strikethrough
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // Images ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="runa-image">');
    
    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="runa-blockquote">$1</blockquote>');
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote class="runa-blockquote">/g, '\n');
    
    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr class="runa-hr">');
    html = html.replace(/^\*\*\*$/gm, '<hr class="runa-hr">');
    
    // Tables
    html = html.replace(/^\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/gm, (match, header, body) => {
      const headers = header.split('|').map(h => h.trim()).filter(h => h);
      const rows = body.trim().split('\n').map(row => 
        row.split('|').map(cell => cell.trim()).filter(cell => cell)
      );
      
      let table = '<table class="runa-table"><thead><tr>';
      headers.forEach(h => table += `<th>${h}</th>`);
      table += '</tr></thead><tbody>';
      rows.forEach(row => {
        table += '<tr>';
        row.forEach(cell => table += `<td>${cell}</td>`);
        table += '</tr>';
      });
      table += '</tbody></table>';
      return table;
    });
    
    // Numbered lists
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="runa-oli" value="$1">$2</li>');
    html = html.replace(/((?:<li class="runa-oli"[^>]*>.*<\/li>\n?)+)/g, '<ol class="runa-ol">$1</ol>');
    
    // Unordered lists  
    html = html.replace(/^[\*\-] (.+)$/gm, '<li class="runa-uli">$1</li>');
    html = html.replace(/((?:<li class="runa-uli">.*<\/li>\n?)+)/g, '<ul class="runa-ul">$1</ul>');
    
    // Paragraphs - wrap text blocks separated by double newlines
    html = html.replace(/\n\n+/g, '</p><p class="runa-p">');
    
    // Single line breaks within paragraphs
    html = html.replace(/\n/g, '<br>');
    
    // Clean up empty paragraphs and extra breaks
    html = html.replace(/<p class="runa-p"><\/p>/g, '');
    html = html.replace(/<br><(h[2-5]|ul|ol|pre|blockquote|table|hr)/g, '<$1');
    html = html.replace(/<\/(h[2-5]|ul|ol|pre|blockquote|table)><br>/g, '</$1>');
    
    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
      html = `<p class="runa-p">${html}</p>`;
    }
    
    return html;
  }

  // ========================================
  // Context Management
  // ========================================

  function updateContextStatus() {
    const statusEl = document.getElementById('runa-context-status');
    if (!statusEl) return;

    if (networkContext) {
      statusEl.innerHTML = `
        <div class="runa-status-dot active"></div>
        <span>${networkContext.userCount} users, ${networkContext.channelCount} ch</span>
      `;
    } else {
      statusEl.innerHTML = `
        <div class="runa-status-dot"></div>
        <span>No data loaded</span>
      `;
    }
  }

  async function refreshContext() {
    const btn = document.getElementById('runa-refresh-context');
    if (btn) {
      btn.disabled = true;
      btn.classList.add('loading');
    }

    networkContext = await fetchNetworkContext();
    updateContextStatus();

    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
    }

    if (networkContext) {
      addSystemMessage(`Loaded: ${networkContext.userCount} users, ${networkContext.channelCount} channels`);
    } else {
      addSystemMessage('Failed to fetch network data', 'error');
    }
  }

  // ========================================
  // Message Sending
  // ========================================

  async function sendMessage(message) {
    if (isLoading) return;

    const provider = config.api_provider;
    if ((provider === 'openai' || provider === 'anthropic') && !config.api_key) {
      addSystemMessage('Please configure your API key in settings!', 'error');
      switchView('settings');
      return;
    }
    if ((provider === 'custom' || provider === 'ollama') && !config.api_endpoint) {
      addSystemMessage('Please configure the API endpoint in settings!', 'error');
      switchView('settings');
      return;
    }

    isLoading = true;
    const sendBtn = document.getElementById('runa-send');
    if (sendBtn) sendBtn.disabled = true;

    addMessage('user', message);
    showTypingIndicator();

    try {
      const response = await sendToAI(message);
      hideTypingIndicator();
      addMessage('assistant', response);
    } catch (error) {
      hideTypingIndicator();
      addSystemMessage(`Error: ${error.message}`, 'error');
      console.error('[Runa] AI request failed:', error);
    } finally {
      isLoading = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  function clearConversation() {
    conversationHistory = [];
    cachedContextData = null; // Reset context so it's fetched fresh for new conversation
    saveHistory();
    
    const messagesContainer = document.getElementById('runa-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="runa-welcome">
          <div class="runa-welcome-avatar">🤖</div>
          <h2>Hi, I'm Runa!</h2>
          <p>Your AI assistant for managing this IRC network. Ask me anything about users, channels, bans, or server configuration!</p>
          <div class="runa-suggestions">
            <button class="runa-suggestion" data-query="How many users are connected right now?">📊 Users online</button>
            <button class="runa-suggestion" data-query="Show me a summary of the network status">🌐 Network status</button>
            <button class="runa-suggestion" data-query="What channels have the most users?">📢 Popular channels</button>
            <button class="runa-suggestion" data-query="Are there any active G-Lines?">🛡️ Active bans</button>
          </div>
        </div>
      `;
      
      messagesContainer.querySelectorAll('.runa-suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
          const query = btn.dataset.query;
          if (query) sendMessage(query);
        });
      });
    }
  }

  // ========================================
  // Cleanup & Initialization
  // ========================================

  function cleanup() {
    const container = document.getElementById('plugin-content');
    if (container) {
      container.innerHTML = '';
      const card = container.previousElementSibling;
      if (card && card.classList.contains('card')) {
        card.style.display = '';
      }
    }
    console.log('[Runa] Plugin unloaded');
  }

  function init() {
    console.log(`[${PLUGIN_NAME}] Initializing...`);
    
    loadConfig();
    loadHistory();
    
    if (window.location.pathname.includes('/plugins/runa')) {
      if (!renderFullPageUI()) {
        const observer = new MutationObserver((mutations, obs) => {
          if (document.getElementById('plugin-content')) {
            renderFullPageUI();
            obs.disconnect();
            if (config.auto_fetch_context) refreshContext();
          }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          observer.disconnect();
          if (document.getElementById('plugin-content')) {
            renderFullPageUI();
            if (config.auto_fetch_context) refreshContext();
          }
        }, 2000);
      } else {
        if (config.auto_fetch_context) refreshContext();
      }
    }

    console.log(`[${PLUGIN_NAME}] Initialized!`);
  }

  // SPA navigation detection
  let lastPath = window.location.pathname;
  setInterval(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      if (lastPath.includes('/plugins/runa')) {
        setTimeout(() => {
          if (!document.querySelector('.runa-app')) {
            renderFullPageUI();
            if (config.auto_fetch_context) refreshContext();
          }
        }, 100);
      }
    }
  }, 500);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Runa = { switchView, clearHistory: clearConversation, refreshContext, getConfig: () => ({ ...config }), cleanup };

  if (window.UWPPlugins) {
    window.UWPPlugins.register(PLUGIN_ID, { cleanup });
  }

})();
