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

AVAILABLE COMMANDS (use exact IDs in square brackets):
- Motion: [motion:ease:overshoot] [motion:ease:elastic] [motion:ease:bounce] [motion:ease:ease-in] [motion:ease:ease-out] [motion:ease:linear] [motion:stagger:default] [motion:bounce] [motion:wiggle] [motion:loop:cycle] [motion:loop:pingpong] [motion:copy-ease] [motion:paste-ease]
- Timeline: [timeline:select:after] [timeline:select:before] [timeline:select:crossing] [timeline:select:adj] [timeline:select:null] [timeline:select:shape] [timeline:select:precomp] [timeline:invert] [timeline:shift:+1] [timeline:shift:-1] [timeline:snap:closest] [timeline:fill-gaps] [timeline:rename] [timeline:sort]
- Effects: [effects:glow:soft] [effects:glow:medium] [effects:glow:hard] [effects:clear] [effects:add]
- Text: [text:animate:fade-up] [text:animate:slide-left] [text:animate:scale-in] [text:animate:typewriter] [text:animate:word-by-word] [text:swap-font]
- Color: [color:grade:cinematic] [color:grade:film] [color:grade:moody] [color:grade:social-pop] [color:grade:teal-orange] [color:saturate] [color:warm] [color:cool]
- Audio: [audio:beats] [audio:sync] [audio:tempo]
- 3D: [3d:camera:push-in] [3d:camera:pull-out] [3d:camera:orbit] [3d:camera:ken-burns] [3d:camera:truck-left] [3d:camera:truck-right] [3d:camera:crane-up] [3d:camera:crane-down] [3d:lights:studio] [3d:lights:dramatic] [3d:convert]
- Export: [export:web] [export:lossless] [export:social] [export:version] [export:queue]
- Rig: [rig:ik] [rig:fk] [rig:rubber-hose]
- Organize: [organize:clean] [organize:missing] [organize:color-code] [organize:health]
- Automate: [automate:null] [automate:camera] [automate:anchor] [automate:purge] [automate:precomp]
- AI: [ai:rename]

RESPONSE FORMAT:
1. Explain what you'll do in 1-2 sentences (friendly tone)
2. Put the exact command ID in SQUARE brackets like [motion:ease:bounce]
3. Keep under 100 words
4. Be specific about which command to run

EXAMPLES:
User: "make this layer bouncy" → I'll apply bounce easing to your layer. [motion:ease:bounce]
User: "add glow" → Adding a balanced glow effect to your selected layers. [effects:glow:medium]
User: "export this" → I'll queue a web H.264 export for your composition. [export:web]
User: "typewriter" → Applying a typewriter text reveal animation. [text:animate:typewriter]
User: "color grade" → I'll apply a cinematic color grade. [color:grade:cinematic]
User: "create null" → Creating a null controller for parenting. [automate:null]
User: "3d camera" → Adding an orbiting 3D camera. [3d:camera:orbit]`;

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
      const matches = localAI.classify(input);
      const topMatch = matches[0];
      const cmdIds = matches.slice(0, 3).map((m) => m.commandId);

      const friendlyNames: Record<string, string> = {
        'motion:ease:overshoot': 'Overshoot Ease', 'motion:ease:elastic': 'Elastic Ease',
        'motion:ease:bounce': 'Bounce Ease', 'motion:stagger:default': 'Stagger Layers',
        'motion:wiggle': 'Apply Wiggle', 'motion:loop:cycle': 'Loop Cycle',
        'audio:beats': 'Beat Sync', 'export:web': 'Export Web',
        'export:social': 'Export Social', 'organize:clean': 'Clean Unused',
        'timeline:snap:closest': 'Snap to Cursor', 'organize:health': 'Health Check',
        'effects:glow:medium': 'Add Glow', 'color:grade:cinematic': 'Cinematic Grade',
        '3d:camera:orbit': 'Camera Orbit', 'text:animate:typewriter': 'Typewriter',
        'automate:null': 'Create Null', 'automate:anchor': 'Center Anchor',
        'automate:purge': 'Purge Memory', 'automate:precomp': 'Precomp Selected',
        'timeline:select:after': 'Select After Cursor', 'timeline:select:adj': 'Select Adjustment Layers',
        'timeline:select:null': 'Select Null Layers', 'timeline:select:shape': 'Select Shape Layers',
        'timeline:select:precomp': 'Select Precomps', 'timeline:fill-gaps': 'Fill Gaps',
        'timeline:rename': 'Bulk Rename', 'timeline:sort': 'Sort Timeline',
        'timeline:shift:+1': 'Shift Forward 1 Frame', 'timeline:shift:-1': 'Shift Back 1 Frame',
        'effects:clear': 'Clear Effects', 'effects:glow:soft': 'Soft Glow',
        'effects:glow:hard': 'Hard Glow', 'color:saturate': 'Boost Saturation',
        'color:warm': 'Warm Tone', 'color:cool': 'Cool Tone',
        '3d:camera:push-in': 'Camera Push In', '3d:camera:pull-out': 'Camera Pull Out',
        '3d:camera:ken-burns': 'Ken Burns', '3d:camera:truck-left': 'Truck Left',
        '3d:camera:truck-right': 'Truck Right', '3d:camera:crane-up': 'Crane Up',
        '3d:camera:crane-down': 'Crane Down', '3d:lights:studio': 'Studio Lights',
        '3d:lights:dramatic': 'Dramatic Light', '3d:convert': 'Convert to 3D',
        'text:animate:fade-up': 'Text Fade Up', 'text:animate:slide-left': 'Text Slide Left',
        'text:animate:scale-in': 'Text Scale In', 'text:animate:word-by-word': 'Word by Word',
        'text:swap-font': 'Swap Font', 'export:lossless': 'Export Lossless',
        'export:version': 'Save Version', 'export:queue': 'Add to Render Queue',
        'organize:missing': 'Find Missing', 'organize:color-code': 'Color Code Layers',
        'rig:ik': 'Build IK Rig', 'rig:fk': 'Build FK Rig', 'rig:rubber-hose': 'Rubber Hose',
        'ai:rename': 'Smart Rename', 'motion:copy-ease': 'Copy Ease', 'motion:paste-ease': 'Paste Ease',
        'motion:bounce': 'Apply Bounce', 'motion:ease:ease-in': 'Ease In',
        'motion:ease:ease-out': 'Ease Out', 'motion:ease:linear': 'Linear Ease',
        'motion:loop:pingpong': 'Loop Pingpong', 'audio:sync': 'Sync to Markers',
        'audio:tempo': 'Set Tempo', 'timeline:invert': 'Invert Selection',
        'timeline:select:before': 'Select Before Cursor', 'timeline:select:crossing': 'Select Crossing',
        'timeline:select:starting-after': 'Select Starting After',
        'timeline:snap:earliest-start': 'Snap Earliest Start',
        'timeline:snap:latest-start': 'Snap Latest Start',
        'timeline:snap:earliest-end': 'Snap Earliest End',
        'timeline:snap:latest-end': 'Snap Latest End',
        'timeline:snap:closest:ripple': 'Ripple Snap Closest',
        'timeline:snap:prev-layer': 'Snap to Previous Layer',
      };

      const labels = cmdIds.map((id) => friendlyNames[id] || id.split(':').pop() || id);
      const response = labels.map((l) => '• ' + l).join('\n') + '\n\nClick a button below to run.';

      return {
        source: 'local',
        result: cmdIds.join(','),
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
