import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { aiRouter } from '../../core/AIOrchestrator/AIRouter'
import { localAI } from '../../core/AIOrchestrator/LocalAI'

export class AIStudioModule {
  getProjectState(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'getProjectState', module: 'ai_studio', params: {} })
  }

  async query(userInput: string): Promise<AstronCommandResult> {
    try {
      const routeResult = await aiRouter.route(userInput)
      return { success: true, data: { source: routeResult.source, result: routeResult.result } }
    } catch (e) {
      return { success: false, message: (e as Error).message }
    }
  }

  getSuggestions(context: string): string[] {
    return localAI.suggest(context)
  }

  async smartRename(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'smartRename', module: 'ai_studio', params: {} })
  }

  async executeSequence(commands: Array<{ action: string, module: string, params: Record<string, unknown> }>): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'executeCommandSequence', module: 'ai_studio', params: { commands } })
  }
}

export const aiStudioModule = new AIStudioModule()
