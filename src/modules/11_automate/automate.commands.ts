import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { automateModule } from './Automate.module'

export const automateCommands: AstronCommand[] = [
  {
    id: 'automate:null',
    label: 'Create Null',
    description: 'Create a null controller in the active composition.',
    module: 'automate' as ModuleName,
    keywords: ['null', 'create', 'controller', 'object', 'empty', 'layer'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => automateModule.createNull()
  },
  {
    id: 'automate:camera',
    label: 'Create Camera',
    description: 'Create a camera in the active composition.',
    module: 'automate' as ModuleName,
    keywords: ['camera', 'create', 'add', 'new', 'scene', '3d'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => automateModule.createCamera()
  },
  {
    id: 'automate:lights-3pt',
    label: 'Create 3 Point Lights',
    description: 'Create a three point light setup.',
    module: 'automate' as ModuleName,
    keywords: ['light', '3pt', 'three', 'point', 'studio', 'setup'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => automateModule.create3PointLight()
  },
  {
    id: 'automate:anchor',
    label: 'Center Anchor Point',
    description: 'Center anchor points on selected layers.',
    module: 'automate' as ModuleName,
    keywords: ['anchor', 'center', 'pivot', 'point', 'reset', 'layer'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => automateModule.centerAnchorPoint()
  },
  {
    id: 'automate:purge',
    label: 'Purge Memory',
    description: 'Purge After Effects memory caches.',
    module: 'automate' as ModuleName,
    keywords: ['purge', 'memory', 'ram', 'cache', 'clear', 'free'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => automateModule.purgeMemory()
  },
  {
    id: 'automate:precomp',
    label: 'Precomp Selected',
    description: 'Precompose selected layers into a new comp.',
    module: 'automate' as ModuleName,
    keywords: ['precomp', 'nest', 'group', 'layers', 'compose', 'wrap'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => automateModule.precompSelected()
  }
]
