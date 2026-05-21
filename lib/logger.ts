type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  module: string
  message: string
  data?: Record<string, unknown>
  timestamp: string
}

/**
 * Structured logger for production observability.
 *
 * - Production: outputs JSON lines for log aggregators (Datadog, CloudWatch, etc.)
 * - Development: outputs readable `[module] message` format
 * - Debug level only outputs when `process.env.DEBUG` is set
 */
function log(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>,
) {
  const entry: LogEntry = {
    level,
    module,
    message,
    data,
    timestamp: new Date().toISOString(),
  }

  if (process.env.NODE_ENV === "production") {
    // Structured JSON for log aggregators
    const output = JSON.stringify(entry)
    if (level === "error") console.error(output)
    else if (level === "warn") console.warn(output)
    else console.log(output)
  } else {
    // Readable format for development
    const prefix = `[${module}]`
    if (level === "error") console.error(prefix, message, data ?? "")
    else if (level === "warn") console.warn(prefix, message, data ?? "")
    else if (level === "debug" && process.env.DEBUG)
      console.log(prefix, message, data ?? "")
    else if (level !== "debug") console.log(prefix, message, data ?? "")
  }
}

export const logger = {
  debug: (module: string, msg: string, data?: Record<string, unknown>) =>
    log("debug", module, msg, data),
  info: (module: string, msg: string, data?: Record<string, unknown>) =>
    log("info", module, msg, data),
  warn: (module: string, msg: string, data?: Record<string, unknown>) =>
    log("warn", module, msg, data),
  error: (module: string, msg: string, data?: Record<string, unknown>) =>
    log("error", module, msg, data),
}

export type Logger = typeof logger

/**
 * Create a scoped logger that automatically injects a request ID
 * into every log entry for end-to-end request tracing.
 */
export function createRequestLogger(requestId: string) {
  return {
    debug: (module: string, msg: string, data?: Record<string, unknown>) =>
      log("debug", module, msg, { ...data, requestId }),
    info: (module: string, msg: string, data?: Record<string, unknown>) =>
      log("info", module, msg, { ...data, requestId }),
    warn: (module: string, msg: string, data?: Record<string, unknown>) =>
      log("warn", module, msg, { ...data, requestId }),
    error: (module: string, msg: string, data?: Record<string, unknown>) =>
      log("error", module, msg, { ...data, requestId }),
  }
}
