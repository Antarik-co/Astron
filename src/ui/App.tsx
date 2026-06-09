import React, { useState, useEffect, useCallback } from 'react'
import { ModuleName, AstronConfig, DEFAULT_ASTRON_CONFIG } from '../types/index'
import CommandBar from './components/CommandBar/CommandBar'
import ModulePanel from './components/ModulePanel/ModulePanel'
import QuickActions from './components/QuickActions/QuickActions'
import { moduleToggle } from '../core/ModuleManager/ModuleToggle'
import { indexBuilder } from '../core/CommandPalette/IndexBuilder'
import { commandRegistry } from '../core/CommandPalette/CommandRegistry'
import { csBridge, loadExtendScripts, callExtendScript } from '../bridge/CSInterface/index'
import { effectsModule } from '../modules/03_effects/Effects.module'
import { timelineModule } from '../modules/02_timeline/Timeline.module'
import { aiStudioModule } from '../modules/12_ai_studio/AIStudio.module'
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

const HOTKEY_STORAGE_KEY = 'astron-hotkeys-v1'
const AE_CONFLICTS = new Set([
  'Space', 'Escape', 'Delete', 'Backspace', 'I', 'O', 'U', 'E', 'R', 'T', 'P', 'S', 'M', 'L', 'F', 'G', 'A',
  'Ctrl+A', 'Ctrl+C', 'Ctrl+D', 'Ctrl+E', 'Ctrl+F', 'Ctrl+G', 'Ctrl+I', 'Ctrl+J', 'Ctrl+K', 'Ctrl+L', 'Ctrl+M',
  'Ctrl+N', 'Ctrl+O', 'Ctrl+P', 'Ctrl+Q', 'Ctrl+R', 'Ctrl+S', 'Ctrl+T', 'Ctrl+U', 'Ctrl+V', 'Ctrl+W', 'Ctrl+X',
  'Ctrl+Y', 'Ctrl+Z', 'Ctrl+Space', 'Ctrl+Shift+S', 'Alt+Left', 'Alt+Right', 'Alt+Up', 'Alt+Down', 'F1', 'F2',
  'F3', 'F4', 'F5', 'F9',
])

function comboFromEvent(event: KeyboardEvent | React.KeyboardEvent): string {
  const parts: string[] = []
  if (event.ctrlKey) parts.push('Ctrl')
  if (event.metaKey) parts.push('Meta')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  const code = event.code || ''
  let key = ''
  if (/^Key[A-Z]$/.test(code)) key = code.slice(3)
  else if (/^Digit\d$/.test(code)) key = code.slice(5)
  else if (/^Arrow/.test(code)) key = code.slice(5)
  else if (/^F\d{1,2}$/.test(code)) key = code
  else {
    const named: Record<string, string> = {
      Space: 'Space',
      Enter: 'Enter',
      Escape: 'Escape',
      Backspace: 'Backspace',
      Delete: 'Delete',
      BracketLeft: '[',
      BracketRight: ']',
      Comma: ',',
      Period: '.',
      Slash: '/',
      Minus: '-',
      Equal: '=',
    }
    key = named[code] || ''
  }
  if (key && !['Control', 'Alt', 'Shift', 'Meta'].includes(key)) parts.push(key)
  return parts.join('+')
}

function loadHotkeys(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(HOTKEY_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export default function App() {
  const [config, setConfig] = useState<AstronConfig>(DEFAULT_ASTRON_CONFIG)
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false)
  const [activeModule, setActiveModule] = useState<ModuleName | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [status, setStatus] = useState<any>(null)
  const [lastResult, setLastResult] = useState<{ label: string; ok: boolean; message: string } | null>(null)
  const [hotkeys, setHotkeys] = useState<Record<string, string>>(() => loadHotkeys())
  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false)
  const [listeningCommandId, setListeningCommandId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function boot() {
      moduleToggle.loadConfig()
      if (mounted) {
        setConfig({ ...moduleToggle.config })
      }

      if (csBridge.isConnected()) {
        const loadResult = await loadExtendScripts()
        if (!loadResult.success) {
          throw new Error(loadResult.error || 'Failed to load ExtendScript handlers')
        }
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
      if (listeningCommandId) {
        event.preventDefault()
        const combo = comboFromEvent(event)
        if (event.code === 'Escape') {
          setListeningCommandId(null)
          return
        }
        if (event.code === 'Backspace' || event.code === 'Delete') {
          const next = { ...hotkeys }
          delete next[listeningCommandId]
          localStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify(next))
          setHotkeys(next)
          setListeningCommandId(null)
          return
        }
        if (combo && !['Ctrl', 'Alt', 'Shift', 'Meta'].includes(combo)) {
          const next = { ...hotkeys }
          Object.keys(next).forEach((id) => {
            if (next[id] === combo) delete next[id]
          })
          next[listeningCommandId] = combo
          localStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify(next))
          setHotkeys(next)
          setListeningCommandId(null)
        }
        return
      }

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
  }, [hotkeys, listeningCommandId])

  useEffect(() => {
    let cancelled = false

    function refreshStatus() {
      if (!csBridge.isConnected()) {
        return
      }
      timelineModule.getStatus()
        .then((result) => {
          if (!cancelled && result.success) {
            setStatus(result.data)
          }
        })
        .catch(() => undefined)
    }

    refreshStatus()
    const id = window.setInterval(refreshStatus, 1500)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const handleCommandExecute = useCallback((commandId: string, params?: Record<string, string>) => {
    const cmd = commandRegistry.get(commandId)
    const started = Date.now()
    let run: Promise<any> | null = null

    if (cmd) {
      run = cmd.execute(params)
    } else if (commandId.startsWith('effect:') || commandId.startsWith('third-party:')) {
      const effectName = params?.matchName || params?.effectName || commandId.replace(/^effect:/, '').replace(/^third-party:/, '').replace(/-/g, ' ')
      run = effectsModule.addEffect(effectName)
    } else if (commandId.startsWith('preset:')) {
      const presetPath = params?.matchName || params?.presetPath || params?.path || ''
      run = effectsModule.applyAnimationPreset(presetPath)
    } else if (commandId.startsWith('layer:')) {
      run = callExtendScript({ module: 'timeline', action: 'selectLayerByName', params: { name: params?.matchName || params?.effectName || '' } })
    } else if (commandId.startsWith('comp:')) {
      run = callExtendScript({ module: 'core', action: 'openCompByName', params: { name: params?.matchName || params?.effectName || '' } })
    } else if (commandId.startsWith('script:')) {
      run = callExtendScript({ module: 'core', action: 'runScriptFile', params: { path: params?.matchName || '' } })
    } else if (commandId.startsWith('font:')) {
      setLastResult({ label: commandId, ok: true, message: 'font found - use text font commands to apply it' })
    }

    if (run) {
      run
        .then((result) => {
          const ms = Date.now() - started
          const ok = result.success !== false
          const payload = result.data as any
          const affected = payload?.layers ?? payload?.selected ?? payload?.snapped ?? payload?.shifted ?? payload?.applied ?? payload?.filled ?? payload?.converted ?? payload?.created
          const suffix = affected !== undefined ? String(affected) + ' affected' : 'done'
          setLastResult({ label: commandId, ok, message: (ok ? suffix : result.error || result.message || 'failed') + ' - ' + ms + 'ms' })
          timelineModule.getStatus().then((next) => {
            if (next.success) {
              setStatus(next.data)
            }
          }).catch(() => undefined)
        })
        .catch((error) => {
          setLastResult({ label: commandId, ok: false, message: error instanceof Error ? error.message : String(error) })
        })
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

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if (isCommandBarOpen || isHotkeysOpen || listeningCommandId) {
        return
      }
      const combo = comboFromEvent(event)
      const commandId = Object.keys(hotkeys).find((id) => hotkeys[id] === combo)
      if (commandId) {
        event.preventDefault()
        handleCommandExecute(commandId)
      }
    }

    window.addEventListener('keydown', onShortcut, true)
    return () => window.removeEventListener('keydown', onShortcut, true)
  }, [handleCommandExecute, hotkeys, isCommandBarOpen, isHotkeysOpen, listeningCommandId])

  const handleAiSubmit = useCallback(() => {
    const prompt = aiInput.trim()
    if (!prompt) {
      return
    }
    setAiResponse('Thinking...')
    aiStudioModule.query(prompt)
      .then((result) => {
        if (!result.success) {
          setAiResponse(result.message || 'AI request failed')
          return
        }
        const payload = result.data as any
        const routed = payload?.result
        if (Array.isArray(routed)) {
          setAiResponse(routed.join(', '))
        } else if (typeof routed === 'string') {
          setAiResponse(routed)
        } else {
          setAiResponse(JSON.stringify(routed || payload))
        }
      })
      .catch((error) => {
        setAiResponse(error instanceof Error ? error.message : 'AI request failed')
      })
  }, [aiInput])

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
        <span style={{ fontSize: 10, color: 'var(--astron-text-muted)' }}>{csBridge.isConnected() ? 'CEP v1.0.1' : 'v1.0.1'}</span>
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

          <button
            onClick={() => setIsHotkeysOpen(true)}
            style={{ margin: '0 12px 8px', padding: '6px 8px', background: 'var(--astron-bg-secondary)', border: '1px solid var(--astron-border)', borderRadius: 6, color: 'var(--astron-text-secondary)', fontSize: 11, cursor: 'pointer' }}
          >
            Hotkeys
          </button>

          {status && (
            <div style={{ margin: '0 12px 8px', padding: '7px 9px', background: 'var(--astron-bg-secondary)', border: '1px solid var(--astron-border)', borderRadius: 6, color: 'var(--astron-text-secondary)', fontSize: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              <span>{status.compName}</span>
              <span>{status.time}</span>
              <span>F {status.frame}</span>
              <span>{status.layers} layers</span>
              <span>{status.selected} sel</span>
              <span>{status.fps} fps</span>
            </div>
          )}

          {lastResult && (
            <div style={{ margin: '0 12px 8px', padding: '6px 8px', background: lastResult.ok ? 'rgba(46,204,113,0.12)' : 'rgba(231,76,60,0.12)', border: '1px solid ' + (lastResult.ok ? 'rgba(46,204,113,0.45)' : 'rgba(231,76,60,0.45)'), borderRadius: 6, color: lastResult.ok ? 'var(--astron-accent-green)' : 'var(--astron-accent-red)', fontSize: 10 }}>
              {lastResult.label}: {lastResult.message}
            </div>
          )}

          {activeModule && (
            <div style={{ padding: '0 12px 8px', color: 'var(--astron-text-muted)', fontSize: 11 }}>
              Active module: {activeModule.toUpperCase()}
            </div>
          )}

          <div style={{ padding: '8px 12px' }}>
            <input
              value={aiInput}
              onChange={(event) => setAiInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleAiSubmit()
                }
              }}
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
            <button
              onClick={handleAiSubmit}
              style={{
                marginTop: 6,
                width: '100%',
                background: 'var(--astron-accent)',
                border: 'none',
                borderRadius: 'var(--astron-radius-md)',
                color: '#000',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 8px',
              }}
            >
              Ask AI
            </button>
            {aiResponse && (
              <div
                style={{
                  marginTop: 6,
                  background: 'var(--astron-bg-secondary)',
                  border: '1px solid var(--astron-border)',
                  borderRadius: 'var(--astron-radius-md)',
                  color: 'var(--astron-text-secondary)',
                  fontSize: 11,
                  lineHeight: 1.4,
                  padding: '7px 9px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {aiResponse}
              </div>
            )}
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

      {isHotkeysOpen && (
        <div onClick={() => setIsHotkeysOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 50 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: 620, maxWidth: '94vw', maxHeight: '80vh', overflow: 'auto', background: 'var(--astron-bg-secondary)', border: '1px solid var(--astron-border-light)', borderRadius: 8, color: 'var(--astron-text-primary)' }}>
            <div style={{ padding: 12, borderBottom: '1px solid var(--astron-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 12 }}>HOTKEYS</strong>
              <button onClick={() => setIsHotkeysOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--astron-text-muted)', cursor: 'pointer' }}>ESC</button>
            </div>
            {allCommands.map((command) => {
              const combo = hotkeys[command.id] || ''
              const conflict = combo && AE_CONFLICTS.has(combo)
              return (
                <div key={command.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '7px 12px', borderBottom: '1px solid var(--astron-border)', alignItems: 'center', fontSize: 11 }}>
                  <span>{command.label}</span>
                  {conflict && <span style={{ color: 'var(--astron-accent-yellow)' }}>AE conflict</span>}
                  <button
                    onClick={() => setListeningCommandId(command.id)}
                    style={{ minWidth: 110, background: 'var(--astron-bg-panel)', border: '1px solid ' + (conflict ? 'var(--astron-accent-yellow)' : 'var(--astron-border-light)'), borderRadius: 4, color: conflict ? 'var(--astron-accent-yellow)' : 'var(--astron-text-secondary)', padding: '3px 6px', cursor: 'pointer', fontSize: 10 }}
                  >
                    {listeningCommandId === command.id ? 'Press keys...' : combo || 'Set'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
