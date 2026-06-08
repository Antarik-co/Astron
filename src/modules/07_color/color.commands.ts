import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { colorModule } from './Color.module'

export const colorCommands: AstronCommand[] = [
  {
    id: 'color:grade:cinematic',
    label: 'Cinematic Grade',
    description: 'Apply a cinematic color grade to selected layers.',
    module: 'color' as ModuleName,
    keywords: ['color', 'grade', 'cinematic', 'film', 'look', 'curves'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => colorModule.applyGrade('cinematic')
  },
  {
    id: 'color:grade:film',
    label: 'Film Grade',
    description: 'Apply a film-style grade to selected layers.',
    module: 'color' as ModuleName,
    keywords: ['color', 'grade', 'film', 'analog', 'vintage', 'emulation'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => colorModule.applyGrade('film')
  },
  {
    id: 'color:grade:moody',
    label: 'Moody Grade',
    description: 'Apply a dark moody grade to selected layers.',
    module: 'color' as ModuleName,
    keywords: ['color', 'grade', 'moody', 'dark', 'desaturated'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => colorModule.applyGrade('moody')
  },
  {
    id: 'color:grade:social-pop',
    label: 'Social Pop Grade',
    description: 'Apply a bright social media color grade.',
    module: 'color' as ModuleName,
    keywords: ['color', 'grade', 'social', 'pop', 'vibrant', 'bright'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => colorModule.applyGrade('social-pop')
  },
  {
    id: 'color:grade:teal-orange',
    label: 'Teal Orange Grade',
    description: 'Apply a teal and orange blockbuster grade.',
    module: 'color' as ModuleName,
    keywords: ['color', 'teal', 'orange', 'hollywood', 'blockbuster'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => colorModule.applyGrade('teal-orange')
  },
  {
    id: 'color:saturate',
    label: 'Boost Saturation',
    description: 'Increase saturation on selected layers.',
    module: 'color' as ModuleName,
    keywords: ['saturate', 'saturation', 'vivid', 'color', 'boost'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => colorModule.quickSaturate(30)
  },
  {
    id: 'color:warm',
    label: 'Warm Temperature',
    description: 'Warm selected layers with a golden tone.',
    module: 'color' as ModuleName,
    keywords: ['warm', 'temperature', 'golden', 'orange', 'tone'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => colorModule.adjustTemperature('warm', 50)
  },
  {
    id: 'color:cool',
    label: 'Cool Temperature',
    description: 'Cool selected layers with a blue tone.',
    module: 'color' as ModuleName,
    keywords: ['cool', 'cold', 'temperature', 'blue', 'tone'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => colorModule.adjustTemperature('cool', 50)
  },
  {
    id: 'color:lut',
    label: 'Apply LUT',
    description: 'Apply a color lookup table effect.',
    module: 'color' as ModuleName,
    keywords: ['lut', 'lookup', 'table', 'color', 'grade', 'apply'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => colorModule.applyLUT('')
  }
]
