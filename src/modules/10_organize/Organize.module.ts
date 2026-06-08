import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'

export class OrganizeModule {
  cleanUnused(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'cleanUnused', module: 'organize', params: {} })
  }

  findMissing(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'findMissing', module: 'organize', params: {} })
  }

  applyColorCodes(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'applyColorCodes', module: 'organize', params: {} })
  }

  healthCheck(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'healthCheck', module: 'organize', params: {} })
  }
}

export const organizeModule = new OrganizeModule()
