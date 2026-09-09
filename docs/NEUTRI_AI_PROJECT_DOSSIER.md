# Neutri-Ai Project Dossier (Deep Technical Brief)

## 1) Project Identity

**Project:** NeutriAI (Neutri-Ai repository)  
**Type:** AI-first nutrition coaching Progressive Web App (PWA)  
**Core value:** Combines meal tracking, pantry intelligence, personalized target calculation, and conversational AI into a single assistant workflow.

### Short project pitch
NeutriAI is a full-stack, production-oriented nutrition platform where users can log meals, manage pantry inventory, track weight and streaks, and receive personalized guidance through an AI chat layer. The system uses Azure OpenAI for reasoning/tool-calling, NVIDIA NIM for vector memory retrieval, Supabase (Postgres + RLS + pgvector) for secure multi-tenant persistence, and Redis for latency and cost control.

---

## 2) Product Scope and Features

### User-facing capabilities
- Conversational AI dietitian (tool-driven, not plain text only)
- Manual and AI-assisted meal logging
- Nutrition lookup (USDA + Open Food Facts fallback chain)
- Pantry management with nutrition metadata
- Recipe suggestions from pantry inventory
- Auto-computed macro/calorie targets using profile metrics
- Weight logging + progress trends
- Streak and deficit alerts for adherence nudges
- Barcode scan flow for pantry ingestion
- Shared read-only chat links
- PWA offline shell and install flow
- Swiggy OAuth + MCP integration groundwork, smart nutrition-aware order layer

### Route map (high level)
- Authenticated app: `/dashboard`, `/chat`, `/meals`, `/pantry`, `/profile`, `/swiggy`, `/barcode`
- API: `/api/chat`, `/api/nutrition`, `/api/barcode/*`, `/api/swiggy/*`, `/api/cron/*`, `/api/health`, `/api/streak`
- Public share route: `/shared/[token]`

---

## 3) Architecture Overview

### Frontend
- Next.js App Router + React 19 + TypeScript
- Mobile-first UI with shadcn/Radix primitives
- Interactive tool cards for AI confirmations
- PWA via Serwist service worker

### Backend / Platform
- Next.js route handlers + server actions
- Supabase auth/session + RLS-protected tables
- Prisma schema for typed model representation
- SQL migration scripts for Supabase-specific features (RLS policies, pgvector functions, cron helpers)

### AI Layer
- `streamText` (Vercel AI SDK) in `/api/chat`
- Azure OpenAI (`gpt-4.1-mini`) for chat and structured extraction
- NVIDIA NIM embeddings for memory retrieval and dedup
- Tool architecture split into client tools (confirm/collect) and server tools (persist/read)

### Caching/Rate limiting
- Upstash Redis for:
  - rate limits (chat, nutrition, USDA)
  - user context cache for chat turns
  - Swiggy MCP tool-definition cache
  - token usage telemetry
- In-memory fallback when Redis is unavailable

---

## 4) End-to-End Request Flows

## 4.1 Chat turn flow (`/api/chat`)
1. Authenticate user + parse request in parallel.
2. Run in parallel:
   - chat rate-limit check
   - conversation ownership validation
   - context loading (profile/targets/totals/streak/memories)
   - Swiggy tool discovery (if token exists)
3. Build system prompt with dynamic user context + safety rules.
4. Build tools (core + smart Swiggy + MCP tools).
5. Stream response from model.
6. On completion:
   - track token usage async
   - persist new/updated messages
   - generate conversation title (if absent)
   - clean up MCP client connections

### Why this matters
This design is tuned for serverless latency and reliability under multi-dependency conditions.

## 4.2 Deferred long-term memory extraction (`/api/cron/extract-memories`)
1. Auth via cron secret and/or vercel cron signature.
2. Pull stale conversations (inactive 3+ hours).
3. Build full conversation text.
4. Extract durable user facts via structured model output (`zod` schema).
5. Batch-embed extracted memories (`nimEmbedBatch`).
6. Semantic dedup against existing pgvector memories (similarity threshold).
7. Insert only new facts and mark conversation extracted.

### Why this matters
Memory extraction is shifted out of user chat latency path, reducing turn time and cost while preserving personalization.

## 4.3 Nutrition lookup flow
1. Validate request + rate limit.
2. Try shared `nutrition_cache` first.
3. Query USDA (primary).
4. Fallback to Open Food Facts.
5. Cache top results with 30-day TTL.

## 4.4 Swiggy connect flow
1. `/api/swiggy/connect` creates PKCE verifier/challenge + CSRF state.
2. State + verifier stored in short-lived httpOnly cookies.
3. Callback exchanges code for token.
4. Token encrypted with AES-256-GCM before DB upsert.
5. Chat route consumes decrypted token for MCP tool access.

---

## 5) Data Model (public domain)

Core tables:
- `profiles`: demographics, dietary constraints, cooking context, onboarding status
- `nutrition_targets`: historical target snapshots by `effective_from`
- `meal_logs`: meal entries with macro fields + JSON items + source channel
- `pantry_items`: inventory + categories + nutrition basis + expiry
- `conversations`: chat sessions + extraction watermark (`memory_extracted_at`)
- `messages`: ordered AI SDK message parts (`ordinal` solves deterministic order)
- `memories`: long-term user facts + vector embeddings
- `weight_logs`: bodyweight time series
- `swiggy_tokens`: encrypted user token + expiry + scopes
- `shared_chats`: token-based read-only sharing
- `nutrition_cache`: shared public nutrition lookup cache

### Data governance choices
- RLS enabled broadly for tenant isolation.
- Service-role only writes for shared infra tables (e.g., nutrition cache).
- Triggered profile bootstrap on auth user creation.
- Trigger-based profile weight sync from `weight_logs`.

---

## 6) Security Model

### Strong controls implemented
- Verified auth (`getUser`) instead of trusting cookies alone
- RLS-first authorization model in Postgres
- Request validation via Zod schemas + body-size limit enforcement
- CSP + hardened security headers in middleware
- CORS allowlist for controlled origins
- Prompt-injection mitigation in system prompt + input sanitization
- Swiggy OAuth with PKCE + CSRF state check
- Encrypted Swiggy token storage (AES-256-GCM)
- Cron endpoint hardening (secret + timestamp anti-replay)

### Security tradeoff
- Security checks add request overhead (extra auth and validation), accepted for correctness and tenant isolation.

---

## 7) Reliability and Failure Handling

Patterns used:
- Retry wrappers around `supabase.auth.getUser()` for transient failures
- Timeout wrappers in health checks and Swiggy discovery
- Circuit-breaker utility for unstable external dependencies
- Non-blocking failure handling where possible (e.g., token tracking, cache writes)
- MCP cleanup callback to prevent connection leaks in serverless
- Graceful fallback behavior when services degrade (Redis memory fallback, nutrition estimation fallback)

---

## 8) Performance Strategy

- Parallelized phase execution in chat route
- Redis-backed short TTL context cache to remove repeated DB fan-out
- Message context truncation strategy to cap LLM token cost/latency
- Deterministic message ordinal index for read-order consistency
- 30-day nutrition cache to amortize API calls
- Swiggy MCP tool-definition cache keyed by hashed token
- Request-scoped React `cache()` for repeated server fetches in a render pass

---

## 9) Testing and CI

### Tests
Vitest suite emphasizes business logic correctness:
- nutrition target computation
- streak logic
- meal-gap rules
- deficit alerts
- context truncation
- validation schema boundaries
- weekly stats/report generation
- circuit breaker behavior

### CI pipeline (`.github/workflows/ci.yml`)
- Lint + typecheck
- Unit tests
- Production build (depends on prior stages)

This enforces baseline quality for every push/PR to `main`/`azure`.

---

## 10) Key Engineering Tradeoffs

1. **Deferred memory extraction vs immediate memory persistence**  
   - Chosen: deferred cron pipeline.  
   - Benefit: fast chat turns, lower immediate token costs.  
   - Cost: memory freshness lag.

2. **Rich system prompt control vs maintainability**  
   - Chosen: large, layered prompt with strict behavioral constraints.  
   - Benefit: strong guardrails and domain focus.  
   - Cost: prompt complexity and regression risk when edited.

3. **Hybrid migration ownership (Prisma + raw SQL scripts)**  
   - Benefit: flexibility for Supabase/RLS/pgvector-specific setup.  
   - Cost: schema drift risk and operational complexity.

4. **Fallback-heavy resilience vs architectural simplicity**  
   - Benefit: app remains usable under partial outage.  
   - Cost: more branches to test and observe.

5. **Strict confirmation-gated writes vs UX speed**  
   - Benefit: prevents unintended mutations from AI.  
   - Cost: additional interaction steps.

---

## 11) Problems Faced (Inferred from Implementation Decisions)

These are strongly indicated by code comments and architecture choices:

- **Chat latency under multi-query context load** → solved by parallel phase execution + Redis context cache.
- **Token/context blow-up in long chats** → solved by truncation policy preserving first + latest conversational anchors.
- **External integration instability (MCP/API)** → solved with timeout, retries, circuit-breaker, and non-blocking fallbacks.
- **Message ordering collisions during batch inserts** → solved with explicit `ordinal` migration/index.
- **Service worker registration rejection noise in production** → solved by manual guarded registration with `.catch()`.
- **Prompt-injection and role override risks** → solved by layered security prompt section + sanitization of injected user profile/memory text.
- **Replay risk on cron endpoint** → mitigated by request timestamp age checks.
- **Cross-surface integration transition complexity (legacy adapter vs new MCP path)** → visible as parallel integration paths, signaling migration-stage architecture.

---

## 12) Known Risks / Technical Debt

- **Schema drift risk:** Prisma public model fields and SQL scripts are not perfectly aligned in all places, indicating potential migration drift over time.
- **Dual Swiggy pathways:** legacy adapter abstractions co-exist with MCP token-manager flow, increasing cognitive overhead.
- **Very large system prompt:** high control, but requires disciplined versioning/testing to avoid behavior regressions.
- **Timezone handling simplifications:** some date bucketing comments indicate pragmatic approximations rather than full timezone-normalized query boundaries.

---

## 13) Interview-Ready Differentiators

- Production-style architecture despite being a single product repo.
- Explicit reliability design for external AI/tool dependencies.
- Real security posture: RLS, PKCE, encryption-at-rest for provider tokens, hardened middleware.
- Practical AI product pattern: structured tool calling + human confirmation gate + deferred memory pipeline.
- Strong emphasis on observability and quality gates (health route, logging, Sentry, CI, tests).

---

## 14) High-Value File Index (For Technical Discussions)

- Chat orchestration: `/app/api/chat/route.ts`
- Prompt and safety architecture: `/lib/ai/system-prompt.ts`
- Context assembly/caching: `/lib/ai/chat-context.ts`, `/lib/ai/context-cache.ts`
- Tool registry and domains: `/lib/ai/tools.ts`, `/lib/ai/tools/*`
- Memory retrieval/extraction: `/lib/ai/memory.ts`, `/app/api/cron/extract-memories/route.ts`
- Nutrition lookup pipeline: `/lib/nutrition/nutrition-lookup.ts`
- Auth/security middleware: `/lib/supabase/proxy.ts`, `/lib/api/with-auth.ts`
- DB schema/policies/functions: `/scripts/001_schema.sql`, `/scripts/002_functions.sql`, `/scripts/003_*.sql`
- Swiggy auth/token security: `/lib/swiggy/mcp/token-manager.ts`, `/app/api/swiggy/*`
- Reliability support: `/lib/redis/*`, `/lib/ai/mcp-circuit-breaker.ts`, `/app/api/health/route.ts`
- PWA/offline: `/app/sw.ts`, `/components/register-sw.tsx`, `/app/~offline/page.tsx`

---

## 15) One-Line Executive Summary

NeutriAI is a domain-focused, tool-augmented AI nutrition platform built with production-grade security, resilience, and performance patterns, with clear evidence of solving real-world issues around AI latency, data safety, and integration reliability.
