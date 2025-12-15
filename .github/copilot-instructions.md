<!-- .github/copilot-instructions.md -->
# UnrealIRCd Web Panel — Copilot Instructions

Summary
- This repo contains a Go backend (API & services) and a React + Vite frontend. The backend communicates with UnrealIRCd via secure WebSocket JSON-RPC (`unrealircd-rpc-golang`). There is a plugin/hook system and an in-process scheduler. Key directories: `backend/`, `frontend/`, `internal/`.

Quickstart (how to run & test)
- Recommended: use the helper script `./uwp` from the repository root.
  - Build everything: `./uwp build` (runs frontend build, copies to `backend/frontend`, builds Go binary)
  - Start (background): `./uwp start` → PID file at `backend/data/webpanel.pid`, logs at `backend/data/webpanel.log`
  - Dev (hot reload both): `./uwp dev`
- Manual alternatives:
  - Backend: `cd backend && go mod download && go run ./cmd/server` or build binary `go build -o webpanel ./cmd/server`.
  - Frontend: `cd frontend && npm install && npm run dev` or `npm run build`.
- Tests & CI: backend tests are Go unit tests: `cd backend && go test ./...`. CI also runs `go vet`.

Important patterns & conventions
- Config: `config.json` (root) is loaded by `backend/internal/config`. Defaults are set when missing; `cfg.Auth.EncryptionKey` may be generated on first run (see `backend/cmd/server/main.go`).
- Secrets: RPC passwords are encrypted with AES-256-GCM helpers in `backend/internal/utils/utils.go` (Encrypt/Decrypt). The encryption key is padded/truncated to 32 bytes — follow this when writing crypto helpers or tests.
- RPC: `backend/internal/rpc/client.go` provides a `Manager` singleton. Use `rpc.GetManager().WithRetry(...)` for safe RPC calls (automatic reconnect on connection errors). Use `NewDedicatedClient()` for log/event streaming to avoid interfering with the main connection.
- Plugins & hooks:
  - Plugin manifests live in plugin folders (`plugin.json`) and are used by the backend. See `backend/internal/plugins` and example `internal/plugins/runa/`
  - Frontend assets for plugins are declared via DB fields (`FrontendScripts`, `FrontendStyles`) as JSON arrays and served through `/api/plugins/:id/assets/:filename` and `/api/plugins/frontend-assets`.
  - Available hook types are enumerated in `backend/internal/hooks/hooks.go` and exposed by the API (`/api/plugins/hooks`).
- API routing & auth:
  - Routes are set up in `backend/internal/api/routes/routes.go`.
  - Auth: JWT tokens, handled by `backend/internal/api/middleware/auth.go`. For SSE endpoints, the token may be passed as a query param (EventSource doesn't support headers).
  - Use `middleware.PermissionMiddleware(models.PermissionX)` to protect endpoints and follow existing patterns.
- Database: GORM (auto-migrations in `backend/internal/database`). Default roles and an initial admin user are created on first run.

Developer tips & debugging
- Logs: check `backend/data/webpanel.log`. Use `./uwp logs -f` to tail logs.
- Startup behavior: `./uwp start` backgrounds the server after an initial foreground check. When debugging, run the binary directly (no nohup) to see startup errors immediately.
- RPC debugging: call `TestConnection()` in `backend/internal/rpc/client.go` via the API endpoint that tests RPC server (`/api/rpc-servers/test`) or use the UI at Settings → RPC Servers.
- Translating / i18n: frontend translations live in `frontend/src/locales/*.json` and are registered in `frontend/src/i18n.ts`. To add a locale: add the file and import/map it in `i18n.ts`, then update frontend build.

Code review guidance for AI agents
- Keep changes narrowly scoped and reference the pattern files above — e.g., when adding an API route, mirror how permissions are enforced in `routes.go` and use existing handler patterns (`handlers/*.go`).
- Prefer using exported helpers and singletons (`rpc.GetManager()`, `database.Get()`, `plugins.GetManager()`) instead of creating ad-hoc instances.
- For network/RPC code, rely on `rpc.Manager.WithRetry` to preserve the reconnection semantics and to avoid duplicating error classification logic (`isConnectionError`).
- When touching security (auth/JWT/encryption), reference `backend/internal/auth` and `backend/internal/utils/utils.go` to remain consistent with how secrets are generated and stored.

CI/Release notes for automation
- The repository's CI (`.github/workflows/ci.yml`) runs `go test`, `go vet`, installs frontend deps (`npm ci`), builds via `./uwp build`, and creates release artifacts (archive + tag with `v1.0.<run>-beta`). Keep changes compatible with the `uwp` build process.

If anything here is unclear or you'd like examples expanded (e.g., a short sample change adding an API route with permission checks and a handler), tell me which area to expand and I'll iterate. ✅
