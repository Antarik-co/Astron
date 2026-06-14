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
    id: '3d:camera:pull-out',
    label: 'Camera Pull Out',
    description: 'Add a camera with a pull-out movement.',
    module: '3d' as ModuleName,
    keywords: ['camera', 'pull', 'out', 'dolly', 'zoom', '3d', 'retreat'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.addCamera('pull-out')
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
    id: '3d:camera:truck-left',
    label: 'Camera Truck Left',
    description: 'Add a camera with a truck-left movement.',
    module: '3d' as ModuleName,
    keywords: ['camera', 'truck', 'left', 'pan', 'slide', '3d'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.addCamera('truck-left')
  },
  {
    id: '3d:camera:truck-right',
    label: 'Camera Truck Right',
    description: 'Add a camera with a truck-right movement.',
    module: '3d' as ModuleName,
    keywords: ['camera', 'truck', 'right', 'pan', 'slide', '3d'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.addCamera('truck-right')
  },
  {
    id: '3d:camera:crane-up',
    label: 'Camera Crane Up',
    description: 'Add a camera with a crane-up movement.',
    module: '3d' as ModuleName,
    keywords: ['camera', 'crane', 'up', 'rise', 'elevate', '3d'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.addCamera('crane-up')
  },
  {
    id: '3d:camera:crane-down',
    label: 'Camera Crane Down',
    description: 'Add a camera with a crane-down movement.',
    module: '3d' as ModuleName,
    keywords: ['camera', 'crane', 'down', 'lower', 'descend', '3d'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.addCamera('crane-down')
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
    id: '3d:lights:back',
    label: 'Back Light',
    description: 'Add a single back light for rim lighting.',
    module: '3d' as ModuleName,
    keywords: ['light', 'back', 'rim', 'silhouette', '3d'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.add3DLights('back')
  },
  {
    id: '3d:lights:3pt',
    label: '3 Point Lights',
    description: 'Add a classic 3-point light setup.',
    module: '3d' as ModuleName,
    keywords: ['light', '3pt', 'three', 'point', 'key', 'fill', 'back', '3d'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => threeDModule.add3DLights('3pt')
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
