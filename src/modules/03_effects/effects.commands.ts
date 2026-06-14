import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { effectsModule } from './Effects.module'

export const effectsCommands: AstronCommand[] = [
  {
    id: 'effects:glow:soft',
    label: 'Soft Glow',
    description: 'Apply a soft glow to selected layers.',
    module: 'effects' as ModuleName,
    keywords: ['glow', 'soft', 'light', 'bloom', 'effects', 'add'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => effectsModule.applyGlow('soft')
  },
  {
    id: 'effects:glow:medium',
    label: 'Medium Glow',
    description: 'Apply a balanced glow to selected layers.',
    module: 'effects' as ModuleName,
    keywords: ['glow', 'medium', 'bloom', 'effects'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => effectsModule.applyGlow('medium')
  },
  {
    id: 'effects:glow:hard',
    label: 'Hard Glow',
    description: 'Apply an intense glow to selected layers.',
    module: 'effects' as ModuleName,
    keywords: ['glow', 'hard', 'intense', 'bloom', 'effects'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => effectsModule.applyGlow('hard')
  },
  {
    id: 'effects:clear',
    label: 'Clear Effects',
    description: 'Remove all effects from selected layers.',
    module: 'effects' as ModuleName,
    keywords: ['clear', 'remove', 'effects', 'all', 'clean'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => effectsModule.clearEffects()
  },
  {
    id: 'effects:stack:save',
    label: 'Save Effect Stack',
    description: 'Save the current effect stack as a named preset.',
    module: 'effects' as ModuleName,
    keywords: ['stack', 'save', 'preset', 'effects', 'group'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      const name = String((params as any)?.name ?? (params as any)?.param0 ?? 'Default Stack')
      return effectsModule.saveStack(name)
    }
  },
  {
    id: 'effects:stack:apply',
    label: 'Apply Effect Stack',
    description: 'Apply a saved effect stack to selected layers.',
    module: 'effects' as ModuleName,
    keywords: ['stack', 'apply', 'preset', 'effects', 'group', 'load'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      const stackName = String((params as any)?.stackName ?? (params as any)?.param0 ?? '')
      return effectsModule.applyStack(stackName)
    }
  },
  {
    id: 'effects:add',
    label: 'Add Effect',
    description: 'Add an effect to selected layers by name.',
    module: 'effects' as ModuleName,
    keywords: ['add', 'effect', 'apply', 'native', 'plugin', 'search'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      const effectName = String((params as any)?.effectName ?? (params as any)?.param0 ?? '')
      return effectsModule.addEffect(effectName)
    }
  }
]
