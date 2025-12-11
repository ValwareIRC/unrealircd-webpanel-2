# Runa - AI Network Assistant 🤖

**R**esponsive **Un**realIRCd **N**etwork **A**gent

Runa is an intelligent AI assistant for the UnrealIRCd Web Panel that helps you manage your IRC network using natural language. Ask questions, get insights, and perform actions - all through a conversational interface.

## Features

- 🗣️ **Natural Language Interface** - Ask questions in plain English
- 🔧 **Network Management** - Query users, channels, bans, and server status
- 📊 **Real-time Insights** - Get summaries and analytics about your network
- 🛡️ **Moderation Assistance** - Help with bans, kicks, and user management
- 💾 **Conversation Memory** - Maintains context across your chat session
- ⌨️ **Keyboard Shortcut** - Quick access with Ctrl+Shift+R
- 🎨 **Multiple AI Providers** - Works with OpenAI, Anthropic, Ollama, or custom endpoints

## Setup

1. Install the plugin from the Marketplace
2. Open Runa from the sidebar or press **Ctrl+Shift+R**
3. Click the ⚙️ settings icon
4. Enter your AI provider credentials:
   - **OpenAI**: Get an API key from [platform.openai.com](https://platform.openai.com)
   - **Anthropic**: Get an API key from [console.anthropic.com](https://console.anthropic.com)
   - **Ollama**: Enter your local Ollama server URL (e.g., `http://localhost:11434`)
   - **Custom**: Enter any OpenAI-compatible API endpoint

## Example Queries

### Network Overview
- "How many users are connected right now?"
- "Show me a summary of network activity"
- "What channels have the most users?"

### User Management
- "Find all users from IP range 192.168.*"
- "Who is using the nick 'Admin'?"
- "Show me users who are opers"

### Channel Information
- "What's the topic of #help?"
- "How many users are in #general?"
- "List all registered channels"

### Moderation
- "What G-Lines are currently active?"
- "Show me recent bans"
- "Are there any spamfilters matching 'spam'?"

### Server Status
- "How long has the server been running?"
- "What modules are loaded?"
- "Show me the network topology"

## Privacy & Security

- **API keys are stored locally** in your browser's localStorage - they never touch our servers
- **Conversation history is session-only** - cleared when you close the browser
- **All API calls go directly** from your browser to your chosen AI provider
- **Network data stays on your server** - only summaries are sent to the AI

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| AI Provider | OpenAI, Anthropic, Ollama, or Custom | OpenAI |
| API Key | Your API key for the provider | - |
| Custom Endpoint | URL for Ollama or custom providers | - |
| Model | AI model to use | gpt-4o-mini |
| Keyboard Shortcut | Key for Ctrl+Shift+? to toggle | R |
| Auto-Fetch Context | Load network stats on startup | true |
| Max History | Messages to keep in memory | 50 |

## Supported AI Providers

### OpenAI
- Models: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
- Endpoint: api.openai.com

### Anthropic (Claude)
- Models: claude-3-5-sonnet-20241022, claude-3-opus, claude-3-haiku
- Endpoint: api.anthropic.com

### Ollama (Local)
- Models: llama3, mistral, codellama, etc.
- Endpoint: Your local Ollama server

### Custom
- Any OpenAI-compatible API endpoint
- Great for self-hosted solutions or alternative providers

## Technical Details

Runa uses the panel's existing API to fetch network data:
- `/api/users` - User information
- `/api/channels` - Channel data
- `/api/bans/server` - Server bans (G-Lines, K-Lines, etc.)
- `/api/servers` - Server information
- `/api/stats` - Network statistics

The AI is provided with comprehensive context about UnrealIRCd, IRC concepts, and your specific network state to give accurate and helpful responses.

## Troubleshooting

**"API key not configured"**
- Open settings (⚙️) and enter your API key

**"Failed to fetch network data"**
- Check that you're logged into the panel
- Verify your session hasn't expired

**"AI request failed"**
- Verify your API key is correct
- Check your API provider's status page
- For Ollama, ensure the server is running

## License

MIT License - See [LICENSE](./LICENSE) file

## Author

**ValwareIRC**
- GitHub: [@ValwareIRC](https://github.com/ValwareIRC)
- IRC: Valware on irc.unrealircd.org

---

*"Hello! I'm Runa, your friendly IRC network assistant. How can I help you today?"* 🌟
