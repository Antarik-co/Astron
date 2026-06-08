import React from 'react'
import { ModuleName, MODULE_DISPLAY_NAMES } from '../../../types/index'
import './ModulePanel.css'

interface ModulePanelProps {
  enabledModules: ModuleName[]
  onToggle: (module: ModuleName, enabled: boolean) => void
  onModuleClick: (module: ModuleName) => void
}

const MODULE_ICONS: Record<ModuleName, string> = {
  motion: '⚡',
  timeline: '▤',
  effects: '✨',
  rig: '◇',
  '3d': '⬡',
  audio: '♫',
  color: '◐',
  text: '✍️',
  export: '⇧',
  organize: '☷',
  automate: '⚙️',
  ai_studio: 'AI',
}

const ALL_MODULES: ModuleName[] = ['motion', 'timeline', 'effects', 'rig', '3d', 'audio', 'color', 'text', 'export', 'organize', 'automate', 'ai_studio']

export default function ModulePanel({ enabledModules, onToggle, onModuleClick }: ModulePanelProps) {
  return (
    <div className="astron-module-panel">
      <div className="astron-module-header">
        <span>MODULES</span>
        <span className="astron-module-count">ACTIVE: {enabledModules.length}/12</span>
      </div>
      <div className="astron-module-grid">
        {ALL_MODULES.map((mod) => {
          const isEnabled = enabledModules.includes(mod)
          return (
            <div
              key={mod}
              className={`astron-module-badge ${isEnabled ? 'enabled' : 'disabled'}`}
              onClick={() => onModuleClick(mod)}
            >
              <span className="astron-module-icon">{MODULE_ICONS[mod]}</span>
              <span className="astron-module-name">{MODULE_DISPLAY_NAMES[mod]}</span>
              <span
                className={`astron-module-dot ${isEnabled ? 'on' : 'off'}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle(mod, !isEnabled)
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
