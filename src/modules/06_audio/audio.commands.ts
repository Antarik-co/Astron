import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { audioModule } from './Audio.module'

export const audioCommands: AstronCommand[] = [
  {
    id: 'audio:beats',
    label: 'Detect Beats',
    description: 'Detect beats and place comp markers at a given BPM.',
    module: 'audio' as ModuleName,
    keywords: ['beat', 'detect', 'bpm', 'sync', 'audio', 'music', 'markers', 'rhythm'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      const bpm = Number((params as any)?.bpm ?? (params as any)?.param0 ?? 120)
      return audioModule.detectBeats(bpm)
    }
  },
  {
    id: 'audio:sync',
    label: 'Sync Layer To Markers',
    description: 'Sync selected layer animation to comp markers.',
    module: 'audio' as ModuleName,
    keywords: ['sync', 'layer', 'markers', 'beat', 'audio', 'animate'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => audioModule.syncLayerToMarkers()
  },
  {
    id: 'audio:tempo',
    label: 'Set Tempo',
    description: 'Set composition frame rate to match a BPM grid.',
    module: 'audio' as ModuleName,
    keywords: ['tempo', 'bpm', 'framerate', 'grid', 'timing', 'beat'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => {
      const bpm = Number((params as any)?.bpm ?? (params as any)?.param0 ?? 120)
      return audioModule.setTempo(bpm)
    }
  }
]
