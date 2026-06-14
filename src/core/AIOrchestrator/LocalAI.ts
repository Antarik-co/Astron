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
  { pattern: /\b(overshoot|snappy|ease|easing)\b/i, commandId: 'motion:ease:overshoot', confidence: 0.9 },
  { pattern: /\b(elastic|spring)\b/i, commandId: 'motion:ease:elastic', confidence: 0.9 },
  { pattern: /\b(bounce|bouncy|rubber)\b/i, commandId: 'motion:ease:bounce', confidence: 0.88 },
  { pattern: /\b(stagger|cascade|delay|offset)\b/i, commandId: 'motion:stagger:default', confidence: 0.85 },
  { pattern: /\b(wiggle|shake|noise|vibrat)\b/i, commandId: 'motion:wiggle', confidence: 0.88 },
  { pattern: /\b(loop|repeat|cycle|ping.?pong|infinite)\b/i, commandId: 'motion:loop:cycle', confidence: 0.82 },
  { pattern: /\b(copy.*(ease|easing)|ease.*copy)\b/i, commandId: 'motion:copy-ease', confidence: 0.8 },
  { pattern: /\b(paste.*(ease|easing)|ease.*paste)\b/i, commandId: 'motion:paste-ease', confidence: 0.8 },

  // Audio module
  { pattern: /\b(beat|sync|bpm|audio|music|marker|rhythm)\b/i, commandId: 'audio:beats', confidence: 0.9 },

  // Export module
  { pattern: /\b(export|render|save.*mp4|deliver|output)\b/i, commandId: 'export:web', confidence: 0.75 },
  { pattern: /\b(export|render).*\b(social|instagram|tiktok|reel)\b/i, commandId: 'export:social', confidence: 0.85 },

  // Organize module
  { pattern: /\b(clean|organize|unused|tidy|remove.*unused)\b/i, commandId: 'organize:clean', confidence: 0.85 },
  { pattern: /\b(missing|lost|broken|find.*footage)\b/i, commandId: 'organize:missing', confidence: 0.82 },

  // Timeline module — selection
  { pattern: /\b(select).*\b(after|cursor|playhead)\b|\b(after|cursor|playhead).*\b(select)\b/i, commandId: 'timeline:select:after', confidence: 0.82 },
  { pattern: /\b(select).*\b(before|prior)\b|\b(before|prior).*\b(select)\b/i, commandId: 'timeline:select:before', confidence: 0.82 },
  { pattern: /\b(select).*\b(adj|adjustment)\b/i, commandId: 'timeline:select:adj', confidence: 0.85 },
  { pattern: /\b(select).*\b(null)\b/i, commandId: 'timeline:select:null', confidence: 0.85 },
  { pattern: /\b(select).*\b(shape)\b/i, commandId: 'timeline:select:shape', confidence: 0.85 },
  { pattern: /\b(select).*\b(precomp|nested)\b/i, commandId: 'timeline:select:precomp', confidence: 0.85 },

  // Timeline module — snap/align
  { pattern: /\b(snap|align|playhead|cursor)\b/i, commandId: 'timeline:snap:closest', confidence: 0.85 },

  // Timeline module — shift
  { pattern: /\b(shift|nudge).*\b(forward|right)\b|\b(forward|right).*\b(shift|nudge)\b/i, commandId: 'timeline:shift:+1', confidence: 0.8 },
  { pattern: /\b(shift|nudge).*\b(back|left)\b|\b(back|left).*\b(shift|nudge)\b/i, commandId: 'timeline:shift:-1', confidence: 0.8 },

  // Timeline module — fill gaps
  { pattern: /\b(fill|close).*\b(gap|gaps)\b|\b(gap|gaps).*\b(fill|close)\b/i, commandId: 'timeline:fill-gaps', confidence: 0.85 },

  // Timeline module — rename
  { pattern: /\b(rename|bulk.*name|name.*layers)\b/i, commandId: 'timeline:rename', confidence: 0.82 },

  // Timeline module — sort
  { pattern: /\b(sort|order).*\b(layers|timeline)\b|\b(layers|timeline).*\b(sort|order)\b/i, commandId: 'timeline:sort', confidence: 0.82 },

  // Effects module
  { pattern: /\b(glow|bloom|light|glowy)\b/i, commandId: 'effects:glow:medium', confidence: 0.78 },
  { pattern: /\b(soft.*glow|gentle.*glow)\b/i, commandId: 'effects:glow:soft', confidence: 0.82 },
  { pattern: /\b(hard.*glow|intense.*glow|strong.*glow)\b/i, commandId: 'effects:glow:hard', confidence: 0.82 },
  { pattern: /\b(clear.*effect|remove.*effect|strip.*effect)\b/i, commandId: 'effects:clear', confidence: 0.85 },

  // Color module
  { pattern: /\b(color|grade|grading|lut|cinematic|film|moody|teal|orange)\b/i, commandId: 'color:grade:cinematic', confidence: 0.78 },
  { pattern: /\b(saturate|saturation|vivid|boost.*color)\b/i, commandId: 'color:saturate', confidence: 0.82 },
  { pattern: /\b(warm|golden|golden.*tone|warmth)\b/i, commandId: 'color:warm', confidence: 0.82 },
  { pattern: /\b(cool|cold|blue.*tone|chilly)\b/i, commandId: 'color:cool', confidence: 0.82 },

  // Camera / 3D
  { pattern: /\b(camera|orbit|3d|dolly|ken.?burns|push.?in|pull.?out)\b/i, commandId: '3d:camera:orbit', confidence: 0.8 },
  { pattern: /\b(truck.*left|pan.*left)\b/i, commandId: '3d:camera:truck-left', confidence: 0.82 },
  { pattern: /\b(truck.*right|pan.*right)\b/i, commandId: '3d:camera:truck-right', confidence: 0.82 },
  { pattern: /\b(crane.*up|rise|elevate)\b/i, commandId: '3d:camera:crane-up', confidence: 0.8 },
  { pattern: /\b(crane.*down|lower|descend)\b/i, commandId: '3d:camera:crane-down', confidence: 0.8 },
  { pattern: /\b(studio.*light|3.*point.*light|key.*fill.*back)\b/i, commandId: '3d:lights:studio', confidence: 0.82 },
  { pattern: /\b(dramatic.*light|moody.*light|rim.*light)\b/i, commandId: '3d:lights:dramatic', confidence: 0.8 },
  { pattern: /\b(convert.*3d|make.*3d|enable.*3d|3d.*layer)\b/i, commandId: '3d:convert', confidence: 0.82 },

  // Text module
  { pattern: /\b(typewriter|text.*reveal|character.*reveal)\b/i, commandId: 'text:animate:typewriter', confidence: 0.82 },
  { pattern: /\b(text.*fade|fade.*text|text.*up)\b/i, commandId: 'text:animate:fade-up', confidence: 0.8 },
  { pattern: /\b(text.*slide|slide.*text)\b/i, commandId: 'text:animate:slide-left', confidence: 0.8 },
  { pattern: /\b(text.*scale|scale.*text|text.*grow)\b/i, commandId: 'text:animate:scale-in', confidence: 0.8 },
  { pattern: /\b(word.*by.*word|reveal.*words)\b/i, commandId: 'text:animate:word-by-word', confidence: 0.82 },
  { pattern: /\b(swap.*font|change.*font|replace.*font|new.*font)\b/i, commandId: 'text:swap-font', confidence: 0.82 },

  // Automate module
  { pattern: /\b(null|controller|control.*layer|null.*object)\b/i, commandId: 'automate:null', confidence: 0.85 },
  { pattern: /\b(create.*camera|add.*camera|new.*camera)\b/i, commandId: 'automate:camera', confidence: 0.85 },
  { pattern: /\b(center.*anchor|anchor.*center|reset.*anchor)\b/i, commandId: 'automate:anchor', confidence: 0.85 },
  { pattern: /\b(purge|clear.*memory|free.*ram|clear.*cache)\b/i, commandId: 'automate:purge', confidence: 0.85 },
  { pattern: /\b(precomp|precompose|nest|group.*layers)\b/i, commandId: 'automate:precomp', confidence: 0.85 },

  // Organize module
  { pattern: /\b(health|performance|slow|lag|optimize|check.*project)\b/i, commandId: 'organize:health', confidence: 0.82 },
  { pattern: /\b(color.*code|label.*color|organize.*layers)\b/i, commandId: 'organize:color-code', confidence: 0.8 },

  // Rig module
  { pattern: /\b(ik|inverse.*kinematic|rig.*ik)\b/i, commandId: 'rig:ik', confidence: 0.82 },
  { pattern: /\b(fk|forward.*kinematic|rig.*fk)\b/i, commandId: 'rig:fk', confidence: 0.82 },
  { pattern: /\b(rubber.*hose|bendy|bendy.*limb)\b/i, commandId: 'rig:rubber-hose', confidence: 0.82 },

  // AI module
  { pattern: /\b(smart.*rename|auto.*rename|rename.*smart)\b/i, commandId: 'ai:rename', confidence: 0.82 },
  { pattern: /\b(health.*check|project.*health|analyze.*project)\b/i, commandId: 'ai:health', confidence: 0.8 },
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
    const seen = new Set<string>();

    for (const entry of PATTERNS) {
      if (entry.pattern.test(input) && entry.confidence > CONFIDENCE_THRESHOLD) {
        if (!seen.has(entry.commandId)) {
          seen.add(entry.commandId);
          matches.push({
            commandId: entry.commandId,
            confidence: entry.confidence,
          });
        }
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Return the top 3 command IDs for the given context string.
   * Used by AIRouter as the fast-path local suggestion response.
   *
   * @param context — User input or comp context description.
   */
  suggest(context: string): string[] {
    const matches = this.classify(context);
    if (matches.length === 0) {
      const words = context.toLowerCase().split(/\s+/);
      const fallbackMap: Record<string, string> = {
        glow: 'effects:glow:medium', ease: 'motion:ease:overshoot', export: 'export:web',
        camera: '3d:camera:orbit', null: 'automate:null', text: 'text:animate:typewriter',
        color: 'color:grade:cinematic', beat: 'audio:beats', precomp: 'automate:precomp',
        anchor: 'automate:anchor', purge: 'automate:purge', clean: 'organize:clean',
      };
      for (const word of words) {
        if (fallbackMap[word]) return [fallbackMap[word]];
      }
    }
    return matches.slice(0, 3).map((m) => m.commandId);
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
