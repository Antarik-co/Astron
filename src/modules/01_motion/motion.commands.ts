import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { motionModule } from './Motion.module'

export const motionCommands: AstronCommand[] = [
  {
    id: 'motion:ease:overshoot',
    label: 'Overshoot Ease',
    description: 'Apply snappy overshoot easing to selected keyframes.',
    module: 'motion' as ModuleName,
    keywords: ['ease', 'overshoot', 'easing', 'motion', 'keyframe', 'snappy', 'bounce'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      return motionModule.applyEasing('overshoot')
    }
  },
  {
    id: 'motion:ease:elastic',
    label: 'Elastic Ease',
    description: 'Apply spring-like elastic easing to selected keyframes.',
    module: 'motion' as ModuleName,
    keywords: ['ease', 'elastic', 'spring', 'easing', 'motion', 'keyframe'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      return motionModule.applyEasing('elastic')
    }
  },
  {
    id: 'motion:ease:bounce',
    label: 'Bounce Ease',
    description: 'Apply bounce easing to selected keyframes.',
    module: 'motion' as ModuleName,
    keywords: ['ease', 'bounce', 'easing', 'motion', 'keyframe', 'rubber'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      return motionModule.applyEasing('bounce')
    }
  },
  {
    id: 'motion:ease:ease-in',
    label: 'Ease In',
    description: 'Apply ease-in timing to selected keyframes.',
    module: 'motion' as ModuleName,
    keywords: ['ease', 'ease-in', 'decelerate', 'slow', 'easing'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      return motionModule.applyEasing('ease-in')
    }
  },
  {
    id: 'motion:ease:ease-out',
    label: 'Ease Out',
    description: 'Apply ease-out timing to selected keyframes.',
    module: 'motion' as ModuleName,
    keywords: ['ease', 'ease-out', 'accelerate', 'fast', 'easing'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      return motionModule.applyEasing('ease-out')
    }
  },
  {
    id: 'motion:ease:linear',
    label: 'Linear Ease',
    description: 'Apply linear timing to selected keyframes.',
    module: 'motion' as ModuleName,
    keywords: ['ease', 'linear', 'constant', 'easing', 'motion'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      return motionModule.applyEasing('linear')
    }
  },
  {
    id: 'motion:stagger:default',
    label: 'Stagger Layers',
    description: 'Stagger selected layers by a default delay.',
    module: 'motion' as ModuleName,
    keywords: ['stagger', 'cascade', 'delay', 'offset', 'timing', 'layers'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      const delayMs = Number((params as any)?.delayMs ?? (params as any)?.param0 ?? 100)
      const direction = String((params as any)?.direction ?? 'right')
      return motionModule.applyStagger(delayMs, direction)
    }
  },
  {
    id: 'motion:bounce',
    label: 'Apply Bounce',
    description: 'Apply bounce physics to selected animation.',
    module: 'motion' as ModuleName,
    keywords: ['bounce', 'physics', 'height', 'decay', 'elastic'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      const height = Number((params as any)?.height ?? 50)
      const decay = Number((params as any)?.decay ?? 0.7)
      const elasticity = Number((params as any)?.elasticity ?? 1.2)
      return motionModule.applyBounce(height, decay, elasticity)
    }
  },
  {
    id: 'motion:wiggle',
    label: 'Apply Wiggle',
    description: 'Apply wiggle motion to selected properties.',
    module: 'motion' as ModuleName,
    keywords: ['wiggle', 'shake', 'noise', 'random', 'vibrate'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      const frequency = Number((params as any)?.frequency ?? 2)
      const amplitude = Number((params as any)?.amplitude ?? 20)
      return motionModule.applyWiggle(frequency, amplitude)
    }
  },
  {
    id: 'motion:loop:cycle',
    label: 'Loop Cycle',
    description: 'Loop selected animation with cycle behavior.',
    module: 'motion' as ModuleName,
    keywords: ['loop', 'cycle', 'repeat', 'animation', 'infinite'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      return motionModule.applyLoop('cycle')
    }
  },
  {
    id: 'motion:loop:pingpong',
    label: 'Loop Pingpong',
    description: 'Loop selected animation back and forth.',
    module: 'motion' as ModuleName,
    keywords: ['loop', 'pingpong', 'back', 'forth', 'bounce', 'repeat'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      return motionModule.applyLoop('pingpong')
    }
  },
  {
    id: 'motion:copy-ease',
    label: 'Copy Ease',
    description: 'Copy easing from selected keyframes.',
    module: 'motion' as ModuleName,
    keywords: ['copy', 'ease', 'easing', 'keyframe', 'clone'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      return motionModule.copyEasing()
    }
  },
  {
    id: 'motion:paste-ease',
    label: 'Paste Ease',
    description: 'Paste copied easing to selected keyframes.',
    module: 'motion' as ModuleName,
    keywords: ['paste', 'ease', 'easing', 'apply', 'keyframe'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      return motionModule.pasteEasing()
    }
  }
]
