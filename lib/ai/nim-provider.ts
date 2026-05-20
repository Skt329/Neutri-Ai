/**
 * NVIDIA NIM provider — embeddings only.
 *
 * Embedding: nvidia/llama-3.2-nemoretriever-300m-embed-v1  (1024-dim, asymmetric)
 *
 * Chat model has been migrated to Azure OpenAI GPT-4.1 (see azure-provider.ts).
 * This module is retained exclusively for the NeMo Retriever embedding API,
 * which requires the `input_type` parameter not supported by the AI SDK's
 * generic embed() function.
 */

const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
const EMBED_MODEL = "nvidia/llama-3.2-nemoretriever-300m-embed-v1"
const NIM_TIMEOUT_MS = 8_000
const MAX_RETRIES = 1

/** Fetch with timeout + retry */
async function nimFetch(body: Record<string, unknown>): Promise<Response> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${NIM_BASE_URL}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NIM_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(NIM_TIMEOUT_MS),
      })
      if (res.ok || res.status < 500) return res // Don't retry client errors
      lastError = new Error(`NIM ${res.status}: ${await res.text()}`)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
    // Backoff before retry
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  throw lastError ?? new Error("NIM embedding failed")
}

/**
 * Custom embed function for NeMo Retriever — an asymmetric model that
 * requires `input_type` ("query" for retrieval, "passage" for storage).
 * The AI SDK's embed() doesn't support this param, so we call NIM directly.
 */
export async function nimEmbed(
  text: string,
  inputType: "query" | "passage",
): Promise<number[]> {
  const res = await nimFetch({
    model: EMBED_MODEL,
    input: [text],
    input_type: inputType,
    encoding_format: "float",
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

  const res = await nimFetch({
    model: EMBED_MODEL,
    input: texts,
    input_type: inputType,
    encoding_format: "float",
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

