import { describe, it, expect } from "vitest"
import { logger } from "@/lib/logger"

describe("logger", () => {
  it("exposes all log levels", () => {
    expect(typeof logger.debug).toBe("function")
    expect(typeof logger.info).toBe("function")
    expect(typeof logger.warn).toBe("function")
    expect(typeof logger.error).toBe("function")
  })

  it("does not throw when called", () => {
    expect(() => logger.info("test", "Hello")).not.toThrow()
    expect(() => logger.error("test", "Oops", { code: 500 })).not.toThrow()
    expect(() => logger.debug("test", "Debug msg")).not.toThrow()
    expect(() => logger.warn("test", "Warning")).not.toThrow()
  })

  it("accepts data parameter", () => {
    expect(() =>
      logger.info("test", "With data", {
        userId: "abc",
        latency: 123,
      }),
    ).not.toThrow()
  })
})
