# UnrealIRCd Web Panel v2

A modern, beautiful web panel for managing UnrealIRCd servers. Built with Go backend and React frontend.

## Features

- Modern, dark-themed UI with TailwindCSS
- JWT-based authentication with role-based permissions
- Real-time statistics and dashboard
- User management (kill, ban, set vhost, etc.)
- Channel management (topic, modes, kick)
- Server management (view, rehash)
- Ban management (G-Lines, K-Lines, Z-Lines, Shuns)
- Name ban management (Q-Lines)
- Ban exception management (E-Lines)
- Spamfilter management
- Plugin system for extensibility
- Hook system for customization

## Prerequisites

- Go 1.22 or later
- Node.js 18 or later
- An UnrealIRCd server with JSON-RPC enabled

## Project Structure

```
.
├── backend/                 # Go backend
│   ├── cmd/server/         # Main application entry
│   ├── internal/
│   │   ├── api/           # HTTP handlers and routes
│   │   ├── auth/          # Authentication (JWT, passwords)
│   │   ├── config/        # Configuration management
│   │   ├── database/      # Database models and connection
│   │   ├── hooks/         # Hook system for extensibility
│   │   ├── plugins/       # Plugin system
│   │   ├── rpc/           # UnrealIRCd RPC client
│   │   ├── sse/           # Server-Sent Events
│   │   └── utils/         # Utility functions
│   └── plugins/           # Plugin directory
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript types
│   └── public/            # Static assets
└── config.json            # Configuration file
```

## Installation

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/unrealircd/unrealircd-webpanel.git
   cd unrealircd-webpanel
   ```

2. Create a configuration file (see Configuration section below)

3. Build and start:
   ```bash
   ./uwp build
   ./uwp start
   ```

4. Open http://localhost:8080 in your browser

### The `uwp` Script

The `uwp` (UnrealIRCd Web Panel) script is the primary tool for building and managing the web panel:

```bash
./uwp <command>
```

**Available Commands:**

| Command | Description |
|---------|-------------|
| `build` | Build both frontend and backend |
| `build-fe` | Build frontend only |
| `build-be` | Build backend only |
| `start` | Start the web panel server |
| `stop` | Stop the web panel server |
| `restart` | Restart the web panel server |
| `status` | Check if the server is running |
| `logs` | Show recent logs (add `-f` to follow) |
| `dev` | Start development mode (hot reload) |
| `clean` | Remove build artifacts |
| `help` | Show help message |

**Examples:**
```bash
./uwp build          # Build everything
./uwp start          # Start the server
./uwp logs -f        # Follow logs in real-time
./uwp restart        # Restart after config changes
./uwp status         # Check if running
```

### Manual Installation (Alternative)

If you prefer not to use the `uwp` script:

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Go dependencies:
   ```bash
   go mod download
   ```

3. Build the backend:
   ```bash
   go build -o webpanel ./cmd/server
   ```

4. Run the backend:
   ```bash
   ./webpanel
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Copy built files to backend:
   ```bash
   cp -r dist ../backend/frontend
   ```

## Configuration

Create a `config.json` file in the root directory:

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 8080
  },
  "database": {
    "driver": "sqlite",
    "dsn": "data/webpanel.db"
  },
  "auth": {
    "jwt_secret": "your-secret-key-change-in-production",
    "jwt_expiry": "24h",
    "session_duration": "168h"
  },
  "rpc_servers": [
    {
      "name": "Main Server",
      "host": "127.0.0.1",
      "port": 8600,
      "rpc_user": "webpanel",
      "rpc_password": "your-rpc-password",
      "tls_verify_cert": true,
      "is_default": true
    }
  ],
  "encryption_key": "your-32-character-encryption-key!"
}
```

### UnrealIRCd Configuration

Enable JSON-RPC in your UnrealIRCd configuration:

```
/* Enable JSON-RPC module */
loadmodule "rpc/rpc";
loadmodule "rpc/websocket";

/* Configure RPC listener */
listen {
    ip *;
    port 8600;
    options { rpc; }
}

/* Configure RPC user */
rpc-user webpanel {
    match { ip *; }
    password "your-rpc-password";
    permissions {
        /* Adjust permissions as needed */
        server-ban:*;
        server:*;
        channel:*;
        user:*;
        name-ban:*;
        spamfilter:*;
    }
}
```

## Development

### Running in Development Mode

The easiest way to run in development mode is with the `uwp` script:

```bash
./uwp dev
```

This starts both the backend server and the frontend development server with hot reload.

- Backend: http://localhost:8080
- Frontend: http://localhost:5173

Press Ctrl+C to stop both servers.

### Manual Development Setup

Alternatively, run the servers separately:

1. Start the backend:
   ```bash
   cd backend
   go run ./cmd/server
   ```

2. Start the frontend (in a separate terminal):
   ```bash
   cd frontend
   npm run dev
   ```

The frontend development server will proxy API requests to the backend.

## Scheduler (Cron Jobs)

The web panel includes a built-in scheduler for running scheduled commands and email digests. **No external cron setup is required** - the scheduler runs automatically as part of the web panel server.

### Features

- **Scheduled Commands**: Schedule IRC commands (kill, gline, kline, rehash) to run at specific times
- **Cron Expression Support**: Standard cron expressions for flexible scheduling
- **Email Digests**: Send periodic network statistics and alerts via email
- **Graceful Shutdown**: All scheduled tasks are properly stopped when the server shuts down

### Configuration

Scheduled commands are managed through the web interface:
- Navigate to **Settings > Scheduled Commands**
- Create commands with cron expressions like `0 0 * * *` (daily at midnight)
- Commands are stored in the database and automatically loaded on server start

### No Manual Setup Required

Unlike traditional PHP panels that require external cron jobs, this panel:
- Automatically starts the scheduler when the server starts
- Runs all scheduled tasks in-process using goroutines
- Handles graceful shutdown on SIGINT/SIGTERM

## Plugin Marketplace

The web panel includes a plugin marketplace that allows you to extend functionality.

### Official Plugin Repository

Plugins are distributed via the official repository: [ValwareIRC/uwp-plugins](https://github.com/ValwareIRC/uwp-plugins)

### Installing Plugins

1. Navigate to **Settings > Plugin Marketplace** in the web panel
2. Browse available plugins by category
3. Click **Install** to download and install a plugin
4. Enable/disable plugins as needed

### Available Plugins

| Plugin | Description |
|--------|-------------|
| **GeoIP Display** | Display geographic location for connected users with country flags |
| **Connection Statistics** | Track connection statistics with historical data and trends |

### Creating Plugins

See the [Plugin Development Guide](https://github.com/ValwareIRC/uwp-plugins#creating-plugins) for information on creating your own plugins.

### Creating Plugins (Legacy)

Plugins are Go shared objects (.so files) that implement the `Plugin` interface:

```go
package main

import (
    "github.com/gin-gonic/gin"
)

type MyPlugin struct{}

func (p *MyPlugin) Info() PluginInfo {
    return PluginInfo{
        Name:        "my-plugin",
        Version:     "1.0.0",
        Description: "My custom plugin",
        Author:      "Your Name",
    }
}

func (p *MyPlugin) Init() error {
    // Initialize your plugin
    return nil
}

func (p *MyPlugin) RegisterRoutes(r *gin.RouterGroup) {
    // Register custom routes
    r.GET("/my-endpoint", myHandler)
}

func (p *MyPlugin) Shutdown() error {
    // Cleanup
    return nil
}

// Export the plugin
var Plugin MyPlugin
```

Build the plugin:
```bash
go build -buildmode=plugin -o plugins/my-plugin.so my-plugin.go
```

### Using Hooks

Register hooks to extend functionality:

```go
import "backend/internal/hooks"

// Register a hook
hooks.Register(hooks.BeforeUserKill, func(data interface{}) error {
    killData := data.(*KillUserData)
    // Do something before user is killed
    return nil
})
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Get current session
- `POST /api/auth/refresh` - Refresh token

### IRC Users
- `GET /api/users` - List all users
- `GET /api/users/:nick` - Get user details
- `POST /api/users/:nick/kill` - Kill user
- `POST /api/users/:nick/ban` - Ban user
- `POST /api/users/:nick/mode` - Set user mode
- `POST /api/users/:nick/vhost` - Set user vhost

### Channels
- `GET /api/channels` - List all channels
- `GET /api/channels/:name` - Get channel details
- `POST /api/channels/:name/topic` - Set channel topic
- `POST /api/channels/:name/mode` - Set channel mode
- `POST /api/channels/:name/kick` - Kick user from channel

### Servers
- `GET /api/servers` - List all servers
- `GET /api/servers/:name` - Get server details
- `POST /api/servers/:name/rehash` - Rehash server

### Server Bans
- `GET /api/bans/server` - List server bans
- `POST /api/bans/server` - Add server ban
- `DELETE /api/bans/server/:name` - Remove server ban

### Name Bans
- `GET /api/bans/name` - List name bans
- `POST /api/bans/name` - Add name ban
- `DELETE /api/bans/name/:name` - Remove name ban

### Ban Exceptions
- `GET /api/bans/exceptions` - List ban exceptions
- `POST /api/bans/exceptions` - Add ban exception
- `DELETE /api/bans/exceptions/:name` - Remove ban exception

### Spamfilters
- `GET /api/spamfilters` - List spamfilters
- `POST /api/spamfilters` - Add spamfilter
- `DELETE /api/spamfilters/:id` - Remove spamfilter

### Panel Management
- `GET /api/panel-users` - List panel users
- `POST /api/panel-users` - Create panel user
- `PUT /api/panel-users/:id` - Update panel user
- `DELETE /api/panel-users/:id` - Delete panel user

### Roles
- `GET /api/roles` - List roles
- `POST /api/roles` - Create role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role

## License

This project is open source and available under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.en.html) or later.

## Credits

This is a port of the [UnrealIRCd Web Panel](https://github.com/unrealircd/unrealircd-webpanel) to Go and React.

Uses the [unrealircd-rpc-golang](https://github.com/ObsidianIRC/unrealircd-rpc-golang) library for RPC communication.
