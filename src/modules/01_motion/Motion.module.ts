import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'

export class MotionModule {
  applyEasing(preset: string): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'applyEasing', module: 'motion', params: { preset } })
  }

  applyStagger(delayMs: number = 100, direction: string = 'left'): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'applyStagger', module: 'motion', params: { delayMs, direction } })
  }

  applyBounce(height: number = 50, decay: number = 0.7, elasticity: number = 2): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'applyBounce', module: 'motion', params: { height, decay, elasticity } })
  }

  applyWiggle(frequency: number = 2, amplitude: number = 20): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'applyWiggle', module: 'motion', params: { frequency, amplitude } })
  }

  applyLoop(type: 'cycle' | 'pingpong' | 'offset' = 'cycle'): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'applyLoop', module: 'motion', params: { type } })
  }

  copyEasing(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'copyEasing', module: 'motion', params: {} })
  }

  pasteEasing(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'pasteEasing', module: 'motion', params: {} })
  }
}

export const motionModule = new MotionModule()
