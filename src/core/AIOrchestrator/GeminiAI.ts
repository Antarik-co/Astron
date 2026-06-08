// === FILE: src/core/AIOrchestrator/GeminiAI.ts ===

import { GEMINI_KEYS } from '../../config/api-keys';

/**
 * GeminiAI — Google Gemini Inference Layer
 *
 * Second cloud AI provider for Astron, using Google's Gemini models.
 * Uses 4 API keys with round-robin rotation.
 *
 * Gemini serves as the fallback when GROQ is unavailable,
 * and as the primary for tasks requiring multimodal reasoning
 * (e.g. describing comp contents, analysing layer structure).
 *
 * Model: gemini-2.0-flash (fast, capable, cost-effective)
 *
 * Rate limit strategy:
 *   - 4 keys rotated round-robin per request
 *   - On 429, automatically advances to next key
 */
export class GeminiAI {
  /** Current key index for round-robin rotation. */
  private currentKeyIndex: number = 0;

  /** Number of Gemini calls made in the current session. */
  callCount: number = 0;

  /** Maximum calls allowed per day. */
  dailyLimit: number = 200;

  // ─── Key Management ─────────────────────────────────────────

  /**
   * Get the current Gemini API key and advance the round-robin index.
   */
  private getNextKey(): string {
    const key = GEMINI_KEYS[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % GEMINI_KEYS.length;
    return key;
  }

  /**
   * Set the daily call limit.
   */
  initialize(dailyLimit: number = 200): void {
    this.dailyLimit = dailyLimit;
  }

  // ─── Core Query ─────────────────────────────────────────────

  /**
   * Send a message to Google Gemini and return the text response.
   *
   * Uses the Gemini REST API directly (no SDK dependency).
   *
   * @param userMessage  — The user's natural language input.
   * @param systemPrompt — System instruction for the model.
   */
  async query(userMessage: string, systemPrompt?: string): Promise<string> {
    if (this.callCount >= this.dailyLimit) {
      throw new Error(
        'Daily Gemini AI limit reached. Upgrade to Astron Studio for unlimited AI.'
      );
    }

    this.callCount++;

    const system = systemPrompt ??
      'You are Astron AI assistant for After Effects. Be concise and actionable.';

    // Try each key (up to all 4) on rate-limit errors
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < GEMINI_KEYS.length; attempt++) {
      const apiKey = this.getNextKey();

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: system }],
            },
            contents: [
              {
                parts: [{ text: userMessage }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 1024,
              temperature: 0.7,
            },
          }),
        });

        if (response.status === 429) {
          lastError = new Error(`Gemini key ${attempt + 1} rate limited`);
          continue;
        }

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          throw new Error('Empty response from Gemini API');
        }

        return text;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!lastError.message.includes('rate limited')) {
          this.callCount--;
          throw lastError;
        }
      }
    }

    // All keys exhausted
    this.callCount--;
    throw lastError ?? new Error('All Gemini API keys exhausted');
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
export const geminiAI = new GeminiAI();
