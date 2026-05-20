import { describe, it, expect } from "vitest"
import {
  ChatRequestSchema,
  NutritionRequestSchema,
} from "@/lib/validation/api-schemas"

describe("ChatRequestSchema", () => {
  it("accepts a valid request", () => {
    const result = ChatRequestSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("rejects non-UUID conversationId", () => {
    const result = ChatRequestSchema.safeParse({
      conversationId: "not-a-uuid",
      messages: [{ role: "user", parts: [] }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty messages array", () => {
    const result = ChatRequestSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      messages: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid role", () => {
    const result = ChatRequestSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      messages: [{ role: "hacker", parts: [] }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing conversationId", () => {
    const result = ChatRequestSchema.safeParse({
      messages: [{ role: "user", parts: [] }],
    })
    expect(result.success).toBe(false)
  })

  it("allows assistant role", () => {
    const result = ChatRequestSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      messages: [{ role: "assistant", parts: [{ type: "text", text: "Hi" }] }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects message text exceeding 32K chars", () => {
    const result = ChatRequestSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text: "x".repeat(33_000) }],
        },
      ],
    })
    expect(result.success).toBe(false)
  })
})

describe("NutritionRequestSchema", () => {
  it("accepts query param", () => {
    expect(
      NutritionRequestSchema.safeParse({ q: "chicken breast" }).success,
    ).toBe(true)
  })

  it("accepts barcode param", () => {
    expect(
      NutritionRequestSchema.safeParse({ barcode: "12345678" }).success,
    ).toBe(true)
  })

  it("accepts both q and barcode", () => {
    expect(
      NutritionRequestSchema.safeParse({ q: "rice", barcode: "12345678" })
        .success,
    ).toBe(true)
  })

  it("rejects empty request (no q or barcode)", () => {
    expect(NutritionRequestSchema.safeParse({}).success).toBe(false)
  })

  it("rejects empty string for q", () => {
    expect(NutritionRequestSchema.safeParse({ q: "" }).success).toBe(false)
  })

  it("accepts qty as numeric string (coerced)", () => {
    const result = NutritionRequestSchema.safeParse({
      q: "rice",
      qty: "200",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.qty).toBe(200)
    }
  })

  it("rejects negative qty", () => {
    expect(
      NutritionRequestSchema.safeParse({ q: "rice", qty: "-50" }).success,
    ).toBe(false)
  })

  it("rejects qty exceeding 10000", () => {
    expect(
      NutritionRequestSchema.safeParse({ q: "rice", qty: "20000" }).success,
    ).toBe(false)
  })
})
