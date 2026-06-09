import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'

export class TimelineModule {
  selectAfterCursor(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'selectAfterCursor', module: 'timeline', params: {} })
  }

  selectBeforeCursor(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'selectBeforeCursor', module: 'timeline', params: {} })
  }

  selectCrossing(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'selectCrossing', module: 'timeline', params: {} })
  }

  selectStartingAfterCursor(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'selectStartingAfterCursor', module: 'timeline', params: {} })
  }

  selectByType(layerType: string): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'selectByType', module: 'timeline', params: { layerType } })
  }

  invertSelection(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'invertSelection', module: 'timeline', params: {} })
  }

  shiftFrames(frames: number): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'shiftFrames', module: 'timeline', params: { frames } })
  }

  snapToCurrentTime(mode: string, ripple: boolean = false, preserveGaps: boolean = true): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'snapToCurrentTime', module: 'timeline', params: { mode, ripple, preserveGaps } })
  }

  snapToPrevLayer(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'snapToPrevLayer', module: 'timeline', params: {} })
  }

  fillGaps(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'fillGaps', module: 'timeline', params: {} })
  }

  getStatus(): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'getStatus', module: 'timeline', params: {} })
  }

  bulkRename(pattern: string): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'bulkRename', module: 'timeline', params: { pattern } })
  }

  sortTimeline(by: string): Promise<AstronCommandResult> {
    return callExtendScript({ action: 'sortTimeline', module: 'timeline', params: { by } })
  }
}

export const timelineModule = new TimelineModule()
