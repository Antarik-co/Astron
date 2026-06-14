import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'

export class ExportModule {
  quickExport(format: 'web' | 'lossless' | 'social'): Promise<AstronCommandResult> {
    const esFormat = format === 'social' ? 'web' : format
    return callExtendScript({ action: 'quickExport', module: 'export', params: { format: esFormat } })
  }

  saveVersionSnapshot(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'saveVersionSnapshot', module: 'export', params: {} })
  }

  addToRenderQueue(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'addToRenderQueue', module: 'export', params: {} })
  }
}

export const exportModule = new ExportModule()
