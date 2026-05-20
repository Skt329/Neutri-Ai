/**
 * Simple circuit breaker for external service connections.
 *
 * After N consecutive failures, stop trying for a cooldown period.
 * After cooldown, allow one "half-open" attempt. If it succeeds,
 * reset to closed. If it fails, reopen.
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailure = 0
  private state: "closed" | "open" | "half-open" = "closed"

  constructor(
    private readonly threshold: number = 3,
    private readonly cooldownMs: number = 60_000,
  ) {}

  /** True if the circuit is open (should not attempt connection) */
  get isOpen(): boolean {
    if (this.state === "open") {
      // Check if cooldown has passed → allow one probe attempt
      if (Date.now() - this.lastFailure > this.cooldownMs) {
        this.state = "half-open"
        return false
      }
      return true
    }
    return false
  }

  /** Call after a successful operation */
  recordSuccess(): void {
    this.failures = 0
    this.state = "closed"
  }

  /** Call after a failed operation */
  recordFailure(): void {
    this.failures++
    this.lastFailure = Date.now()
    if (this.failures >= this.threshold) {
      this.state = "open"
    }
  }

  /** Current state for logging */
  get currentState(): string {
    return this.state
  }
}

// Singleton for the Swiggy MCP connection
export const swiggyCircuitBreaker = new CircuitBreaker(3, 60_000)
