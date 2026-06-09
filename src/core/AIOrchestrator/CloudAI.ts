import { getGroqKeys } from '../../config/api-keys'

export class CloudAI {
  private currentKeyIndex = 0
  callCount = 0
  dailyLimit = 200

  private getNextKey(): string {
    const keys = getGroqKeys()
    if (keys.length === 0) {
      throw new Error('No GROQ API keys configured.')
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
      throw new Error('Daily AI limit reached. Upgrade to Astron Studio for unlimited AI.')
    }

    const keys = getGroqKeys()
    if (keys.length === 0) {
      throw new Error('No GROQ API keys configured.')
    }

    this.callCount++
    const system = systemPrompt ?? 'You are Astron AI assistant for After Effects. Be concise and actionable.'
    let lastError: Error | null = null

    for (let attempt = 0; attempt < keys.length; attempt++) {
      const apiKey = this.getNextKey()

      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
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
        })

        if (response.status === 429) {
          lastError = new Error(`GROQ key ${attempt + 1} rate limited`)
          continue
        }

        if (!response.ok) {
          throw new Error(`GROQ API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const text = data.choices?.[0]?.message?.content

        if (!text) {
          throw new Error('Empty response from GROQ API')
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
    throw lastError ?? new Error('All GROQ API keys exhausted')
  }

  getRemainingCalls(): number {
    return Math.max(0, this.dailyLimit - this.callCount)
  }

  resetCount(): void {
    this.callCount = 0
  }
}

export const cloudAI = new CloudAI()
