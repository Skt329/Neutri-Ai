# Neutri-Ai AI Agent Handoff Brief

Use this as the canonical operational context for agents answering deep project questions.

## 1) Ground Truth Summary

- NeutriAI is an AI nutrition assistant with meal, pantry, profile, and streak workflows.
- Core orchestration lives in Next.js API routes and server actions.
- Persistence is Supabase Postgres with strict RLS.
- Chat intelligence is Azure OpenAI; embeddings/memory search use NVIDIA NIM.
- Redis is used for rate limits, context caching, and MCP tool cache.

## 2) Where to Look First (Priority File Map)

1. Chat pipeline: `/app/api/chat/route.ts`
2. Prompt policy: `/lib/ai/system-prompt.ts`
3. Tool architecture: `/lib/ai/tools.ts` and `/lib/ai/tools/*`
4. Context and caching: `/lib/ai/chat-context.ts`, `/lib/ai/context-cache.ts`
5. Memory retrieval/extraction:
   - `/lib/ai/memory.ts`
   - `/app/api/cron/extract-memories/route.ts`
6. Nutrition stack:
   - `/lib/nutrition/nutrition-lookup.ts`
   - `/app/api/nutrition/route.ts`
7. Security/auth boundary:
   - `/lib/supabase/proxy.ts`
   - `/lib/api/with-auth.ts`
   - `/lib/validation/api-schemas.ts`
8. Swiggy auth/tokens:
   - `/lib/swiggy/mcp/token-manager.ts`
   - `/app/api/swiggy/*`
9. SQL/RLS model:
   - `/scripts/001_schema.sql`
   - `/scripts/002_functions.sql`
   - `/scripts/003_*` + `004/005/006`
10. Reliability/ops:
   - `/lib/redis/*`
   - `/app/api/health/route.ts`
   - `/lib/logger.ts`

## 3) Core Architecture Decisions to Mention

- Tool-gated AI writes (confirmation-first) to prevent unintended mutations.
- Deferred memory extraction to protect chat latency.
- Semantic long-term memory with vector dedup.
- RLS-first security model for tenant-safe data access.
- Aggressive latency optimization through parallelization + caching.

## 4) Inferred “Problems Faced” + Implemented Solutions

1. **High chat latency from multi-source context**  
   Solution: parallelized phase design + Redis context cache + fire-and-forget non-critical ops.

2. **Long conversations causing high token/cost pressure**  
   Solution: context truncation with preserved anchor messages.

3. **External integration instability (APIs/MCP)**  
   Solution: timeout guards, retries, circuit-breaker utility, graceful degradation.

4. **Message ordering issues in persistent history**  
   Solution: `ordinal` migration and indexing for deterministic ordering.

5. **Service worker registration error noise**  
   Solution: explicit guarded SW registration with catch handling.

6. **Prompt injection and role override risk**  
   Solution: layered anti-injection prompt rules + sanitization of dynamic context.

7. **Cron endpoint replay/security concerns**  
   Solution: secret auth + request timestamp freshness validation.

## 5) Tradeoff Narrative (Interview-safe)

- Prioritized correctness and safety over minimal UX friction.
- Prioritized latency and reliability over architecture simplicity.
- Accepted deferred consistency in memory for better interactive performance.
- Accepted mixed migration strategy for Supabase-specific power, while introducing drift risk.

## 6) Known Limitations / Debt to Acknowledge

- Swiggy integration appears to be in a transitional state (legacy adapter + MCP route coexistence).
- Prisma schema and SQL script source-of-truth boundaries can drift.
- Large system prompt requires disciplined regression testing and versioning.

## 7) Operational Runbook Commands

From repo root (`/home/runner/work/Neutri-Ai/Neutri-Ai`):

- Install: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Type check: `npm run typecheck`
- Tests: `npm run test:run`
- Build: `npm run build`

## 8) High-Confidence Talking Points

- This project is not just an LLM wrapper; it is a structured, secure AI system with clear boundary enforcement.
- It demonstrates production patterns: RLS authz, validation layers, failure isolation, and observability.
- The architecture shows deliberate handling of practical AI issues: latency, memory quality, and tool safety.

## 9) If Asked “What Would You Improve Next?”

- Consolidate migration ownership and enforce schema-drift checks.
- Fully unify Swiggy integration path and remove legacy adapter surface.
- Expand integration and E2E tests around chat tool-call workflows.
- Add richer memory governance (confidence/source lineage/feedback loop).

## 10) One-paragraph interview answer template

NeutriAI is an AI-native nutrition platform where I focused on making conversational AI safe, fast, and production-ready. I used a tool-gated architecture so the model can’t mutate user data without explicit confirmation, moved long-term memory extraction to deferred cron jobs to keep chat latency low, and added vector-based memory retrieval for personalization. I secured the data layer with Supabase RLS, hardened request boundaries with validation and middleware security headers, and built resilience with retries, timeout guards, caching, and fallback strategies. The key tradeoff was higher architectural complexity in exchange for reliability and trustworthy user-facing AI behavior.
