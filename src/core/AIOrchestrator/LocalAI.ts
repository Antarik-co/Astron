// === FILE: src/core/AIOrchestrator/LocalAI.ts ===

/**
 * LocalAI
 *
 * Astron's offline-first AI layer. No internet required.
 * Implements the "Local AI Layer" described in Astron Implementation Plan §4:
 *
 *   "Pattern matching engine — common command recognition"
 *   "Smart suggestions — context-based recommendations"
 *
 * Decision threshold:
 *   isConfident() → true  if best match > 0.8  → skip cloud, execute locally
 *   classify()    → keeps matches with confidence > 0.6 (noise filter)
 *
 * All processing targets <50ms per §4 architecture diagram
 * ("Intent Classification — Local, <50ms").
 */

// ─── Internal types (not exported) ──────────────────────────────────────────

interface PatternMatch {
  commandId: string;
  confidence: number;
}

// ─── Pattern registry ────────────────────────────────────────────────────────

/**
 * Each entry maps a regex to the most relevant Astron command.
 * Patterns are intentionally broad to maximise recall on short,
 * informal user inputs (e.g. "make it bouncy" → easing).
 * Confidence values reflect expected precision of the match:
 *   0.9  → near-certain mapping (domain-specific vocabulary)
 *   0.85 → strong signal, minor ambiguity
 *   0.8  → solid but some overlap with other commands
 *   0.75 → useful suggestion, lower precision
 *   0.7  → general term, treat as a fallback hint
 */
const PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  commandId: string;
  confidence: number;
}> = [
  // Motion module
  {
    pattern: /\b(ease|easing|overshoot|elastic|bounce)\b/i,
    commandId: 'motion:ease',
    confidence: 0.9,
  },
  {
    pattern: /\b(stagger|cascade|delay)\b/i,
    commandId: 'motion:stagger',
    confidence: 0.85,
  },

  // Audio module
  {
    pattern: /\b(beat|sync|bpm|audio|music)\b/i,
    commandId: 'audio:beats',
    confidence: 0.9,
  },

  // Export module
  {
    pattern: /\b(export|render|save|deliver)\b/i,
    commandId: 'export:quick',
    confidence: 0.7,
  },

  // Organize module
  {
    pattern: /\b(clean|organize|unused|tidy)\b/i,
    commandId: 'organize:clean',
    confidence: 0.85,
  },

  // Timeline module — selection
  {
    pattern: /\b(select|after|cursor|before)\b/i,
    commandId: 'timeline:select',
    confidence: 0.8,
  },

  // Timeline module — snap/align
  {
    pattern: /\b(snap|align|playhead)\b/i,
    commandId: 'timeline:snap',
    confidence: 0.85,
  },

  // Organize module — project health
  {
    pattern: /\b(health|performance|slow|lag|optimize)\b/i,
    commandId: 'organize:health',
    confidence: 0.8,
  },

  // Effects module
  {
    pattern: /\b(glow|bloom|light)\b/i,
    commandId: 'effects:glow',
    confidence: 0.75,
  },

  // Color module
  {
    pattern: /\b(color|grade|lut)\b/i,
    commandId: 'color:grade',
    confidence: 0.75,
  },
];

/** Minimum confidence score for a match to be included in results. */
const CONFIDENCE_THRESHOLD = 0.6;

/** Minimum confidence score to consider local AI authoritative (skip cloud). */
const HIGH_CONFIDENCE_THRESHOLD = 0.8;

// ─── Class ───────────────────────────────────────────────────────────────────

export class LocalAI {
  /**
   * Test every pattern against the input string.
   * Returns all matches above the noise threshold, sorted by confidence
   * descending (highest confidence first).
   *
   * @param input — Raw user query or context string.
   */
  classify(input: string): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const entry of PATTERNS) {
      if (entry.pattern.test(input) && entry.confidence > CONFIDENCE_THRESHOLD) {
        matches.push({
          commandId: entry.commandId,
          confidence: entry.confidence,
        });
      }
    }

    // Sort descending — highest confidence suggestions surface first.
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Return the top 3 command IDs for the given context string.
   * Used by AIRouter as the fast-path local suggestion response.
   *
   * @param context — User input or comp context description.
   */
  suggest(context: string): string[] {
    return this.classify(context)
      .slice(0, 3)
      .map((m) => m.commandId);
  }

  /**
   * Returns true if any pattern match for this input exceeds the high-
   * confidence threshold, indicating local AI can handle the request
   * without falling back to the cloud.
   *
   * @param input — Raw user query.
   */
  isConfident(input: string): boolean {
    return this.classify(input).some(
      (m) => m.confidence > HIGH_CONFIDENCE_THRESHOLD
    );
  }
}

/** Shared singleton — import this across the codebase, not the class directly. */
export const localAI = new LocalAI();
