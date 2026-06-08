import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { aiStudioModule } from './AIStudio.module'
import { organizeModule } from '../10_organize/Organize.module'

export const aiStudioCommands: AstronCommand[] = [
  {
    id: 'ai:ask',
    label: 'Ask AI',
    description: 'Ask the AI assistant a project-aware question.',
    module: 'ai_studio' as ModuleName,
    keywords: ['ask', 'ai', 'question', 'help', 'assistant', 'intelligent'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      return aiStudioModule.query((params as any)?.param0 as string ?? '')
    }
  },
  {
    id: 'ai:suggest',
    label: 'AI Suggestions',
    description: 'Get AI suggestions for the current context.',
    module: 'ai_studio' as ModuleName,
    keywords: ['suggest', 'ai', 'next', 'hint', 'recommend'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      const suggestions = aiStudioModule.getSuggestions(String((params as any)?.context ?? ''))
      return { success: true, data: { suggestions } }
    }
  },
  {
    id: 'ai:health',
    label: 'AI Project Health',
    description: 'Read project state and run a project health check.',
    module: 'ai_studio' as ModuleName,
    keywords: ['ai', 'health', 'analyze', 'project', 'score'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      await aiStudioModule.getProjectState()
      return organizeModule.healthCheck()
    }
  },
  {
    id: 'ai:rename',
    label: 'AI Smart Rename',
    description: 'Rename selected layers based on their type and source.',
    module: 'ai_studio' as ModuleName,
    keywords: ['ai', 'rename', 'smart', 'name', 'layers', 'auto'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      return aiStudioModule.smartRename()
    }
  }
]
