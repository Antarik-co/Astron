import React, { useState, useEffect, useCallback } from 'react'
import { ModuleName, AstronConfig, DEFAULT_ASTRON_CONFIG } from '../types/index'
import CommandBar from './components/CommandBar/CommandBar'
import ModulePanel from './components/ModulePanel/ModulePanel'
import QuickActions from './components/QuickActions/QuickActions'
import { moduleToggle } from '../core/ModuleManager/ModuleToggle'
import { indexBuilder } from '../core/CommandPalette/IndexBuilder'
import { commandRegistry } from '../core/CommandPalette/CommandRegistry'
import { csBridge } from '../bridge/CSInterface/index'
import '../ui/themes/variables.css'

import { motionCommands } from '../modules/01_motion/motion.commands'
import { timelineCommands } from '../modules/02_timeline/timeline.commands'
import { effectsCommands } from '../modules/03_effects/effects.commands'
import { rigCommands } from '../modules/04_rig/rig.commands'
import { threeDCommands } from '../modules/05_3d/3d.commands'
import { audioCommands } from '../modules/06_audio/audio.commands'
import { colorCommands } from '../modules/07_color/color.commands'
import { textCommands } from '../modules/08_text/text.commands'
import { exportCommands } from '../modules/09_export/export.commands'
import { organizeCommands } from '../modules/10_organize/organize.commands'
import { automateCommands } from '../modules/11_automate/automate.commands'
import { aiStudioCommands } from '../modules/12_ai_studio/ai_studio.commands'

const allCommands = [
  ...motionCommands,
  ...timelineCommands,
  ...effectsCommands,
  ...rigCommands,
  ...threeDCommands,
  ...audioCommands,
  ...colorCommands,
  ...textCommands,
  ...exportCommands,
  ...organizeCommands,
  ...automateCommands,
  ...aiStudioCommands,
]

export default function App() {
  const [config, setConfig] = useState<AstronConfig>(DEFAULT_ASTRON_CONFIG)
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false)
  const [activeModule, setActiveModule] = useState<ModuleName | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>([])
  const [aiInput, setAiInput] = useState('')

  useEffect(() => {
    let mounted = true

    async function boot() {
      moduleToggle.loadConfig()
      if (mounted) {
        setConfig({ ...moduleToggle.config })
      }

      allCommands.forEach((cmd) => {
        try {
          commandRegistry.register(cmd)
        } catch {
          return
        }
      })

      await indexBuilder.build()

      if (mounted) {
        setIsLoading(false)
      }
    }

    boot().catch((error) => {
      console.error(error)
      if (mounted) {
        setIsLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
        event.preventDefault()
        setIsCommandBarOpen(true)
      }
      if (event.code === 'Escape') {
        setIsCommandBarOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleCommandExecute = useCallback((commandId: string) => {
    const cmd = commandRegistry.get(commandId)
    if (cmd) {
      cmd.execute().catch(console.error)
    }
    setRecentCommandIds((prev) => [commandId, ...prev.filter((id) => id !== commandId)].slice(0, 5))
    setIsCommandBarOpen(false)
  }, [])

  const handleModuleToggle = useCallback((module: ModuleName, enabled: boolean) => {
    const action = enabled ? moduleToggle.enable(module) : moduleToggle.disable(module)
    action
      .then(() => setConfig({ ...moduleToggle.config }))
      .catch(console.error)
  }, [])

  const handleQuickAction = useCallback((actionId: string) => {
    const cmd = commandRegistry.get(actionId)
    if (cmd) {
      cmd.execute().catch(console.error)
    }
  }, [])

  const enabledModules = config.modules
    ? Object.entries(config.modules).filter(([, v]) => v).map(([k]) => k as ModuleName)
    : []

  return (
    <div
      className="astron-root"
      style={{
        background: 'var(--astron-bg-primary)',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: 'var(--astron-font)',
        color: 'var(--astron-text-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="astron-header"
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--astron-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--astron-accent)', letterSpacing: 1 }}>ASTRON</span>
        <span style={{ fontSize: 10, color: 'var(--astron-text-muted)' }}>{csBridge.isConnected() ? 'CEP' : 'v1.0.0'}</span>
      </div>

      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: 'var(--astron-accent)', fontSize: 13 }}>⚡ Indexing...</div>
          <div style={{ color: 'var(--astron-text-muted)', fontSize: 11 }}>Building search index</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div
            onClick={() => setIsCommandBarOpen(true)}
            style={{
              margin: '10px 12px',
              padding: '8px 12px',
              background: 'var(--astron-bg-panel)',
              border: '1px solid var(--astron-border)',
              borderRadius: 'var(--astron-radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: 'var(--astron-accent)', fontWeight: 700 }}>⌘</span>
            <span style={{ color: 'var(--astron-text-muted)', fontSize: 12 }}>Search commands, effects, anything...</span>
            <kbd style={{ marginLeft: 'auto', background: '#333', color: '#777', border: '1px solid #444', borderRadius: 3, padding: '1px 5px', fontSize: 10 }}>Space</kbd>
          </div>

          <ModulePanel
            enabledModules={enabledModules}
            onToggle={handleModuleToggle}
            onModuleClick={(mod) => setActiveModule(mod)}
          />

          <QuickActions onAction={handleQuickAction} favorites={config.favorites} />

          {activeModule && (
            <div style={{ padding: '0 12px 8px', color: 'var(--astron-text-muted)', fontSize: 11 }}>
              Active module: {activeModule.toUpperCase()}
            </div>
          )}

          <div style={{ padding: '8px 12px' }}>
            <input
              value={aiInput}
              onChange={(event) => setAiInput(event.target.value)}
              placeholder='AI: "Ask me anything..."'
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'var(--astron-bg-secondary)',
                border: '1px solid var(--astron-border)',
                borderRadius: 'var(--astron-radius-md)',
                color: 'var(--astron-text-secondary)',
                padding: '7px 9px',
                fontSize: 12,
                outline: 'none',
              }}
            />
          </div>

          {recentCommandIds.length > 0 && (
            <div style={{ padding: '8px 12px' }}>
              <div style={{ fontSize: 10, color: '#666', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>RECENT</div>
              {recentCommandIds.map((id) => {
                const cmd = commandRegistry.get(id)
                return cmd ? (
                  <div
                    key={id}
                    onClick={() => handleCommandExecute(id)}
                    style={{ padding: '5px 8px', fontSize: 12, color: '#AAAAAA', cursor: 'pointer', borderRadius: 4 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#2A2A2A' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {cmd.label}
                  </div>
                ) : null
              })}
            </div>
          )}
        </div>
      )}

      <CommandBar
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        onCommandExecute={handleCommandExecute}
      />
    </div>
  )
}
