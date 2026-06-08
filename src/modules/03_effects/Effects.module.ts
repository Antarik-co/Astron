import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'

export class EffectsModule {
  addEffect(effectName: string): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'addEffect', module: 'effects', params: { effectName } })
  }

  applyStack(stackName: string): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'applyStack', module: 'effects', params: { stackName } })
  }

  saveStack(name: string): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'saveStack', module: 'effects', params: { name } })
  }

  clearEffects(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'clearEffects', module: 'effects', params: {} })
  }

  applyGlow(quality: 'soft' | 'medium' | 'hard' = 'medium'): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'applyGlow', module: 'effects', params: { quality } })
  }
}

export const effectsModule = new EffectsModule()
