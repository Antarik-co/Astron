import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { textModule } from './Text.module'

export const textCommands: AstronCommand[] = [
  {
    id: 'text:animate:fade-up',
    label: 'Text Fade Up',
    description: 'Apply a fade-up entrance animation to selected text.',
    module: 'text' as ModuleName,
    keywords: ['text', 'animate', 'fade', 'up', 'entrance', 'reveal'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => textModule.applyTextAnimation('fade-up')
  },
  {
    id: 'text:animate:slide-left',
    label: 'Text Slide Left',
    description: 'Apply a slide-left animation to selected text.',
    module: 'text' as ModuleName,
    keywords: ['text', 'animate', 'slide', 'left', 'enter'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => textModule.applyTextAnimation('slide-left')
  },
  {
    id: 'text:animate:scale-in',
    label: 'Text Scale In',
    description: 'Apply a scale-in animation to selected text.',
    module: 'text' as ModuleName,
    keywords: ['text', 'animate', 'scale', 'grow', 'in', 'entrance'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => textModule.applyTextAnimation('scale-in')
  },
  {
    id: 'text:animate:typewriter',
    label: 'Text Typewriter Animation',
    description: 'Apply a typewriter reveal animation to selected text.',
    module: 'text' as ModuleName,
    keywords: ['text', 'typewriter', 'type', 'reveal', 'character'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => textModule.applyTextAnimation('typewriter')
  },
  {
    id: 'text:animate:word-by-word',
    label: 'Word By Word Text',
    description: 'Reveal selected text word by word.',
    module: 'text' as ModuleName,
    keywords: ['text', 'word', 'by', 'word', 'reveal'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => textModule.applyTextAnimation('word-by-word')
  },
  {
    id: 'text:swap-font',
    label: 'Swap Font',
    description: 'Replace one font with another in the active composition.',
    module: 'text' as ModuleName,
    keywords: ['font', 'swap', 'replace', 'change', 'text', 'typography'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => textModule.swapFont('', '')
  },
  {
    id: 'text:typewriter',
    label: 'Apply Typewriter',
    description: 'Apply a typewriter reveal using a default speed.',
    module: 'text' as ModuleName,
    keywords: ['typewriter', 'type', 'reveal', 'speed', 'text', 'animate'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => textModule.applyTypewriter(10)
  }
]
