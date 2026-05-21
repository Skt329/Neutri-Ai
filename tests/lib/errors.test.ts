import { describe, it, expect } from "vitest"
import {
  AppError, ValidationError, AuthenticationError,
  NotFoundError, RateLimitError, ExternalServiceError,
} from "@/lib/errors"

describe("AppError", () => {
  it("sets all properties correctly", () => {
    const err = new AppError("test", "TEST_CODE", 418, true, { field: "x" })
    expect(err.message).toBe("test")
    expect(err.code).toBe("TEST_CODE")
    expect(err.statusCode).toBe(418)
    expect(err.isOperational).toBe(true)
    expect(err.details).toEqual({ field: "x" })
    expect(err.name).toBe("AppError")
    expect(err).toBeInstanceOf(Error)
  })

  it("defaults statusCode to 500 and isOperational to true", () => {
    const err = new AppError("fail", "FAIL")
    expect(err.statusCode).toBe(500)
    expect(err.isOperational).toBe(true)
  })
})

describe("ValidationError", () => {
  it("has correct code and status", () => {
    const err = new ValidationError("bad input", { field: "email" })
    expect(err.code).toBe("VALIDATION_ERROR")
    expect(err.statusCode).toBe(400)
    expect(err.details).toEqual({ field: "email" })
    expect(err).toBeInstanceOf(AppError)
  })
})

describe("AuthenticationError", () => {
  it("uses default message", () => {
    const err = new AuthenticationError()
    expect(err.message).toBe("Authentication required")
    expect(err.code).toBe("UNAUTHORIZED")
    expect(err.statusCode).toBe(401)
  })

  it("accepts custom message", () => {
    const err = new AuthenticationError("Token expired")
    expect(err.message).toBe("Token expired")
  })
})



describe("NotFoundError", () => {
  it("includes resource in message", () => {
    const err = new NotFoundError("Conversation")
    expect(err.message).toBe("Conversation not found")
    expect(err.code).toBe("NOT_FOUND")
    expect(err.statusCode).toBe(404)
  })
})

describe("RateLimitError", () => {
  it("has correct defaults", () => {
    const err = new RateLimitError()
    expect(err.statusCode).toBe(429)
    expect(err.code).toBe("RATE_LIMITED")
  })
})

describe("ExternalServiceError", () => {
  it("combines service and message", () => {
    const err = new ExternalServiceError("USDA", "timeout")
    expect(err.message).toBe("USDA: timeout")
    expect(err.statusCode).toBe(502)
  })
})

