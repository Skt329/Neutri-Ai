import { Innertube, YTNodes } from "youtubei.js"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * YouTube module for NutriAI.
 *
 * Uses `youtubei.js` (Innertube API) for:
 *  - Searching recipe videos
 *  - Extracting transcripts (including auto-captions)
 *  - DB-persistent caching in `youtube_transcripts` (7-day TTL)
 */

// ── Innertube Singleton ─────────────────────────────────────────────────

let _yt: Innertube | null = null

async function getClient(): Promise<Innertube> {
  if (!_yt) {
    _yt = await Innertube.create({ generate_session_locally: true })
  }
  return _yt
}

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

  // Try regex patterns first
  for (const pattern of YT_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match?.[1]) return match[1]
  }

  // Fallback: if input looks like a raw 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

  return null
}

// ── Video Search ────────────────────────────────────────────────────────

export type VideoSearchResult = {
  videoId: string
  title: string
  channel: string
  duration: string
  views: string
  thumbnail: string
  publishedAt: string
}

type SearchSuccess = {
  ok: true
  videos: VideoSearchResult[]
}

type SearchError = {
  ok: false
  error: string
}

export type SearchResult = SearchSuccess | SearchError

/**
 * Search YouTube for recipe videos matching a query.
 * Appends " recipe" to bias toward cooking content.
 */
export async function searchYouTubeRecipes(
  query: string,
  maxResults: number = 5,
): Promise<SearchResult> {
  try {
    const yt = await getClient()
    const searchQuery = query.toLowerCase().includes("recipe") ? query : `${query} recipe`
    const results = await yt.search(searchQuery, { type: "video" })

    if (!results.results || results.results.length === 0) {
      return { ok: false, error: "No recipe videos found for this query. Try different keywords." }
    }

    const videos: VideoSearchResult[] = []

    for (const item of results.results) {
      if (videos.length >= maxResults) break

      // Filter to Video nodes only
      if (item.type !== "Video") continue
      const video = item as YTNodes.Video

      videos.push({
        videoId: video.id,
        title: video.title?.text ?? "Untitled",
        channel: video.author?.name ?? "Unknown channel",
        duration: video.duration?.text ?? "Unknown",
        views: video.view_count?.text ?? "Unknown views",
        thumbnail: video.best_thumbnail?.url ?? "",
        publishedAt: video.published?.text ?? "",
      })
    }

    if (videos.length === 0) {
      return { ok: false, error: "No video results found. Try different search terms." }
    }

    return { ok: true, videos }
  } catch (err) {
    console.error("[youtube] Search failed:", err)
    return {
      ok: false,
      error: `YouTube search failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

// ── Transcript Fetching & Caching ───────────────────────────────────────

const MAX_WORDS = 6_000
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

type TranscriptSuccess = {
  ok: true
  videoId: string
  title: string
  transcript: string
  wordCount: number
  language: string | null
}

type TranscriptError = {
  ok: false
  error: string
  details?: Array<{ step: string; error: string }>
}

export type TranscriptResult = TranscriptSuccess | TranscriptError

/**
 * Fetch a YouTube video transcript using youtubei.js (Innertube API).
 *
 * 1. Check `youtube_transcripts` DB table for a cached entry (7-day TTL).
 * 2. If miss, fetch via Innertube: getInfo() → getTranscript().
 * 3. Join segments, truncate to MAX_WORDS, persist to DB.
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
          title: "", // not stored in cache, AI will use transcript context
          transcript: cached.transcript,
          wordCount: cached.word_count,
          language: cached.language,
        }
      }
    }

    // ── 2. Fetch from YouTube via Innertube ──
    const yt = await getClient()
    const fetchErrors: Array<{ step: string; error: string }> = []

    let info
    try {
      info = await yt.getInfo(videoId)
    } catch (infoErr) {
      const msg = infoErr instanceof Error ? infoErr.message : String(infoErr)
      fetchErrors.push({ step: "getInfo", error: msg })
      console.error(`[youtube] getInfo failed for ${videoId}:`, msg)
      return {
        ok: false,
        error: `Could not access this video. It may be private, deleted, or region-restricted. Error: ${msg}`,
        details: fetchErrors,
      }
    }

    const videoTitle = info.basic_info?.title ?? "Unknown"

    let transcriptData
    try {
      transcriptData = await info.getTranscript()
    } catch (txErr) {
      const msg = txErr instanceof Error ? txErr.message : String(txErr)
      fetchErrors.push({ step: "getTranscript", error: msg })
      console.error(`[youtube] getTranscript failed for ${videoId}:`, msg)
      return {
        ok: false,
        error:
          `Could not extract transcript from "${videoTitle}". ` +
          `This video may have captions disabled or unavailable. Error: ${msg}`,
        details: fetchErrors,
      }
    }

    // ── 3. Extract segments ──
    const body = transcriptData?.transcript?.content?.body
    const segments = body?.initial_segments ?? []

    if (!segments || segments.length === 0) {
      console.warn(`[youtube] Transcript fetched but has no segments for ${videoId}`)
      return {
        ok: false,
        error: `Video "${videoTitle}" has no transcript/caption segments available.`,
      }
    }

    // Extract text from each segment
    const texts: string[] = []
    let detectedLang: string | null = null

    for (const seg of segments) {
      if (seg.type === "TranscriptSegment") {
        const node = seg as YTNodes.TranscriptSegment
        const text = node.snippet?.text
        if (text) texts.push(text.replace(/\s+/g, " ").trim())
      }
    }

    // Try to detect language from transcript header
    try {
      const header = transcriptData?.transcript?.content?.header
      if (header && header.type === "TranscriptSearchBox") {
        // Language info may be in the header
        detectedLang = null
      }
    } catch {
      // Language detection is best-effort
    }

    if (texts.length === 0) {
      return {
        ok: false,
        error: `Video "${videoTitle}" transcript segments could not be parsed.`,
      }
    }

    // ── 4. Join & truncate ──
    const fullText = texts.filter(Boolean).join(" ")
    const words = fullText.split(/\s+/)
    const truncated = words.length > MAX_WORDS ? words.slice(0, MAX_WORDS).join(" ") + " …" : fullText
    const wordCount = Math.min(words.length, MAX_WORDS)

    // ── 5. Persist to DB (upsert) ──
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
      title: videoTitle,
      transcript: truncated,
      wordCount,
      language: detectedLang,
    }
  } catch (err) {
    console.error("[youtube] Unexpected error:", err)
    return {
      ok: false,
      error: `An unexpected error occurred while fetching the video transcript: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
