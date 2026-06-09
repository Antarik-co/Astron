import { CommandSource, IndexEntry, ModuleName } from '../../types/index'
import { callExtendScript } from '../../bridge/CSInterface/index'
import { commandRegistry } from './CommandRegistry'
import { fuzzySearch } from './FuzzySearch'

interface InstalledEffect {
  displayName: string
  matchName: string
  category?: string
}

interface AnimationPreset {
  displayName: string
  path: string
  category?: string
}

const FALLBACK_EFFECTS: InstalledEffect[] = [
  { displayName: 'Gaussian Blur', matchName: 'ADBE Gaussian Blur 2', category: 'Blur & Sharpen' },
  { displayName: 'Fast Box Blur', matchName: 'ADBE Box Blur2', category: 'Blur & Sharpen' },
  { displayName: 'Camera Lens Blur', matchName: 'ADBE Camera Lens Blur', category: 'Blur & Sharpen' },
  { displayName: 'Directional Blur', matchName: 'ADBE Motion Blur', category: 'Blur & Sharpen' },
  { displayName: 'Radial Blur', matchName: 'ADBE Radial Blur', category: 'Blur & Sharpen' },
  { displayName: 'Sharpen', matchName: 'ADBE Sharpen', category: 'Blur & Sharpen' },
  { displayName: 'Unsharp Mask', matchName: 'ADBE Unsharp Mask2', category: 'Blur & Sharpen' },
  { displayName: 'Glow', matchName: 'ADBE Glo2', category: 'Stylize' },
  { displayName: 'Fill', matchName: 'ADBE Fill', category: 'Generate' },
  { displayName: 'Stroke', matchName: 'ADBE Stroke', category: 'Generate' },
  { displayName: 'Gradient Ramp', matchName: 'ADBE Ramp', category: 'Generate' },
  { displayName: 'Fractal Noise', matchName: 'ADBE Fractal Noise', category: 'Noise & Grain' },
  { displayName: 'Turbulent Noise', matchName: 'ADBE Turbulent Noise', category: 'Noise & Grain' },
  { displayName: 'Lens Flare', matchName: 'ADBE Lens Flare', category: 'Generate' },
  { displayName: 'Grid', matchName: 'ADBE Grid', category: 'Generate' },
  { displayName: 'Vegas', matchName: 'ADBE Vegas', category: 'Generate' },
  { displayName: 'Levels', matchName: 'ADBE Levels2', category: 'Color Correction' },
  { displayName: 'Curves', matchName: 'ADBE CurvesCustom', category: 'Color Correction' },
  { displayName: 'Hue/Saturation', matchName: 'ADBE HUE SATURATION', category: 'Color Correction' },
  { displayName: 'Brightness & Contrast', matchName: 'ADBE Brightness & Contrast 2', category: 'Color Correction' },
  { displayName: 'Exposure', matchName: 'ADBE Exposure2', category: 'Color Correction' },
  { displayName: 'Lumetri Color', matchName: 'ADBE Lumetri', category: 'Color Correction' },
  { displayName: 'Tint', matchName: 'ADBE Tint', category: 'Color Correction' },
  { displayName: 'Tritone', matchName: 'ADBE Tritone', category: 'Color Correction' },
  { displayName: 'Photo Filter', matchName: 'ADBE Photo Filter', category: 'Color Correction' },
  { displayName: 'Color Balance', matchName: 'ADBE Color Balance 2', category: 'Color Correction' },
  { displayName: 'Drop Shadow', matchName: 'ADBE Drop Shadow', category: 'Perspective' },
  { displayName: 'Radial Shadow', matchName: 'ADBE Radial Shadow', category: 'Perspective' },
  { displayName: 'Bevel Alpha', matchName: 'ADBE Bevel Alpha', category: 'Perspective' },
  { displayName: 'Corner Pin', matchName: 'ADBE Corner Pin', category: 'Distort' },
  { displayName: 'Bezier Warp', matchName: 'ADBE BEZMESH', category: 'Distort' },
  { displayName: 'Mesh Warp', matchName: 'ADBE MESH WARP', category: 'Distort' },
  { displayName: 'Liquify', matchName: 'ADBE Liquify', category: 'Distort' },
  { displayName: 'Wave Warp', matchName: 'ADBE Wave Warp', category: 'Distort' },
  { displayName: 'Ripple', matchName: 'ADBE Ripple', category: 'Distort' },
  { displayName: 'Turbulent Displace', matchName: 'ADBE Turbulent Displace', category: 'Distort' },
  { displayName: 'Transform', matchName: 'ADBE Geometry2', category: 'Distort' },
  { displayName: 'Warp Stabilizer', matchName: 'ADBE Warp Stabilizer', category: 'Distort' },
  { displayName: 'Echo', matchName: 'ADBE Echo', category: 'Time' },
  { displayName: 'Posterize Time', matchName: 'ADBE Posterize Time', category: 'Time' },
  { displayName: 'Time Displacement', matchName: 'ADBE Time Displacement', category: 'Time' },
  { displayName: 'CC Particle World', matchName: 'CC Particle World', category: 'Simulation' },
  { displayName: 'CC Particle Systems II', matchName: 'CC Particle Systems II', category: 'Simulation' },
  { displayName: 'Particle Playground', matchName: 'ADBE Particle Playground', category: 'Simulation' },
  { displayName: 'Shatter', matchName: 'ADBE Shatter', category: 'Simulation' },
  { displayName: 'Card Dance', matchName: 'ADBE Card Dance', category: 'Simulation' },
  { displayName: 'Foam', matchName: 'ADBE Foam', category: 'Simulation' },
  { displayName: 'Simple Choker', matchName: 'ADBE Simple Choker', category: 'Matte' },
  { displayName: 'Set Matte', matchName: 'ADBE Set Matte3', category: 'Channel' },
  { displayName: 'Minimax', matchName: 'ADBE Minimax', category: 'Channel' },
  { displayName: 'Shift Channels', matchName: 'ADBE Shift Channels', category: 'Channel' },
  { displayName: 'Linear Wipe', matchName: 'ADBE Linear Wipe', category: 'Transition' },
  { displayName: 'Venetian Blinds', matchName: 'ADBE Venetian Blinds', category: 'Transition' },
  { displayName: 'CC Light Sweep', matchName: 'CC Light Sweep', category: 'CC Bundle' },
  { displayName: 'CC Radial Fast Blur', matchName: 'CC Radial Fast Blur', category: 'CC Bundle' },
  { displayName: 'CC Force Motion Blur', matchName: 'CC Force Motion Blur', category: 'CC Bundle' },
  { displayName: 'CC Glass', matchName: 'CC Glass', category: 'CC Bundle' },
  { displayName: 'CC Kaleida', matchName: 'CC Kaleida', category: 'CC Bundle' },
  { displayName: 'CC Bend It', matchName: 'CC Bend It', category: 'CC Bundle' },
  { displayName: 'CC RepeTile', matchName: 'CC RepeTile', category: 'CC Bundle' },
  { displayName: 'CC Toner', matchName: 'CC Toner', category: 'CC Bundle' },
]

function effectToEntry(effect: InstalledEffect): IndexEntry {
  const id = `effect:${effect.matchName || effect.displayName}`.replace(/\s+/g, '-').toLowerCase()
  return {
    id,
    label: effect.displayName,
    type: 'effect',
    source: effect.matchName.startsWith('ADBE') || effect.matchName.startsWith('CC ') ? 'native_effect' : 'third_party',
    matchName: effect.matchName,
    category: effect.category,
    keywords: [
      effect.displayName.toLowerCase(),
      effect.matchName.toLowerCase(),
      effect.category?.toLowerCase() ?? '',
      'effect',
      'plugin',
      'native',
      'ae',
    ].filter(Boolean),
  }
}

function presetToEntry(preset: AnimationPreset): IndexEntry {
  const id = `preset:${preset.path || preset.displayName}`.replace(/\s+/g, '-').toLowerCase()
  return {
    id,
    label: preset.displayName,
    type: 'preset',
    source: 'preset' as CommandSource,
    matchName: preset.path,
    category: preset.category,
    keywords: [
      preset.displayName.toLowerCase(),
      preset.path.toLowerCase(),
      preset.category?.toLowerCase() ?? '',
      'preset',
      'animation',
      'animate',
      'ffx',
      'ae',
    ].filter(Boolean),
  }
}

export class IndexBuilder {
  private isBuilt = false

  public async build(): Promise<void> {
    const astronCommands = this.buildAstronCommands()
    const effects = await this.buildEffects()
    const presets = await this.buildAnimationPresets()
    this.isBuilt = true
    fuzzySearch.buildIndex([...astronCommands, ...effects, ...presets])
  }

  public addThirdPartyEffect(name: string, pluginName: string): void {
    fuzzySearch.addEntry({
      id: `third-party:${pluginName}:${name}`.replace(/\s+/g, '-').toLowerCase(),
      label: name,
      type: 'effect',
      source: 'third_party' as CommandSource,
      category: pluginName,
      keywords: [name.toLowerCase(), pluginName.toLowerCase(), 'plugin', 'effect'],
    })
  }

  public addScript(scriptName: string): void {
    fuzzySearch.addEntry({
      id: `script:${scriptName.replace(/\s+/g, '-').toLowerCase()}`,
      label: scriptName,
      type: 'script',
      source: 'script' as CommandSource,
      keywords: [scriptName.toLowerCase(), 'script', 'run', 'execute'],
    })
  }

  public isReady(): boolean {
    return this.isBuilt
  }

  private async buildEffects(): Promise<IndexEntry[]> {
    const scanned = await this.scanInstalledEffects()
    const byMatchName = new Map<string, InstalledEffect>()

    FALLBACK_EFFECTS.forEach((effect) => byMatchName.set(effect.matchName, effect))
    scanned.forEach((effect) => byMatchName.set(effect.matchName || effect.displayName, effect))

    return Array.from(byMatchName.values()).map(effectToEntry)
  }

  private async buildAnimationPresets(): Promise<IndexEntry[]> {
    const presets = await this.scanAnimationPresets()
    const byPath = new Map<string, AnimationPreset>()

    presets.forEach((preset) => byPath.set(preset.path || preset.displayName, preset))

    return Array.from(byPath.values()).map(presetToEntry)
  }

  private async scanInstalledEffects(): Promise<InstalledEffect[]> {
    try {
      const result = await callExtendScript({
        module: 'effects',
        action: 'scanInstalledEffects',
        params: {},
      })
      if (!result.success || !Array.isArray(result.data)) {
        return []
      }
      return result.data.filter((item): item is InstalledEffect => {
        return typeof item?.displayName === 'string' && typeof item?.matchName === 'string'
      })
    } catch {
      return []
    }
  }

  private async scanAnimationPresets(): Promise<AnimationPreset[]> {
    try {
      const result = await callExtendScript({
        module: 'effects',
        action: 'scanAnimationPresets',
        params: {},
      })
      if (!result.success || !Array.isArray(result.data)) {
        return []
      }
      return result.data.filter((item): item is AnimationPreset => {
        return typeof item?.displayName === 'string' && typeof item?.path === 'string'
      })
    } catch {
      return []
    }
  }

  private buildAstronCommands(): IndexEntry[] {
    return commandRegistry.getAll().map((command): IndexEntry => ({
      id: command.id,
      label: command.label,
      type: 'command',
      source: 'astron' as CommandSource,
      module: command.module as ModuleName,
      keywords: command.keywords,
    }))
  }
}

export const indexBuilder = new IndexBuilder()
