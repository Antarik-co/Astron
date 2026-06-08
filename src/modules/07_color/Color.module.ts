import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'

export class ColorModule {
  applyGrade(preset: string): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'applyGrade', module: 'color', params: { preset } })
  }

  quickSaturate(amount: number): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'quickSaturate', module: 'color', params: { amount } })
  }

  applyLUT(lutName: string): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'applyLUT', module: 'color', params: { lutName } })
  }

  adjustTemperature(direction: 'warm' | 'cool', amount: number = 50): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'adjustTemperature', module: 'color', params: { direction, amount } })
  }
}

export const colorModule = new ColorModule()
