import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { threeDModule } from './ThreeD.module'

export const threeDCommands: AstronCommand[] = [
  {
    id: '3d:camera:push-in',
    label: 'Camera Push In',
    description: 'Add a camera with a push-in movement.',
    module: '3d' as ModuleName,
    keywords: ['camera', 'push', 'dolly', 'zoom', '3d', 'move'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.addCamera('push-in')
  },
  {
    id: '3d:camera:orbit',
    label: 'Camera Orbit',
    description: 'Add a camera with an orbit movement.',
    module: '3d' as ModuleName,
    keywords: ['camera', 'orbit', 'spin', 'rotate', '3d', 'circle'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.addCamera('orbit')
  },
  {
    id: '3d:camera:ken-burns',
    label: 'Ken Burns Camera',
    description: 'Add a camera with a Ken Burns movement.',
    module: '3d' as ModuleName,
    keywords: ['camera', 'ken', 'burns', 'pan', 'documentary'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.addCamera('ken-burns')
  },
  {
    id: '3d:lights:studio',
    label: 'Studio Lights',
    description: 'Add a studio 3D light setup.',
    module: '3d' as ModuleName,
    keywords: ['light', 'studio', '3d', 'three', 'point', 'setup'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.add3DLights('studio')
  },
  {
    id: '3d:lights:dramatic',
    label: 'Dramatic Light',
    description: 'Add a dramatic 3D light setup.',
    module: '3d' as ModuleName,
    keywords: ['light', 'dramatic', 'moody', 'contrast', '3d'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.add3DLights('dramatic')
  },
  {
    id: '3d:convert',
    label: 'Convert To 3D',
    description: 'Enable 3D for selected layers.',
    module: '3d' as ModuleName,
    keywords: ['3d', 'convert', 'enable', 'switch', 'layer', 'dimension'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.convert2Dto3D()
  }
]
