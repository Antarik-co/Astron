import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { exportModule } from './Export.module'

export const exportCommands: AstronCommand[] = [
  {
    id: 'export:web',
    label: 'Export Web',
    description: 'Queue a web H.264 export for the active composition.',
    module: 'export' as ModuleName,
    keywords: ['export', 'web', 'h264', 'mp4', 'render', 'deliver'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => exportModule.quickExport('web')
  },
  {
    id: 'export:lossless',
    label: 'Export Lossless',
    description: 'Queue a lossless export for the active composition.',
    module: 'export' as ModuleName,
    keywords: ['export', 'lossless', 'png', 'sequence', 'quality'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => exportModule.quickExport('lossless')
  },
  {
    id: 'export:social',
    label: 'Export Social',
    description: 'Queue a social media H.264 export for the active composition.',
    module: 'export' as ModuleName,
    keywords: ['export', 'social', 'instagram', 'tiktok', 'reels', 'mp4'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => exportModule.quickExport('web')
  },
  {
    id: 'export:version',
    label: 'Save Version Snapshot',
    description: 'Save a timestamped project version snapshot.',
    module: 'export' as ModuleName,
    keywords: ['version', 'save', 'snapshot', 'backup', 'aep'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => exportModule.saveVersionSnapshot()
  },
  {
    id: 'export:queue',
    label: 'Add To Render Queue',
    description: 'Add the active composition to the render queue.',
    module: 'export' as ModuleName,
    keywords: ['render', 'queue', 'add', 'export', 'batch'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => exportModule.addToRenderQueue()
  }
]
