import { YoutubeTranscript } from "youtube-transcript"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * YouTube transcript module for NutriAI.
 *
 * Responsibilities:
 *  - Parse any YouTube URL format → video ID
 *  - Fetch captions via `youtube-transcript` (no API key required)
 *  - DB-persistent cache in `youtube_transcripts` table (7-day TTL)
 *  - Truncate transcript to ~6,000 words for context window budget
 */

// ── URL Parsing ─────────────────────────────────────────────────────────

const YT_PATTERNS = [
  // Standard: youtube.com/watch?v=ID
  /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  // Short: youtu.be/ID
  /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  // Shorts: youtube.com/shorts/ID
  /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  // Embed: youtube.com/embed/ID
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  // Live: youtube.com/live/ID
  /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
]

/**
 * Extract a YouTube video ID from any common URL format.
 * Returns `null` if the string is not a recognized YouTube URL.
 */
export function extractVideoId(url: string): string | null {
  const trimmed = url.trim()
  for (const pattern of YT_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

// ── Transcript Fetching & Caching ───────────────────────────────────────

const MAX_WORDS = 6_000
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

type TranscriptSuccess = {
  ok: true
  videoId: string
  transcript: string
  wordCount: number
  language: string | null
}

type TranscriptError = {
  ok: false
  error: string
}

export type TranscriptResult = TranscriptSuccess | TranscriptError

/**
 * Fetch a YouTube video transcript.
 *
 * 1. Check `youtube_transcripts` DB table for a cached entry (7-day TTL).
 * 2. If miss, fetch from YouTube via `youtube-transcript` package.
 * 3. Join segments, truncate to MAX_WORDS, persist to DB.
 *
 * Accepts the authenticated Supabase client from the chat route
 * so that RLS policies are respected.
 */
export async function fetchYouTubeTranscript(
  videoId: string,
  supabase: SupabaseClient,
): Promise<TranscriptResult> {
  try {
    // ── 1. Check DB cache ──
    const { data: cached } = await supabase
      .from("youtube_transcripts")
      .select("transcript, word_count, language, fetched_at")
      .eq("video_id", videoId)
      .maybeSingle()

    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime()
      if (age < CACHE_TTL_MS) {
        return {
          ok: true,
          videoId,
          transcript: cached.transcript,
          wordCount: cached.word_count,
          language: cached.language,
        }
      }
    }

    // ── 2. Fetch from YouTube ──
    let segments: Array<{ text: string }>
    let detectedLang: string | null = null

    try {
      // Try English first
      segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" })
      detectedLang = "en"
    } catch {
      try {
        // Fallback: Hindi (common for Indian recipe content)
        segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "hi" })
        detectedLang = "hi"
      } catch {
        try {
          // Final fallback: any available language
          segments = await YoutubeTranscript.fetchTranscript(videoId)
          detectedLang = null // unknown
        } catch {
          return {
            ok: false,
            error:
              "Could not extract transcript from this video. " +
              "It may have captions disabled, be private, or be region-restricted.",
          }
        }
      }
    }

    if (!segments || segments.length === 0) {
      return {
        ok: false,
        error: "This video has no transcript/captions available.",
      }
    }

    // ── 3. Join & truncate ──
    const fullText = segments
      .map((s) => s.text.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ")

    const words = fullText.split(/\s+/)
    const truncated = words.length > MAX_WORDS ? words.slice(0, MAX_WORDS).join(" ") + " …" : fullText
    const wordCount = Math.min(words.length, MAX_WORDS)

    // ── 4. Persist to DB (upsert) ──
    await supabase
      .from("youtube_transcripts")
      .upsert(
        {
          video_id: videoId,
          transcript: truncated,
          word_count: wordCount,
          language: detectedLang,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "video_id" },
      )
      .then(({ error }) => {
        if (error) console.warn("[youtube] Failed to cache transcript:", error.message)
      })

    return {
      ok: true,
      videoId,
      transcript: truncated,
      wordCount,
      language: detectedLang,
    }
  } catch (err) {
    console.error("[youtube] Unexpected error:", err)
    return {
      ok: false,
      error: "An unexpected error occurred while fetching the video transcript.",
    }
  }
}
