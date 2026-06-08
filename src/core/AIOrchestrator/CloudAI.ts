// === FILE: src/core/AIOrchestrator/CloudAI.ts ===

import { GROQ_KEYS } from '../../config/api-keys';

/**
 * CloudAI — GROQ Inference Layer
 *
 * Wraps the GROQ API (Llama models) for Astron's cloud AI tier.
 * Uses 5 API keys with round-robin rotation to distribute rate limits.
 *
 * Architecture (Astron Implementation Plan §4):
 *   "Cloud AI Layer — complex reasoning, agent mode"
 *   "Natural language → complex multi-step command translation"
 *   "Script generation — ExtendScript code generation"
 *
 * GROQ provides ultra-fast inference (~200ms) via optimised Llama models,
 * making it ideal for real-time AI features inside an AE panel.
 *
 * Rate limit strategy:
 *   - 5 keys rotated round-robin per request
 *   - On 429 (rate limit), automatically advances to next key
 *   - Daily call cap enforced per-session (resets on panel reload)
 */
export class CloudAI {
  /** Current key index for round-robin rotation. */
  private currentKeyIndex: number = 0;

  /** Number of cloud API calls made in the current session. */
  callCount: number = 0;

  /** Maximum calls allowed per day for the current tier. */
  dailyLimit: number = 200;

  // ─── Key Management ─────────────────────────────────────────

  /**
   * Get the current GROQ API key and advance the round-robin index.
   */
  private getNextKey(): string {
    const key = GROQ_KEYS[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % GROQ_KEYS.length;
    return key;
  }

  /**
   * Set the daily call limit.
   * Free tier: 10, Pro tier: 200, Studio tier: Infinity.
   */
  initialize(dailyLimit: number = 200): void {
    this.dailyLimit = dailyLimit;
  }

  // ─── Core Query ─────────────────────────────────────────────

  /**
   * Send a message to GROQ (Llama) and return the text response.
   *
   * Flow:
   *   1. Check daily limit
   *   2. Pick next key (round-robin)
   *   3. Call GROQ REST API
   *   4. On 429 → retry with next key (up to 5 attempts)
   *   5. Parse and return response text
   *
   * @param userMessage  — The user's natural language input.
   * @param systemPrompt — System prompt for the model.
   */
  async query(userMessage: string, systemPrompt?: string): Promise<string> {
    if (this.callCount >= this.dailyLimit) {
      throw new Error(
        'Daily AI limit reached. Upgrade to Astron Studio for unlimited AI.'
      );
    }

    this.callCount++;

    const system = systemPrompt ??
      'You are Astron AI assistant for After Effects. Be concise and actionable.';

    // Try each key (up to all 5) on rate-limit errors
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
      const apiKey = this.getNextKey();

      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: userMessage },
            ],
            max_tokens: 1024,
            temperature: 0.7,
          }),
        });

        if (response.status === 429) {
          // Rate limited — try next key
          lastError = new Error(`GROQ key ${attempt + 1} rate limited`);
          continue;
        }

        if (!response.ok) {
          throw new Error(`GROQ API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (!text) {
          throw new Error('Empty response from GROQ API');
        }

        return text;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Only retry on rate-limit (429), throw on other errors
        if (!lastError.message.includes('rate limited')) {
          this.callCount--;
          throw lastError;
        }
      }
    }

    // All keys exhausted
    this.callCount--;
    throw lastError ?? new Error('All GROQ API keys exhausted');
  }

  // ─── Utility ────────────────────────────────────────────────

  /**
   * Remaining calls available today.
   */
  getRemainingCalls(): number {
    return Math.max(0, this.dailyLimit - this.callCount);
  }

  /**
   * Reset the daily call counter.
   */
  resetCount(): void {
    this.callCount = 0;
  }
}

/** Shared singleton */
export const cloudAI = new CloudAI();
