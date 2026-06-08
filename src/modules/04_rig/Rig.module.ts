import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'

export class RigModule {
  buildIK(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'buildIK', module: 'rig', params: {} })
  }

  buildFK(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'buildFK', module: 'rig', params: {} })
  }

  addRubberHose(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'addRubberHose', module: 'rig', params: {} })
  }
}

export const rigModule = new RigModule()
