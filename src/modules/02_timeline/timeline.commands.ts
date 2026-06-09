import { AstronCommand, ModuleName, CommandParams, AstronCommandResult } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { timelineModule } from './Timeline.module'

function getPattern(params?: CommandParams): string {
  return String((params as any)?.pattern ?? (params as any)?.param0 ?? '')
}

export const timelineCommands: AstronCommand[] = [
  {
    id: 'timeline:select:after',
    label: 'Select After Cursor',
    description: 'Select layers starting after the current playhead.',
    module: 'timeline' as ModuleName,
    keywords: ['select', 'after', 'cursor', 'layers', 'playhead', 'timeline'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.selectAfterCursor()
  },
  {
    id: 'timeline:select:before',
    label: 'Select Before Cursor',
    description: 'Select layers ending before the current playhead.',
    module: 'timeline' as ModuleName,
    keywords: ['select', 'before', 'cursor', 'layers', 'playhead'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.selectBeforeCursor()
  },
  {
    id: 'timeline:select:crossing',
    label: 'Select Crossing Cursor',
    description: 'Select layers active at the current playhead.',
    module: 'timeline' as ModuleName,
    keywords: ['select', 'crossing', 'active', 'cursor', 'current'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.selectCrossing()
  },
  {
    id: 'timeline:select:starting-after',
    label: 'Select Starting After Cursor',
    description: 'Select layers whose start time begins after the current playhead.',
    module: 'timeline' as ModuleName,
    keywords: ['select', 'starting', 'after', 'starttime', 'precomp', 'time-remap', 'cursor'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.selectStartingAfterCursor()
  },
  {
    id: 'timeline:select:adj',
    label: 'Select Adjustment Layers',
    description: 'Select adjustment layers in the active composition.',
    module: 'timeline' as ModuleName,
    keywords: ['select', 'adjustment', 'adj', 'layer', 'type', 'filter'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.selectByType('adj')
  },
  {
    id: 'timeline:select:null',
    label: 'Select Null Layers',
    description: 'Select null controller layers in the active composition.',
    module: 'timeline' as ModuleName,
    keywords: ['select', 'null', 'controller', 'layer', 'type'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.selectByType('null')
  },
  {
    id: 'timeline:select:shape',
    label: 'Select Shape Layers',
    description: 'Select shape layers in the active composition.',
    module: 'timeline' as ModuleName,
    keywords: ['select', 'shape', 'vector', 'layer', 'type'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.selectByType('shape')
  },
  {
    id: 'timeline:select:precomp',
    label: 'Select Precomps',
    description: 'Select precomp layers in the active composition.',
    module: 'timeline' as ModuleName,
    keywords: ['select', 'precomp', 'nested', 'comp', 'layer'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.selectByType('precomp')
  },
  {
    id: 'timeline:invert',
    label: 'Invert Selection',
    description: 'Invert selected and unselected timeline layers.',
    module: 'timeline' as ModuleName,
    keywords: ['invert', 'selection', 'toggle', 'flip', 'select'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.invertSelection()
  },
  {
    id: 'timeline:shift:+1',
    label: 'Shift Forward 1 Frame',
    description: 'Move selected layers forward by one frame.',
    module: 'timeline' as ModuleName,
    keywords: ['shift', 'frame', 'move', 'nudge', '+1'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.shiftFrames(1)
  },
  {
    id: 'timeline:shift:-1',
    label: 'Shift Back 1 Frame',
    description: 'Move selected layers back by one frame.',
    module: 'timeline' as ModuleName,
    keywords: ['shift', 'frame', 'move', 'nudge', '-1'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.shiftFrames(-1)
  },
  {
    id: 'timeline:shift:+5',
    label: 'Shift Forward 5 Frames',
    description: 'Move selected layers forward by five frames.',
    module: 'timeline' as ModuleName,
    keywords: ['shift', 'frames', 'move', '+5'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.shiftFrames(5)
  },
  {
    id: 'timeline:shift:-5',
    label: 'Shift Back 5 Frames',
    description: 'Move selected layers back by five frames.',
    module: 'timeline' as ModuleName,
    keywords: ['shift', 'frames', 'move', '-5'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.shiftFrames(-5)
  },
  {
    id: 'timeline:shift:+10',
    label: 'Shift Forward 10 Frames',
    description: 'Move selected layers forward by ten frames.',
    module: 'timeline' as ModuleName,
    keywords: ['shift', 'frames', 'move', '+10'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.shiftFrames(10)
  },
  {
    id: 'timeline:shift:-10',
    label: 'Shift Back 10 Frames',
    description: 'Move selected layers back by ten frames.',
    module: 'timeline' as ModuleName,
    keywords: ['shift', 'frames', 'move', '-10'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.shiftFrames(-10)
  },
  {
    id: 'timeline:snap:closest',
    label: 'Snap Closest Edge',
    description: 'Snap the closest selected layer edge to the playhead.',
    module: 'timeline' as ModuleName,
    keywords: ['snap', 'align', 'cursor', 'playhead', 'closest'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.snapToCurrentTime('closest')
  },
  {
    id: 'timeline:snap:earliest-start',
    label: 'Snap Earliest Start',
    description: 'Snap the earliest selected layer start to the playhead.',
    module: 'timeline' as ModuleName,
    keywords: ['snap', 'earliest', 'start', 'align'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.snapToCurrentTime('earliest-start')
  },
  {
    id: 'timeline:snap:latest-start',
    label: 'Snap Latest Start',
    description: 'Snap the latest selected layer start to the playhead.',
    module: 'timeline' as ModuleName,
    keywords: ['snap', 'latest', 'start', 'align', 'preserve', 'gap'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.snapToCurrentTime('latest-start')
  },
  {
    id: 'timeline:snap:earliest-end',
    label: 'Snap Earliest End',
    description: 'Snap the earliest selected layer end to the playhead.',
    module: 'timeline' as ModuleName,
    keywords: ['snap', 'earliest', 'end', 'align', 'preserve', 'gap'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.snapToCurrentTime('earliest-end')
  },
  {
    id: 'timeline:snap:latest-end',
    label: 'Snap Latest End',
    description: 'Snap the latest selected layer end to the playhead.',
    module: 'timeline' as ModuleName,
    keywords: ['snap', 'latest', 'end', 'align', 'preserve', 'gap'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.snapToCurrentTime('latest-end')
  },
  {
    id: 'timeline:snap:closest:ripple',
    label: 'Ripple Snap Closest Edge',
    description: 'Snap the closest selected edge and ripple downstream layers by the same frame-accurate offset.',
    module: 'timeline' as ModuleName,
    keywords: ['snap', 'ripple', 'closest', 'gap', 'preserve', 'downstream'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.snapToCurrentTime('closest', true, true)
  },
  {
    id: 'timeline:snap:earliest-start:ripple',
    label: 'Ripple Snap Earliest Start',
    description: 'Snap the earliest selected start and ripple downstream layers while preserving gaps.',
    module: 'timeline' as ModuleName,
    keywords: ['snap', 'ripple', 'earliest', 'start', 'gap', 'preserve'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.snapToCurrentTime('earliest-start', true, true)
  },
  {
    id: 'timeline:rename',
    label: 'Bulk Rename Layers',
    description: 'Rename selected layers using an input pattern.',
    module: 'timeline' as ModuleName,
    keywords: ['rename', 'bulk', 'layers', 'name', 'pattern'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.bulkRename(getPattern(params))
  },
  {
    id: 'timeline:sort',
    label: 'Sort Timeline',
    description: 'Sort timeline layers by name.',
    module: 'timeline' as ModuleName,
    keywords: ['sort', 'order', 'layers', 'timeline', 'organize'],
    execute: async (params?: CommandParams): Promise<AstronCommandResult> => timelineModule.sortTimeline('name')
  }
]
