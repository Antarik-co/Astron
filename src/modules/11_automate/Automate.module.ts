import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'

export class AutomateModule {
  createNull(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'createNull', module: 'automate', params: {} })
  }

  createCamera(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'createCamera', module: 'automate', params: {} })
  }

  create3PointLight(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'create3PointLight', module: 'automate', params: {} })
  }

  centerAnchorPoint(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'centerAnchorPoint', module: 'automate', params: {} })
  }

  purgeMemory(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'purgeMemory', module: 'automate', params: {} })
  }

  precompSelected(name: string = 'Astron Precomp'): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'precompSelected', module: 'automate', params: { name } })
  }

  executeCommandSequence(commands: Array<{ action: string, module: string, params: Record<string, unknown> }>): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'executeCommandSequence', module: 'automate', params: { commands } })
  }
}

export const automateModule = new AutomateModule()
