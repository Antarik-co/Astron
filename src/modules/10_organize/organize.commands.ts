import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { organizeModule } from './Organize.module'

export const organizeCommands: AstronCommand[] = [
  {
    id: 'organize:clean',
    label: 'Clean Unused Items',
    description: 'Remove unused project items.',
    module: 'organize' as ModuleName,
    keywords: ['clean', 'unused', 'remove', 'project', 'purge', 'organize'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => organizeModule.cleanUnused()
  },
  {
    id: 'organize:missing',
    label: 'Find Missing Assets',
    description: 'Find missing footage in the project.',
    module: 'organize' as ModuleName,
    keywords: ['missing', 'find', 'lost', 'footage', 'files', 'broken'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => organizeModule.findMissing()
  },
  {
    id: 'organize:color-code',
    label: 'Apply Color Codes',
    description: 'Apply layer label colors based on layer type.',
    module: 'organize' as ModuleName,
    keywords: ['color', 'code', 'label', 'organize', 'layers', 'type'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => organizeModule.applyColorCodes()
  },
  {
    id: 'organize:health',
    label: 'Project Health Check',
    description: 'Analyze project health and return recommendations.',
    module: 'organize' as ModuleName,
    keywords: ['health', 'score', 'performance', 'check', 'project', 'optimize'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => organizeModule.healthCheck()
  }
]
