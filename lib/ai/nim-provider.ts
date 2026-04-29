import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

/**
 * NVIDIA NIM provider — OpenAI-compatible gateway to NVIDIA's hosted models.
 *
 * Chat:      meta/llama-3.3-70b-instruct  (70B dense, native tool calling, fast)
 * Embedding: nvidia/llama-3.2-nemoretriever-300m-embed-v1  (1024-dim, asymmetric)
 */

const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
const EMBED_MODEL = "nvidia/llama-3.2-nemoretriever-300m-embed-v1"

const nim = createOpenAICompatible({
  name: "nvidia-nim",
  baseURL: NIM_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.NIM_API_KEY}`,
  },
})

/** Main chat model — Llama 3.3 70B Instruct with native tool calling. */
export const nimChatModel = nim.chatModel("meta/llama-3.3-70b-instruct")

/**
 * Custom embed function for NeMo Retriever — an asymmetric model that
 * requires `input_type` ("query" for retrieval, "passage" for storage).
 * The AI SDK's embed() doesn't support this param, so we call NIM directly.
 */
export async function nimEmbed(
  text: string,
  inputType: "query" | "passage",
): Promise<number[]> {
  const res = await fetch(`${NIM_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: [text],
      input_type: inputType,
      encoding_format: "float",
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[nimEmbed] ${res.status}: ${body}`)
  }

  const json = (await res.json()) as {
    data?: Array<{ embedding: number[] }>
  }

  const embedding = json.data?.[0]?.embedding
  if (!embedding || embedding.length === 0) {
    throw new Error("[nimEmbed] Empty embedding returned")
  }

  return embedding
}

/**
 * Batch embed multiple texts in a single API call.
 * NeMo Retriever supports array input natively — this turns N API calls into 1.
 *
 * @param texts  Array of strings to embed
 * @param inputType  "query" for retrieval, "passage" for storage
 * @returns Array of embeddings (one per input text, same order)
 */
export async function nimEmbedBatch(
  texts: string[],
  inputType: "query" | "passage",
): Promise<number[][]> {
  if (texts.length === 0) return []

  const res = await fetch(`${NIM_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: texts,
      input_type: inputType,
      encoding_format: "float",
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[nimEmbedBatch] ${res.status}: ${body}`)
  }

  const json = (await res.json()) as {
    data?: Array<{ embedding: number[]; index: number }>
  }

  if (!json.data || json.data.length === 0) {
    throw new Error("[nimEmbedBatch] No embeddings returned")
  }

  // NIM returns embeddings sorted by index — ensure correct order
  const sorted = [...json.data].sort((a, b) => a.index - b.index)
  return sorted.map((d) => d.embedding)
}

