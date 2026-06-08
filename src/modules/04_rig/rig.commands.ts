import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { rigModule } from './Rig.module'

export const rigCommands: AstronCommand[] = [
  {
    id: 'rig:ik',
    label: 'Build IK Rig',
    description: 'Build an inverse kinematics rig from selected layers.',
    module: 'rig' as ModuleName,
    keywords: ['rig', 'ik', 'inverse', 'kinematics', 'arm', 'leg', 'limb', 'character', 'joint'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => rigModule.buildIK()
  },
  {
    id: 'rig:fk',
    label: 'Build FK Rig',
    description: 'Build a forward kinematics chain from selected layers.',
    module: 'rig' as ModuleName,
    keywords: ['rig', 'fk', 'forward', 'kinematics', 'parent', 'chain', 'character'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => rigModule.buildFK()
  },
  {
    id: 'rig:rubber-hose',
    label: 'Add Rubber Hose',
    description: 'Create a bendy rubber hose limb from selected layers.',
    module: 'rig' as ModuleName,
    keywords: ['rig', 'rubber', 'hose', 'bendy', 'limb', 'stretch', 'character'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => rigModule.addRubberHose()
  }
]
