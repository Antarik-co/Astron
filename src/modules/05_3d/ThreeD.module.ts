import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'

export class ThreeDModule {
  addCamera(movement: string = 'push-in'): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'addCamera', module: '3d', params: { movement } })
  }

  add3DLights(type: string = 'studio'): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'add3DLights', module: '3d', params: { type } })
  }

  convert2Dto3D(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'convert2Dto3D', module: '3d', params: {} })
  }
}

export const threeDModule = new ThreeDModule()
