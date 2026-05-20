import { describe, it, expect } from "vitest"
import { CircuitBreaker } from "@/lib/ai/mcp-circuit-breaker"

describe("CircuitBreaker", () => {
  it("starts in closed state", () => {
    const cb = new CircuitBreaker(3, 1000)
    expect(cb.isOpen).toBe(false)
    expect(cb.currentState).toBe("closed")
  })

  it("stays closed after fewer failures than threshold", () => {
    const cb = new CircuitBreaker(3, 1000)
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen).toBe(false)
  })

  it("opens after reaching threshold", () => {
    const cb = new CircuitBreaker(3, 1000)
    cb.recordFailure()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen).toBe(true)
    expect(cb.currentState).toBe("open")
  })

  it("resets to closed on success", () => {
    const cb = new CircuitBreaker(3, 1000)
    cb.recordFailure()
    cb.recordFailure()
    cb.recordSuccess()
    expect(cb.isOpen).toBe(false)
    expect(cb.currentState).toBe("closed")
    // Should need 3 more failures to open again
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen).toBe(false)
  })

  it("transitions to half-open after cooldown", async () => {
    const cb = new CircuitBreaker(2, 50) // 50ms cooldown
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen).toBe(true)

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 60))
    // Should be half-open now
    expect(cb.isOpen).toBe(false)
    expect(cb.currentState).toBe("half-open")
  })

  it("returns to closed from half-open on success", async () => {
    const cb = new CircuitBreaker(2, 50)
    cb.recordFailure()
    cb.recordFailure()
    await new Promise((r) => setTimeout(r, 60))

    // Half-open probe
    expect(cb.isOpen).toBe(false)
    cb.recordSuccess()
    expect(cb.currentState).toBe("closed")
  })

  it("returns to open from half-open on failure", async () => {
    const cb = new CircuitBreaker(2, 50)
    cb.recordFailure()
    cb.recordFailure()
    await new Promise((r) => setTimeout(r, 60))

    // Half-open probe
    expect(cb.isOpen).toBe(false)
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen).toBe(true)
  })
})
