import { describe, it, expect } from "vitest"
import { formatNumber, capitalize } from "@/lib/format"

describe("formatNumber", () => {
  it("returns '—' for null", () => {
    expect(formatNumber(null)).toBe("—")
  })

  it("returns '—' for undefined", () => {
    expect(formatNumber(undefined)).toBe("—")
  })

  it("returns '—' for NaN", () => {
    expect(formatNumber(NaN)).toBe("—")
  })

  it("formats integers", () => {
    // toLocaleString is locale-dependent but with 0 digits there should be no decimals
    const result = formatNumber(1234, 0)
    expect(result).toContain("1")
    expect(result).toContain("234")
  })

  it("respects digits parameter", () => {
    const result = formatNumber(3.14159, 2)
    expect(result).toContain("3.14")
  })

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0")
  })
})

describe("capitalize", () => {
  it("capitalizes first letter", () => {
    expect(capitalize("hello")).toBe("Hello")
  })

  it("returns empty string for null", () => {
    expect(capitalize(null)).toBe("")
  })

  it("returns empty string for undefined", () => {
    expect(capitalize(undefined)).toBe("")
  })

  it("returns empty string for empty string", () => {
    expect(capitalize("")).toBe("")
  })

  it("handles single character", () => {
    expect(capitalize("a")).toBe("A")
  })

  it("preserves rest of string", () => {
    expect(capitalize("hELLO")).toBe("HELLO")
  })
})
