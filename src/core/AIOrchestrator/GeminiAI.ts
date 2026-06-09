import { getGeminiKeys } from '../../config/api-keys'

export class GeminiAI {
  private currentKeyIndex = 0
  callCount = 0
  dailyLimit = 200

  private getNextKey(): string {
    const keys = getGeminiKeys()
    if (keys.length === 0) {
      throw new Error('No Gemini API keys configured.')
    }
    const key = keys[this.currentKeyIndex % keys.length]
    this.currentKeyIndex = (this.currentKeyIndex + 1) % keys.length
    return key
  }

  initialize(dailyLimit: number = 200): void {
    this.dailyLimit = dailyLimit
  }

  async query(userMessage: string, systemPrompt?: string): Promise<string> {
    if (this.callCount >= this.dailyLimit) {
      throw new Error('Daily Gemini AI limit reached. Upgrade to Astron Studio for unlimited AI.')
    }

    const keys = getGeminiKeys()
    if (keys.length === 0) {
      throw new Error('No Gemini API keys configured.')
    }

    this.callCount++
    const system = systemPrompt ?? 'You are Astron AI assistant for After Effects. Be concise and actionable.'
    let lastError: Error | null = null

    for (let attempt = 0; attempt < keys.length; attempt++) {
      const apiKey = this.getNextKey()

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ parts: [{ text: userMessage }] }],
            generationConfig: {
              maxOutputTokens: 1024,
              temperature: 0.7,
            },
          }),
        })

        if (response.status === 429) {
          lastError = new Error(`Gemini key ${attempt + 1} rate limited`)
          continue
        }

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {
          throw new Error('Empty response from Gemini API')
        }

        return text
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (!lastError.message.includes('rate limited')) {
          this.callCount--
          throw lastError
        }
      }
    }

    this.callCount--
    throw lastError ?? new Error('All Gemini API keys exhausted')
  }

  getRemainingCalls(): number {
    return Math.max(0, this.dailyLimit - this.callCount)
  }

  resetCount(): void {
    this.callCount = 0
  }
}

export const geminiAI = new GeminiAI()
