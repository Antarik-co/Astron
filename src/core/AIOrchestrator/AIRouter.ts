// === FILE: src/core/AIOrchestrator/AIRouter.ts ===

import { localAI } from './LocalAI';
import { cloudAI } from './CloudAI';
import { geminiAI } from './GeminiAI';

/**
 * ASTRON_SYSTEM_PROMPT
 *
 * Injected as the system prompt for every cloud AI query routed
 * through AIRouter. Keeps the model's responses scoped to Astron's
 * command vocabulary and response format expectations.
 *
 * Behavioural contracts:
 *   - Respond with actionable Astron slash commands where possible.
 *   - Stay under 100 words (panel UI has limited vertical space).
 *   - Prefix a specific recommended action with "COMMAND:" so the
 *     Command Palette can parse and surface it as a one-click action.
 */
const ASTRON_SYSTEM_PROMPT = `You are the AI assistant inside Astron, an After Effects plugin. The user is working in After Effects.

AVAILABLE MODULES AND EXAMPLES:
- Motion: easing, bounce, stagger, wiggle, loop — e.g. /ease overshoot
- Timeline: select layers, snap, rename, fill gaps — e.g. /select after
- Effects: add glow, blur, drop shadow, color correction — e.g. /add glow
- Text: text animation, typewriter, swap font — e.g. /typewriter
- Color: color grade, saturate, LUT, temperature — e.g. /grade cinematic
- Audio: detect beats, sync markers, set tempo — e.g. /detect beats
- 3D: add camera, 3D lights, convert to 3D — e.g. /add camera
- Export: quick export, render queue, snapshot — e.g. /export mp4
- Rig: IK rig, FK rig, rubber hose — e.g. /build IK
- Organize: clean unused, find missing, health check — e.g. /clean unused
- Automate: null, purge, precomp, center anchor — e.g. /create null

RESPONSE FORMAT:
1. Explain what you'll do in 1-2 sentences (friendly tone)
2. If suggesting a command, put the exact command ID in SQUARE brackets like [motion:ease:overshoot]
3. Keep under 120 words
4. Be friendly and helpful, use natural language

EXAMPLE:
User: "make this layer bouncy"
Assistant: I'll add a bounce easing to your selected layer. [motion:ease:bounce] You can tweak the intensity in the effect controls panel.

User: "add a camera"
Assistant: Let me add a 3D camera to your composition. [3d:camera:orbit] This creates a 35mm camera that you can animate.`;

/**
 * AIRouter
 *
 * The single entry point for all AI requests in Astron.
 * Implements a 3-tier cascade routing strategy:
 *
 * ┌─ User Input
 * │
 * ├─ LocalAI.isConfident() → true
 * │     └─ { source: 'local', result: top-3 commandIds }       ← <50ms
 * │
 * └─ LocalAI.isConfident() → false
 *       ├─ GROQ (5 keys, round-robin) succeeds
 *       │     └─ { source: 'groq', result: Llama response }    ← ~200ms
 *       │
 *       ├─ GROQ fails → Gemini (4 keys, round-robin) succeeds
 *       │     └─ { source: 'gemini', result: Gemini response } ← ~500ms
 *       │
 *       └─ Both fail
 *             └─ { source: 'local', result: top-3 commandIds } ← graceful fallback
 *
 * The cascade guarantees the panel always returns something useful
 * even when offline, over the daily limit, or when APIs are down.
 * 9 API keys total (5 GROQ + 4 Gemini) ensure maximum uptime.
 */
export class AIRouter {
  /**
   * Route an input string through the AI cascade and return the result.
   *
   * @param input — Raw user query from the Command Palette or AI bar.
   * @returns     — Source identifier plus the AI-generated result string.
   */
  async route(
    input: string
  ): Promise<{ source: 'local' | 'groq' | 'gemini'; result: string }> {
    // ── Fast path: local AI is confident ──────────────────────
    if (localAI.isConfident(input)) {
      return {
        source: 'local',
        result: localAI.suggest(input).join(','),
      };
    }

    // ── Tier 1: GROQ (5 keys, Llama — fastest cloud) ─────────
    try {
      const result = await cloudAI.query(input, ASTRON_SYSTEM_PROMPT);
      return { source: 'groq', result };
    } catch {
      // GROQ failed — fall through to Gemini
    }

    // ── Tier 2: Gemini (4 keys — reliable fallback) ──────────
    try {
      const result = await geminiAI.query(input, ASTRON_SYSTEM_PROMPT);
      return { source: 'gemini', result };
    } catch {
      // Gemini also failed — fall through to local
    }

    // ── Tier 3: Local fallback (always works, offline) ────────
    return {
      source: 'local',
      result: localAI.suggest(input).join(','),
    };
  }

  /**
   * Returns true if any cloud AI layer has remaining calls available.
   * Use this to conditionally render the "AI" badge in the Command Palette.
   */
  isCloudAvailable(): boolean {
    return cloudAI.getRemainingCalls() > 0 || geminiAI.getRemainingCalls() > 0;
  }

  /**
   * Get the total remaining cloud calls across both providers.
   */
  getRemainingCalls(): { groq: number; gemini: number; total: number } {
    const groq = cloudAI.getRemainingCalls();
    const gemini = geminiAI.getRemainingCalls();
    return { groq, gemini, total: groq + gemini };
  }

  /**
   * Reset daily counters for both cloud providers.
   */
  resetAllCounts(): void {
    cloudAI.resetCount();
    geminiAI.resetCount();
  }
}

/** Shared singleton — import this across the codebase, not the class directly. */
export const aiRouter = new AIRouter();
