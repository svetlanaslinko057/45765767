# ATLAS DevOS / EVA-X — Product Requirements (Cloned & Bootstrapped)

## Source
- GitHub: https://github.com/svetlanaslinko057/we112e12e121
- Cloned: May 12, 2026
- Last commit reviewed: `3f10a61` Auto-generated changes (Theme tokens migration across web admin + Expo)

## Architecture (3 surfaces, 1 backend)

### 1. Backend — FastAPI (`/app/backend`)
- Entry: `server.py` (~25k LOC, 70+ submodules)
- Stack: FastAPI 0.110 + Motor (MongoDB) + Socket.IO + emergentintegrations + slowapi + sentence-transformers
- Port: 8001 (uvicorn `--reload`)
- DB: MongoDB (`MONGO_URL`, `DB_NAME` from `/app/backend/.env`)
- Mounts:
  - `/api/*` — all business endpoints (auth, projects, workflow, finance, team, QA, mobile compat, operator engine, intelligence, contracts, payments, integrations)
  - `/api/web-ui/*` — serves CRA build from `/app/web/build`
  - Socket.IO via `python-socketio`
- Key engines: assignment_engine, acceptance_layer, time_tracking, event_engine, decomposition_engine, money_runtime, operator_engine, scaling_engine, system_truth, mobile_adapter

### 2. Web (CRA + Craco) — `/app/web`
- Entry: `src/index.js` → `src/App.js`
- Stack: React 19 + react-router-dom 7 + @radix-ui + tailwind + recharts + socket.io-client + @react-oauth/google
- Routes: Landing, Client Auth, Builder Auth, Admin Login, Client / Developer / Tester / Admin (7 zones) dashboards, ProjectDetails, ScopeBuilder, AdminWarRoom, ExecutionIntelligence, etc.
- Build: `yarn build` → `/app/web/build` (homepage `/api/web-ui`, served by backend)
- Env: `/app/web/.env` (REACT_APP_BACKEND_URL, DISABLE_ESLINT_PLUGIN, CI=false)

### 3. Mobile (Expo SDK 54) — `/app/frontend`
- Entry: `app/index.tsx` (expo-router file-based routing)
- Stack: Expo Router 6, React Native 0.81, react-native-reanimated 4, axios, socket.io-client, AsyncStorage
- Surfaces: client cabinet, developer market/wallet/work, admin cockpit (5 screens — operational only per scope-freeze), tester (planned Stage 4), lead conversion
- Port: 3000 (Metro via `--tunnel`)

## Cross-cutting
- Runtime-client capability gate: `/app/packages/runtime-client` (shared by web + expo)
- Design system: `/app/design_guidelines.json` (dual-theme dark/light, ATLAS DevOS tokens)
- Scope frozen May 9, 2026 (`docs/product-scope-freeze.md`): Mobile admin = cockpit only; Web admin = canonical; Lead = pre-auth conversion screen

## Status (post-bootstrap)
| Component | Status | URL |
|-----------|--------|-----|
| Backend FastAPI | ✅ Running (8001) | `/api/healthz`, `/api/auth/login` |
| Web platform (CRA build) | ✅ Built & served | `/api/web-ui/` |
| Web admin | ✅ Available | `/api/web-ui/admin/login` |
| Mobile (Expo Metro) | ✅ Bundling | `/` |
| MongoDB | ✅ Running | localhost:27017 |
| Seed users | ✅ Created | admin@atlas.dev, john@atlas.dev, client@atlas.dev, multi@atlas.dev |
| Seed projects | ✅ 2 projects, 7 modules, demo invoices | |

## Pending Integrations (env keys needed if/when used)
- `EMERGENT_LLM_KEY` (LLM features in execution_intelligence, scope builder)
- `RESEND_API_KEY` (email) — currently MOCK
- `CLOUDINARY_*` (files) — currently MOCK (local fs)
- `STRIPE_*` (payments) — provider MOCK
- `GOOGLE_CLIENT_ID` (OAuth) — fallback dev id present

## Known dev warnings (non-blocking)
- Web build: `@react-native-async-storage/async-storage` not resolved in runtime-client adapters (web bundle warns but builds — adapter is gated by platform check)
- Expo: ngrok tunnel had intermittent outages on first boot, recovered automatically
