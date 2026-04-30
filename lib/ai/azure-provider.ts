import { createAzure } from "@ai-sdk/azure"

/**
 * Azure OpenAI provider — GPT-4.1 for chat and tool calling.
 *
 * Chat:      GPT-4.1 (deployment: gpt-41, eastus2 region)
 * Embedding: Still handled by NVIDIA NeMo Retriever (see nim-provider.ts)
 *
 * Uses the Chat Completions API (.chat()) for maximum tool-calling reliability
 * with structured output support via Output.object + Zod schemas.
 *
 * Required env vars:
 *   AZURE_RESOURCE_NAME  — Azure resource subdomain (e.g. "myresource")
 *   AZURE_API_KEY        — Azure OpenAI API key
 */

const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME!,
  apiKey: process.env.AZURE_API_KEY!,
})

/**
 * Main chat model — Azure OpenAI GPT-4.1 with native tool calling
 * and structured output. Replace deployment name below if your Azure
 * deployment uses a different identifier.
 */
export const azureChatModel = azure.chat("gpt-4.1-mini")
