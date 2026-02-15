// ─── Magika AI Service ──────────────────────────────────────────────────
// Singleton wrapper around Google's Magika AI model for content-type detection.
// Lazily loads the model on first use; subsequent calls reuse the instance.
// The model (~few MBs) is fetched from Google's CDN on first initialization.

import type { Magika as MagikaType } from 'magika';

// ─── Magika label → Codalyzer TitleCase language name ──────────────────
// Maps Magika's ContentTypeLabel values to the display names used across
// the Codalyzer UI and backend API (must match constants.ts SUPPORTED_LANGUAGES).

const MAGIKA_LABEL_TO_LANGUAGE: Record<string, string> = {
    javascript: 'JavaScript',
    jsx: 'JavaScript',       // JSX is treated as JavaScript
    typescript: 'TypeScript',
    tsx: 'TypeScript',        // TSX is treated as TypeScript
    python: 'Python',
    cpp: 'C++',
    hpp: 'C++',              // C++ headers
    c: 'C',
    h: 'C',                  // C headers
    java: 'Java',
    go: 'Go',
    rust: 'Rust',
    ruby: 'Ruby',
    php: 'PHP',
};

// ─── Singleton State ────────────────────────────────────────────────────

let magikaInstance: MagikaType | null = null;
let initPromise: Promise<MagikaType> | null = null;
let initFailed = false;

/**
 * Returns the shared Magika instance, creating it on first call.
 * Uses a deduplication promise to prevent multiple concurrent initializations.
 */
async function getMagikaInstance(): Promise<MagikaType | null> {
    // Fast path: already initialized
    if (magikaInstance) return magikaInstance;

    // Don't retry if initialization previously failed
    if (initFailed) return null;

    // Deduplicate concurrent calls
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            // Dynamic import — only loads the Magika bundle when actually needed.
            // This keeps the initial page bundle smaller.
            const { Magika } = await import('magika');
            const instance = await Magika.create();
            magikaInstance = instance;
            console.log('[Magika] AI model loaded successfully');
            return instance;
        } catch (err) {
            console.warn('[Magika] Failed to initialize AI model, falling back to heuristics:', err);
            initFailed = true;
            initPromise = null;
            throw err;
        }
    })();

    return initPromise;
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Pre-warms the Magika model. Call this early (e.g., on app mount) so the
 * model is ready by the time the user pastes code. Non-blocking — failures
 * are silently swallowed.
 */
export function warmUpMagika(): void {
    getMagikaInstance().catch(() => { /* swallow — heuristics will be used */ });
}

/**
 * Returns `true` once the Magika model has been loaded successfully.
 */
export function isMagikaReady(): boolean {
    return magikaInstance !== null;
}

export interface MagikaDetectionResult {
    /** TitleCase language name (e.g. "JavaScript"), or empty string if unrecognised */
    language: string;
    /** Raw label from Magika (e.g. "javascript") */
    rawLabel: string;
    /** Confidence score from the AI model (0–1) */
    score: number;
    /** Whether Magika considers this content textual */
    isText: boolean;
}

/**
 * Detect language from raw content string using the Magika AI model.
 *
 * @param content  The source code / text content to identify
 * @returns        Detection result, or `null` if Magika is unavailable
 */
export async function detectWithMagika(content: string): Promise<MagikaDetectionResult | null> {
    if (!content || content.trim().length < 10) return null;

    try {
        const magika = await getMagikaInstance();
        if (!magika) return null;

        // Convert string → Uint8Array (Magika operates on raw bytes)
        const encoder = new TextEncoder();
        const bytes = encoder.encode(content);

        const result = await magika.identifyBytes(bytes);

        const rawLabel = result.prediction.output.label as string;
        const language = MAGIKA_LABEL_TO_LANGUAGE[rawLabel] ?? '';

        return {
            language,
            rawLabel,
            score: result.prediction.score,
            isText: result.prediction.output.is_text,
        };
    } catch (err) {
        console.warn('[Magika] Detection failed:', err);
        return null;
    }
}
