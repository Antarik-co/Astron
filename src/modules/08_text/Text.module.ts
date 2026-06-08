import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'

export class TextModule {
  applyTextAnimation(animation: string): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'applyTextAnimation', module: 'text', params: { animation } })
  }

  swapFont(oldFont: string, newFont: string): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'swapFont', module: 'text', params: { oldFont, newFont } })
  }

  applyTypewriter(speed: number = 10): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'applyTypewriter', module: 'text', params: { speed } })
  }
}

export const textModule = new TextModule()
