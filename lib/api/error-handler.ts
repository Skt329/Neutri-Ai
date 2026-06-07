/**
 * Unified API error handler.
 *
 * Maps AppError subclasses to appropriate HTTP responses.
 * Centralizes error-to-response mapping so route handlers can
 * simply throw typed errors.
 */

import { NextResponse } from "next/server"
import {
  AppError,
  ValidationError,
  RateLimitError,
} from "@/lib/errors"
import { logger } from "@/lib/logger"

// ── Types ────────────────────────────────────────────────────────────────

interface ApiErrorBody {
  error: string
  code: string
  details?: unknown
}

// ── Handler ──────────────────────────────────────────────────────────────

/**
 * Convert any error into a structured JSON response.
 *
 * Usage in route handlers:
 * ```ts
 * try {
 *   // ... route logic
 * } catch (error) {
 *   return handleApiError(error, 'chat')
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  module: string,
  requestId?: string,
): NextResponse<ApiErrorBody> {
  // Known application errors
  if (error instanceof AppError) {
    const status = error.statusCode

    // Only log server errors at error level
    if (status >= 500) {
      logger.error(module, error.message, { code: error.code, requestId })
    } else {
      logger.warn(module, error.message, { code: error.code, requestId })
    }

    const body: ApiErrorBody = {
      error: error.message,
      code: error.code,
    }

    // Include validation details for 400s
    if (error instanceof ValidationError && error.details) {
      body.details = error.details
    }

    // Add rate limit headers
    if (error instanceof RateLimitError) {
      return NextResponse.json(body, {
        status: 429,
        headers: { "Retry-After": "60" },
      })
    }

    return NextResponse.json(body, { status })
  }

  // Unknown / unexpected errors — never leak internals
  logger.error(module, "Unhandled error", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    requestId,
  })

  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 },
  )
}

/**
 * Helper to create quick error responses (backward compatible with apiError pattern).
 */
export function apiError(
  message: string,
  status: number,
  code?: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: message, code: code ?? "ERROR" },
    { status },
  )
}
