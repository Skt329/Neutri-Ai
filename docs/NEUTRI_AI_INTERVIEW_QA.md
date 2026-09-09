# Neutri-Ai Interview Q&A Bank

## A) Product and Vision

1. **What problem does NeutriAI solve?**  
   It unifies meal logging, nutrition coaching, pantry intelligence, and behavior tracking into a single conversational workflow.

2. **Who is the primary user?**  
   Health-conscious users who want practical, personalized nutrition guidance with low friction.

3. **What makes this different from a normal calorie tracker?**  
   The assistant is tool-driven, context-aware, and memory-backed, not just form-based logging.

4. **Why conversation-first UX?**  
   It lowers input friction and lets one interface handle logging, guidance, edits, and recommendations.

## B) Architecture

5. **Why Next.js App Router?**  
   It supports integrated frontend/backend patterns, server actions, route handlers, and cache-aware rendering.

6. **Why Supabase?**  
   It provides auth, Postgres, and RLS in one stack with operational speed.

7. **Why Redis (Upstash)?**  
   For low-latency rate limiting, context caching, and external tool caching.

8. **Why Azure OpenAI + NVIDIA NIM split?**  
   Azure handles chat/tool reasoning; NIM handles embeddings with query/passage asymmetry.

9. **How is multi-tenant isolation enforced?**  
   Mainly through RLS policies and user-scoped queries.

10. **Where is orchestration complexity centralized?**  
   In `/app/api/chat/route.ts` with staged parallel execution.

## C) AI/LLM Design

11. **How do you prevent unsafe auto-writes by AI?**  
   Client confirmation cards are required before write tools execute.

12. **Why split client tools and server tools?**  
   To separate user confirmation UX from mutation logic and reduce accidental writes.

13. **How do you keep prompts safe from profile/memory injection?**  
   User-derived prompt fields are sanitized before insertion.

14. **How do you handle long chat histories?**  
   Token-aware truncation preserves first message + latest context window.

15. **How do you persist memory without hurting turn latency?**  
   Memory extraction runs asynchronously via cron after inactivity.

16. **How is memory deduplicated?**  
   Semantic similarity checks using pgvector + NIM embeddings.

17. **What happens when nutrition lookup fails?**  
   The AI is instructed to estimate and explicitly mark estimates.

## D) Data and Modeling

18. **How are nutrition targets generated?**  
   Via Mifflin-St Jeor + activity factor + goal-specific macro splits.

19. **Why keep target history in `nutrition_targets` instead of mutating one row?**  
   Historical snapshots preserve progression and auditability.

20. **Why does `messages` use `ordinal`?**  
   Deterministic ordering, avoiding timestamp collision reordering.

21. **How do shared chats work securely?**  
   Tokenized read-only links with active flag and RLS policies enabling scoped public reads.

22. **How are external API nutrition responses reused?**  
   Through a shared cache table with TTL and source metadata.

## E) Security

23. **How do you secure Swiggy OAuth?**  
   PKCE + CSRF state + httpOnly cookies + encrypted token storage.

24. **How are tokens stored?**  
   AES-256-GCM encrypted before DB insert.

25. **How is API abuse prevented?**  
   Per-user and global rate limiting with short windows.

26. **How do you prevent oversized payload attacks?**  
   Request body-size guard and strict schema validation.

27. **How do you avoid leaking internals on errors?**  
   Centralized typed error mapping returns safe structured responses.

28. **How is cron endpoint replay mitigated?**  
   Timestamp freshness validation in addition to secret checks.

## F) Reliability and Performance

29. **What are the biggest latency wins?**  
   Parallel lookups, Redis context cache, deferred memory extraction, and cached nutrition lookups.

30. **How do you handle dependency instability?**  
   Retries, timeout boundaries, circuit breaker, graceful fallback paths.

31. **How do you prevent MCP socket/resource leaks?**  
   Explicit cleanup callback after chat stream finishes.

32. **What if Redis is unavailable?**  
   In-memory fallback preserves functionality with reduced cross-instance consistency.

33. **What if Swiggy tool discovery is slow?**  
   Discovery is timeout-bound and non-blocking to core chat path.

34. **How is observability handled?**  
   Structured logs, request IDs, Sentry instrumentation, and health-check endpoint.

## G) Testing and Delivery

35. **What is covered in unit tests?**  
   Nutrition math, streak logic, alerts, context truncation, validation schemas, weekly stats/reporting, and circuit breaker behavior.

36. **What are CI quality gates?**  
   Lint, typecheck, tests, and production build.

37. **How do you validate deploy readiness?**  
   Deployment checklist includes tests/typecheck/build/migrations/health checks.

38. **How do you treat non-critical failures?**  
   Non-critical tasks run fire-and-forget and log warnings without failing user requests.

## H) Tradeoffs and Challenges

39. **Why not real-time memory extraction per message?**  
   It would increase token cost and response latency significantly.

40. **What is the downside of deferred extraction?**  
   Memory freshness lag until cron processing.

41. **Why maintain strict confirmation workflow despite extra UX step?**  
   Prevents costly/incorrect data mutations by autonomous AI behavior.

42. **Biggest architecture complexity source?**  
   Coordinating multi-service AI + nutrition + auth + external commerce within low-latency constraints.

43. **What technical debt do you acknowledge?**  
   Transitional Swiggy integration layers and migration drift risk between Prisma and SQL scripts.

44. **What production incident classes did you design against?**  
   auth transient failures, third-party timeouts, service worker registration failures, message ordering bugs, replay attempts.

## I) Scalability and Future Work

45. **How would you scale chat throughput?**  
   Keep context caches hot, tighten DB query shapes, and segment heavier jobs into background workers.

46. **How would you improve memory quality?**  
   Add confidence scoring, source traceability per memory, and stronger dedup policies.

47. **How would you reduce operational risk around schema evolution?**  
   Consolidate migration ownership strategy and add schema drift CI checks.

48. **How would you improve Swiggy reliability further?**  
   Expand circuit-breaker usage, retries by error class, and richer status telemetry.

49. **How can this architecture generalize beyond nutrition?**  
   The pattern (tool-gated AI + RLS + deferred memory + cache strategy) is reusable for any vertical assistant.

50. **What is the strongest engineering takeaway?**  
   AI product quality depends less on model choice alone and more on orchestration, safety gates, and operational design.

---

## Rapid-Fire “Tell Me About the Project” Script

NeutriAI is a full-stack AI nutrition coach built with Next.js, Supabase, Redis, and Azure OpenAI. I designed it around tool-calling with explicit user confirmation to keep writes safe, and I separated short-term conversational context from long-term memory extraction for latency control. I used pgvector-based semantic memory, strict RLS and validation for security, Redis-backed caching/rate limiting for performance, and resilient fallback patterns for external services. The key tradeoff was accepting architecture complexity in exchange for reliability, speed, and trustworthy AI behavior in production-like conditions.
