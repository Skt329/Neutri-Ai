import { trackEvent } from "@/lib/posthog"

/**
 * Performance monitoring and metrics collection
 * Tracks query times, API latency, memory usage for ongoing optimization
 */

export interface PerformanceMetric {
  name: string
  duration: number
  timestamp: Date
  userId?: string
  metadata?: Record<string, any>
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 1000 // Keep last 1000 metrics in memory

  /**
   * Measure execution time of operations
   */
  async measure<T>(
    operationName: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now()

    try {
      const result = await fn()
      const duration = performance.now() - startTime

      this.recordMetric(operationName, duration, metadata)
      trackEvent("performance_metric", {
        operation: operationName,
        duration_ms: Math.round(duration),
        ...metadata,
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime
      this.recordMetric(`${operationName}_error`, duration, { ...metadata, error: true })

      throw error
    }
  }

  /**
   * Measure synchronous operations
   */
  measureSync<T>(
    operationName: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const startTime = performance.now()

    try {
      const result = fn()
      const duration = performance.now() - startTime

      this.recordMetric(operationName, duration, metadata)
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      this.recordMetric(`${operationName}_error`, duration, { ...metadata, error: true })

      throw error
    }
  }

  private recordMetric(
    name: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      metadata,
    }

    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log if operation took longer than threshold
    if (duration > 1000) {
      console.warn(`[performance] Slow operation: ${name} took ${Math.round(duration)}ms`)
    }
  }

  /**
   * Get performance statistics
   */
  getStats(operationName?: string) {
    let filtered = this.metrics

    if (operationName) {
      filtered = this.metrics.filter((m) => m.name === operationName)
    }

    if (!filtered.length) return null

    const durations = filtered.map((m) => m.duration)
    const total = durations.reduce((a, b) => a + b, 0)

    return {
      count: filtered.length,
      avgTime: total / filtered.length,
      minTime: Math.min(...durations),
      maxTime: Math.max(...durations),
      totalTime: total,
    }
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = []
  }
}

/**
 * Query performance tracker
 * Identifies N+1 query problems and slow queries
 */
export class QueryPerformanceTracker {
  private queryStats: Map<string, { count: number; totalTime: number }> = new Map()

  recordQuery(operationName: string, duration: number): void {
    const current = this.queryStats.get(operationName) ?? { count: 0, totalTime: 0 }
    current.count++
    current.totalTime += duration

    this.queryStats.set(operationName, current)

    // Warn about N+1 patterns
    if (current.count > 5 && current.totalTime > 500) {
      console.warn(`[query-tracker] Potential N+1 issue with ${operationName}: ${current.count} queries in ${current.totalTime}ms`)
    }
  }

  getReport() {
    const report: Record<string, any> = {}

    for (const [name, stats] of this.queryStats) {
      report[name] = {
        queryCount: stats.count,
        totalTime: Math.round(stats.totalTime),
        avgTime: Math.round(stats.totalTime / stats.count),
      }
    }

    return report
  }

  clear(): void {
    this.queryStats.clear()
  }
}

/**
 * Memory usage tracker
 */
export class MemoryUsageTracker {
  getMemoryUsage() {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const mem = process.memoryUsage()
      return {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
      }
    }
    return null
  }

  logMemoryUsage(label?: string): void {
    const usage = this.getMemoryUsage()
    if (usage) {
      console.log(
        `[memory] ${label ?? "Memory usage"}: heap ${usage.heapUsed}MB / ${usage.heapTotal}MB, rss ${usage.rss}MB`
      )
    }
  }
}

/**
 * Cache hit rate tracker
 */
export class CacheHitTracker {
  private hits = 0
  private misses = 0

  recordHit(): void {
    this.hits++
  }

  recordMiss(): void {
    this.misses++
  }

  getHitRate(): number {
    const total = this.hits + this.misses
    return total === 0 ? 0 : (this.hits / total) * 100
  }

  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      total: this.hits + this.misses,
    }
  }

  reset(): void {
    this.hits = 0
    this.misses = 0
  }
}

/**
 * Singleton instances
 */
export const performanceMonitor = new PerformanceMonitor()
export const queryPerformanceTracker = new QueryPerformanceTracker()
export const memoryUsageTracker = new MemoryUsageTracker()
export const cacheHitTracker = new CacheHitTracker()

/**
 * Comprehensive performance report
 */
export function generatePerformanceReport() {
  return {
    queries: queryPerformanceTracker.getReport(),
    cache: cacheHitTracker.getStats(),
    memory: memoryUsageTracker.getMemoryUsage(),
    timestamp: new Date().toISOString(),
  }
}
