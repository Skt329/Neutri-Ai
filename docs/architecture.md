# NeutriAI — Architecture Documentation

## System Overview

NeutriAI is a **Next.js 16 App Router** progressive web application that serves as an AI-powered nutrition assistant. It combines conversational AI with structured nutrition tracking, pantry management, and food ordering integration.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.x |
| Database | Supabase (PostgreSQL + RLS) |
| ORM | Prisma (schema management) |
| Cache | Upstash Redis (REST) |
| AI | Azure OpenAI (GPT-4.1-mini) + NVIDIA NIM |
| Auth | Supabase Auth |
| Hosting | Vercel |
| Monitoring | Sentry |
| PWA | Serwist |

---

## Directory Structure

```
app/
├── (app)/          # Authenticated app routes
│   ├── chat/       # AI chat interface
│   ├── dashboard/  # Nutrition dashboard
│   ├── meals/      # Meal history
│   ├── pantry/     # Pantry management
│   ├── profile/    # User profile
│   ├── barcode/    # Barcode scanner
│   └── swiggy/     # Swiggy integration
├── api/            # API routes
│   ├── chat/       # Chat streaming endpoint
│   ├── nutrition/  # Nutrition lookup
│   └── ...
├── auth/           # Auth pages
└── onboarding/     # Onboarding flow

lib/
├── ai/             # AI module
│   ├── system-prompt.ts  # Prompt builder with sanitization
│   ├── chat-context.ts   # Context assembly with caching
│   ├── chat-persistence.ts # Message persistence
│   ├── context-manager.ts  # Token budget management
│   ├── tools.ts           # Tool registry
│   └── tools/             # Tool implementations
│       ├── meal-tools.ts
│       ├── pantry-tools.ts
│       ├── nutrition-tools.ts
│       ├── profile-tools.ts
│       └── swiggy-*.ts
├── api/            # API utilities
│   ├── with-auth.ts      # Auth middleware
│   └── error-handler.ts  # Unified error handler
├── config/         # Centralized configuration
│   └── index.ts
├── nutrition/      # Nutrition data service
│   ├── providers/         # Strategy pattern
│   │   ├── provider.interface.ts
│   │   ├── usda.provider.ts
│   │   └── openfoodfacts.provider.ts
│   ├── nutrition-lookup.ts # Orchestrator
│   ├── usda-client.ts
│   ├── openfoodfacts-client.ts
│   └── types.ts
├── redis/          # Redis module (SRP-split)
│   ├── client.ts          # Connection
│   ├── cache.ts           # Key-value caching
│   ├── rate-limiter.ts    # Rate limiting
│   └── token-tracker.ts   # Token usage
├── supabase/       # Supabase clients
├── types/          # Domain types (ISP-split)
│   ├── profile.types.ts
│   ├── meal.types.ts
│   ├── pantry.types.ts
│   └── ...
├── validation/     # Zod schemas
└── errors.ts       # Error class hierarchy

components/
├── chat/           # Chat UI components
├── today/          # Dashboard widgets
├── navigation/     # Nav components
└── ui/             # Shared UI (shadcn)
```

---

## Data Flow

```
User Input → API Route → withAuth middleware
  ├── Auth check (Supabase getUser)
  ├── Rate limiting (Upstash Redis)
  ├── Validation (Zod schemas)
  ├── Business Logic
  │   ├── Chat: Context assembly → System prompt → AI streaming → Persistence
  │   ├── Nutrition: Cache check → USDA/OFF lookup → Cache write
  │   └── CRUD: Supabase query with RLS
  └── Error handling (AppError → handleApiError)
```

---

## Design Patterns

| Pattern | Location | Purpose |
|---|---|---|
| **Strategy** | `lib/nutrition/providers/` | Swappable nutrition data sources |
| **Singleton** | `lib/redis/client.ts` | Single Redis connection |
| **Builder** | `lib/ai/system-prompt.ts` | Composable prompt sections |
| **Circuit Breaker** | `lib/ai/mcp-circuit-breaker.ts` | External service resilience |
| **Middleware** | `lib/api/with-auth.ts` | Cross-cutting auth/error handling |
| **Observer** | `lib/auth/session-manager.ts` | Cross-tab session sync via BroadcastChannel |
| **Error Hierarchy** | `lib/errors.ts` | Typed errors with HTTP status codes |

---

## Security Model

1. **Authentication**: Supabase JWT via `getUser()` (server-verified, not local cookie trust)
2. **Authorization**: Row Level Security (RLS) on all tables
3. **Rate Limiting**: Upstash Redis sliding window (per-user for chat, global for USDA)
4. **CSP**: Strict Content-Security-Policy with `unsafe-eval` only in development
5. **Prompt Injection**: User-supplied data sanitized before system prompt injection
6. **Server-Only Guards**: `import 'server-only'` on modules using service role keys
7. **CORS**: Origin-restricted with explicit allowlist
8. **Input Validation**: Zod schemas on all request bodies with max body size enforcement

---

## Testing

- **Framework**: Vitest + Testing Library
- **Unit Tests**: `tests/lib/` — business logic (nutrition, streaks, alerts, gaps, stats)
- **Run**: `npm run test:run` or `npx vitest run`
