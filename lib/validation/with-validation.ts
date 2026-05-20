import { NextResponse } from "next/server"
import { ZodError, type ZodSchema } from "zod"
import { MAX_BODY_SIZE } from "./api-schemas"

// ── Standardized error response ──────────────────────────────────────────────

export interface APIErrorResponse {
  error: string
  code: string
  details?: unknown
}

/**
 * Create a standardized JSON error response.
 */
export function apiError(
  message: string,
  code: string,
  status: number,
  details?: unknown,
): NextResponse<APIErrorResponse> {
  return NextResponse.json({ error: message, code, details }, { status })
}

// ── Request body parsing ─────────────────────────────────────────────────────

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Enforces a max body size to prevent OOM attacks.
 *
 * @returns Parsed data on success, or a NextResponse error on failure.
 */
export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<T | NextResponse<APIErrorResponse>> {
  // Check Content-Length header if available
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
  if (contentLength > MAX_BODY_SIZE) {
    return apiError("Request body too large", "BODY_TOO_LARGE", 413)
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return apiError("Invalid JSON body", "INVALID_JSON", 400)
  }

  try {
    return schema.parse(raw)
  } catch (e) {
    if (e instanceof ZodError) {
      return apiError(
        "Validation failed",
        "VALIDATION_ERROR",
        400,
        e.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      )
    }
    return apiError("Bad request", "BAD_REQUEST", 400)
  }
}
