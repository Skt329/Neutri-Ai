import { z } from "zod"

/** Max message parts per message */
const MAX_PARTS = 50
/** Max messages per request */
const MAX_MESSAGES = 200
/** Max total request body size (bytes) */
export const MAX_BODY_SIZE = 100 * 1024 // 100KB

// ── Chat API ─────────────────────────────────────────────────────────────────

const MessagePartSchema = z
  .object({
    type: z.string(),
    text: z.string().max(32_000).optional(),
    toolName: z.string().optional(),
    toolCallId: z.string().optional(),
    args: z.unknown().optional(),
    result: z.unknown().optional(),
  })
  .passthrough()

const UIMessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system"]),
    parts: z.array(MessagePartSchema).max(MAX_PARTS),
    id: z.string().optional(),
  })
  .passthrough()

export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid("conversationId must be a valid UUID"),
  messages: z.array(UIMessageSchema).min(1).max(MAX_MESSAGES),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

// ── Nutrition API ────────────────────────────────────────────────────────────

export const NutritionRequestSchema = z
  .object({
    q: z.string().trim().min(1).max(200).optional(),
    barcode: z.string().trim().min(8).max(20).optional(),
    qty: z.coerce.number().positive().max(10_000).optional(),
  })
  .refine((d) => d.q || d.barcode, {
    message: "Either 'q' or 'barcode' is required",
  })

export type NutritionRequest = z.infer<typeof NutritionRequestSchema>
