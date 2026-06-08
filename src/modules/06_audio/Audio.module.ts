import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'

export class AudioModule {
  detectBeats(bpm?: number, times?: number[]): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'detectBeats', module: 'audio', params: { bpm: bpm ?? null, times: times ?? null } })
  }

  placeMarkersAtTimes(times: number[]): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'placeMarkersAtTimes', module: 'audio', params: { times } })
  }

  syncLayerToMarkers(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'syncLayerToMarkers', module: 'audio', params: {} })
  }

  setTempo(bpm: number): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'setTempo', module: 'audio', params: { bpm } })
  }
}

export const audioModule = new AudioModule()
