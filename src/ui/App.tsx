import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ModuleName, AstronConfig, DEFAULT_ASTRON_CONFIG, SearchResult } from '../types/index'
import QuickActions from './components/QuickActions/QuickActions'
import { moduleToggle } from '../core/ModuleManager/ModuleToggle'
import { indexBuilder } from '../core/CommandPalette/IndexBuilder'
import { fuzzySearch } from '../core/CommandPalette/FuzzySearch'
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

const TASK_BUTTONS = [
  { id: 'effects:glow:medium', label: 'Add Glow', icon: '✨', color: '#0052FF' },
  { id: 'motion:ease:overshoot', label: 'Easy Ease', icon: '🎬', color: '#00E5FF' },
  { id: 'automate:null', label: 'Create Null', icon: '🎯', color: '#6C3FFF' },
  { id: '3d:camera:orbit', label: 'Camera Orbit', icon: '🎥', color: '#0052FF' },
  { id: 'audio:beats', label: 'Beat Sync', icon: '🔊', color: '#00E5FF' },
  { id: 'organize:clean', label: 'Clean Project', icon: '🧹', color: '#4A7AFF' },
  { id: 'export:web', label: 'Export MP4', icon: '📤', color: '#0052FF' },
  { id: 'automate:anchor', label: 'Center Anchor', icon: '⭕', color: '#6C3FFF' },
  { id: 'color:grade:cinematic', label: 'Color Grade', icon: '🎨', color: '#0066FF' },
  { id: 'text:animate:typewriter', label: 'Typewriter', icon: '📝', color: '#00E5FF' },
  { id: 'automate:precomp', label: 'Precomp', icon: '📦', color: '#4A7AFF' },
  { id: 'automate:purge', label: 'Purge RAM', icon: '⚡', color: '#6C3FFF' },
  { id: 'motion:loop:cycle', label: 'Loop Cycle', icon: '🔄', color: '#0052FF' },
  { id: 'motion:stagger:default', label: 'Stagger Layers', icon: '🎭', color: '#00E5FF' },
  { id: 'text:animate:fade-up', label: 'Text Fade Up', icon: '📄', color: '#0066FF' },
  { id: 'organize:health', label: 'Health Check', icon: '📊', color: '#6C3FFF' },
]

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
      Space: 'Space', Enter: 'Enter', Escape: 'Escape', Backspace: 'Backspace', Delete: 'Delete',
      BracketLeft: '[', BracketRight: ']', Comma: ',', Period: '.', Slash: '/', Minus: '-', Equal: '=',
    }
    key = named[code] || ''
  }
  if (key && !['Control', 'Alt', 'Shift', 'Meta'].includes(key)) parts.push(key)
  return parts.join('+')
}

function loadHotkeys(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(HOTKEY_STORAGE_KEY) || '{}') } catch { return {} }
}

export default function App() {
  const [config, setConfig] = useState<AstronConfig>(DEFAULT_ASTRON_CONFIG)
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
  const [showAiKeys, setShowAiKeys] = useState(false)
  const [groqKeyInput, setGroqKeyInput] = useState('')
  const [geminiKeyInput, setGeminiKeyInput] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [showAllCommands, setShowAllCommands] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})

  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0)

  const searchRef = useRef<HTMLInputElement>(null)

  function loadKeyInputs() {
    setGroqKeyInput(localStorage.getItem('astron-groq-keys') || '')
    setGeminiKeyInput(localStorage.getItem('astron-gemini-keys') || '')
  }

  const commandsByModule = useMemo(() => {
    const groups: Record<string, typeof allCommands> = {}
    if (!showAllCommands) return groups
    allCommands.forEach(cmd => {
      const mod = cmd.module || 'other'
      if (!groups[mod]) groups[mod] = []
      groups[mod].push(cmd)
    })
    return groups
  }, [showAllCommands])

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchQuery.trim()) return []
    return fuzzySearch.search(searchQuery, 12)
  }, [searchQuery])

  function selectSearchResult(commandId: string) {
    setShowSearchDropdown(false)
    setSearchQuery('')
    handleCommandExecute(commandId)
  }

  function handleSearchInput(event: React.ChangeEvent<HTMLInputElement>) {
    const val = event.target.value
    setSearchQuery(val)
    setShowSearchDropdown(val.trim().length > 0)
    setSelectedSearchIndex(0)
  }

  function handleSearchKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      setShowSearchDropdown(false)
      searchRef.current?.blur()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedSearchIndex(i => Math.min(i + 1, searchResults.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedSearchIndex(i => Math.max(i - 1, 0))
      return
    }
    if (event.key === 'Enter' && searchResults.length > 0) {
      event.preventDefault()
      selectSearchResult(searchResults[selectedSearchIndex].entry.id)
      return
    }
  }

  function handleCategoryClick(mod: ModuleName) {
    setActiveModule(mod)
    setSearchQuery('')
    setShowSearchDropdown(true)
    searchRef.current?.focus()
  }

  function focusSearch() {
    searchRef.current?.focus()
    if (searchQuery.trim()) {
      setShowSearchDropdown(true)
    }
  }

  useEffect(() => {
    let mounted = true
    async function boot() {
      moduleToggle.loadConfig()
      if (mounted) setConfig({ ...moduleToggle.config })

      if (csBridge.isConnected()) {
        const testResult = await csBridge.testBridge()
        if (!testResult.success) {
          setLastResult({ label: 'Bridge', ok: false, message: 'CEP evalScript failed: ' + testResult.error })
        } else {
          const loadResult = await loadExtendScripts()
          if (!loadResult.success) {
            setLastResult({ label: 'ExtendScript', ok: false, message: loadResult.error || 'Failed to load ExtendScript handlers' })
          } else {
            const loadData = (loadResult.data || {}) as any
            if (loadData.errors) {
              setLastResult({ label: 'ExtendScript', ok: false, message: 'Loaded ' + loadData.loaded + '/' + loadData.total + ' files - Errors: ' + loadData.errors })
            }
          }
        }
      }

      allCommands.forEach((cmd) => { try { commandRegistry.register(cmd) } catch { return } })
      await indexBuilder.build()

      if (mounted) setIsLoading(false)
    }
    boot().catch((error) => {
      console.error(error)
      if (mounted) { setIsLoading(false); setLastResult({ label: 'Boot Error', ok: false, message: error instanceof Error ? error.message : String(error) }) }
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (listeningCommandId) {
        event.preventDefault()
        const combo = comboFromEvent(event)
        if (event.code === 'Escape') { setListeningCommandId(null); return }
        if (event.code === 'Backspace' || event.code === 'Delete') {
          const next = { ...hotkeys }; delete next[listeningCommandId]
          localStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify(next)); setHotkeys(next); setListeningCommandId(null); return
        }
        if (combo && !['Ctrl', 'Alt', 'Shift', 'Meta'].includes(combo)) {
          const next = { ...hotkeys }
          Object.keys(next).forEach((id) => { if (next[id] === combo) delete next[id] })
          next[listeningCommandId] = combo
          localStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify(next)); setHotkeys(next); setListeningCommandId(null)
        }
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
        event.preventDefault(); focusSearch()
      }
      if (event.code === 'Escape') {
        setShowSearchDropdown(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hotkeys, listeningCommandId, searchQuery])

  useEffect(() => {
    let cancelled = false
    function refreshStatus() {
      if (!csBridge.isConnected()) return
      timelineModule.getStatus().then((result) => { if (!cancelled && result.success) setStatus(result.data) }).catch(() => undefined)
    }
    refreshStatus()
    const id = window.setInterval(refreshStatus, 1500)
    return () => { cancelled = true; window.clearInterval(id) }
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
      setRecentCommandIds((prev) => [commandId, ...prev.filter((id) => id !== commandId)].slice(0, 5))
      return
    }

    if (run) {
      run.then((result) => {
        const ms = Date.now() - started
        const payload = result.data as any
        const ok = result.success !== false && !payload?.error
        const affected = payload?.layers ?? payload?.selected ?? payload?.snapped ?? payload?.shifted ?? payload?.applied ?? payload?.filled ?? payload?.converted ?? payload?.created
        const suffix = affected !== undefined ? String(affected) + ' affected' : 'done'
        setLastResult({ label: commandId, ok, message: (ok ? suffix : payload?.error || result.error || result.message || 'failed') + ' - ' + ms + 'ms' })
        timelineModule.getStatus().then((next) => { if (next.success) setStatus(next.data) }).catch(() => undefined)
      }).catch((error) => {
        setLastResult({ label: commandId, ok: false, message: error instanceof Error ? error.message : String(error) })
      })
    } else {
      setLastResult({ label: commandId, ok: false, message: 'Command not found: ' + commandId })
    }

    setRecentCommandIds((prev) => [commandId, ...prev.filter((id) => id !== commandId)].slice(0, 5))
  }, [])

  const handleModuleToggle = useCallback((mod: ModuleName, enabled: boolean) => {
    const action = enabled ? moduleToggle.enable(mod) : moduleToggle.disable(mod)
    action.then(() => setConfig({ ...moduleToggle.config })).catch(console.error)
  }, [])

  const handleQuickAction = useCallback((actionId: string) => {
    const cmd = commandRegistry.get(actionId)
    if (cmd) {
      const started = Date.now()
      cmd.execute().then((result: any) => {
        const ok = result?.success !== false
        setLastResult({ label: actionId, ok, message: (ok ? 'done' : result?.error || 'failed') + ' - ' + (Date.now() - started) + 'ms' })
      }).catch((error: any) => {
        setLastResult({ label: actionId, ok: false, message: error instanceof Error ? error.message : String(error) })
      })
    } else {
      setLastResult({ label: actionId, ok: false, message: 'Quick action not found' })
    }
  }, [])

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if (isHotkeysOpen || listeningCommandId) return
      const combo = comboFromEvent(event)
      const commandId = Object.keys(hotkeys).find((id) => hotkeys[id] === combo)
      if (commandId) { event.preventDefault(); handleCommandExecute(commandId) }
    }
    window.addEventListener('keydown', onShortcut, true)
    return () => window.removeEventListener('keydown', onShortcut, true)
  }, [handleCommandExecute, hotkeys, isHotkeysOpen, listeningCommandId])

  const handleAiSubmit = useCallback(() => {
    const prompt = aiInput.trim()
    if (!prompt) return
    if (!csBridge.isConnected()) { setAiResponse('Start this panel inside After Effects for full command execution.'); return }
    setAiResponse('Thinking...'); setAiSuggestions([])
    aiStudioModule.query(prompt).then((result) => {
      if (!result.success) { setAiResponse(result.message || 'AI request failed'); return }
      const payload = result.data as any
      const routed = payload?.result
      let text = ''
      if (Array.isArray(routed)) {
        text = routed.length === 0 ? 'No matching commands found for "' + prompt + '". Try asking about easing, glow, export, or something else.' : routed.join(', ')
      } else if (typeof routed === 'string') {
        text = !routed ? 'No matching commands found for "' + prompt + '". Try asking about easing, glow, export, or something else.' : routed
      } else { text = JSON.stringify(routed || payload) }

      const found: string[] = []

      text.replace(/\[([\w:-]+)\]/g, (_, id) => { if (commandRegistry.get(id)) found.push(id); return _ })

      const rawIds = text.replace(/\[([\w:-]+)\]/g, '').split(',').map((s: string) => s.trim()).filter(Boolean)
      for (const rawId of rawIds) {
        if (rawId.indexOf(':') > 0 && commandRegistry.get(rawId) && !found.includes(rawId)) {
          found.push(rawId)
        }
      }

      const cleanText = text.replace(/\[([\w:-]+)\]/g, '$1').trim()
      setAiSuggestions(found)
      setAiResponse(cleanText)
    }).catch((error) => { setAiResponse(error instanceof Error ? error.message : 'AI request failed'); setAiSuggestions([]) })
  }, [aiInput])

  const S = {
    root: { background: 'var(--astron-bg-primary)', height: '100vh', overflow: 'hidden', fontFamily: 'var(--astron-font)', color: 'var(--astron-text-primary)', display: 'flex', flexDirection: 'column' } as const,
    header: { padding: '12px 14px', borderBottom: '1px solid var(--astron-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 } as const,
    logo: { fontWeight: 700, fontSize: 14, color: 'var(--astron-text-primary)', letterSpacing: 2, textTransform: 'uppercase' as const } as const,
    version: { fontSize: 9, color: 'var(--astron-text-muted)' } as const,
    scrollArea: { flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' } as const,
    searchWrap: { padding: '10px 12px 4px', position: 'relative' as const },
    searchRow: { background: 'var(--astron-bg-panel)', border: '1px solid var(--astron-border)', borderRadius: 'var(--astron-radius-md)', display: 'flex', alignItems: 'center', padding: '0 10px' } as const,
    searchIcon: { color: 'var(--astron-accent)', fontSize: 13, marginRight: 8 } as const,
    searchInput: { flex: 1, background: 'transparent', border: 'none', color: 'var(--astron-text-primary)', fontSize: 13, padding: '9px 0', outline: 'none', width: '100%' } as const,
    kbd: { marginLeft: 'auto', background: '#0E1428', color: '#4A6A9A', border: '1px solid #1A2238', borderRadius: 3, padding: '1px 5px', fontSize: 9 } as const,
    dropdown: { position: 'absolute' as const, top: '100%', left: 12, right: 12, background: 'var(--astron-bg-secondary)', border: '1px solid var(--astron-border)', borderRadius: 'var(--astron-radius-md)', maxHeight: 280, overflow: 'auto', zIndex: 999, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' },
    resultItem: (selected: boolean) => ({ padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: selected ? '#0E1428' : 'transparent', fontSize: 12, color: selected ? '#D8E4FF' : '#6EA8FF', borderLeft: selected ? '2px solid #0052FF' : '2px solid transparent' } as const),
    resultBadge: { fontSize: 9, color: '#4A6A9A', textTransform: 'uppercase' as const, flexShrink: 0 } as const,
    noResults: { padding: 12, color: '#4A6A9A', fontSize: 11 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '6px 12px' } as const,
    catBtn: (color: string) => ({ padding: '12px 4px', background: '#080C18', border: '1px solid ' + color + '44', borderRadius: 'var(--astron-radius-md)', cursor: 'pointer', textAlign: 'center' as const, transition: 'all 0.2s' } as const),
    catIcon: { fontSize: 22, marginBottom: 3 } as const,
    catLabel: { fontSize: 11, fontWeight: 600, color: '#D8E4FF' } as const,
    catCount: { fontSize: 8, color: '#4A6A9A', marginTop: 2 } as const,
    quickRow: { padding: '4px 12px' } as const,
    statusBar: { margin: '4px 12px', padding: '5px 8px', background: '#080C18', border: '1px solid #1A2238', borderRadius: 6, color: '#6EA8FF', fontSize: 10, display: 'flex', gap: 10, flexWrap: 'wrap' as const } as const,
    resultBar: (ok: boolean) => ({ margin: '4px 12px', padding: '5px 8px', background: ok ? 'rgba(0,229,255,0.08)' : 'rgba(231,76,60,0.12)', border: '1px solid ' + (ok ? 'rgba(0,229,255,0.3)' : 'rgba(231,76,60,0.45)'), borderRadius: 6, color: ok ? '#00E5FF' : 'var(--astron-accent-red)', fontSize: 9 } as const),
    aiWrap: { padding: '6px 12px 4px' } as const,
    aiRow: { display: 'flex', gap: 4 } as const,
    aiInput: { flex: 1, background: '#080C18', border: '1px solid #1A2238', borderRadius: 'var(--astron-radius-md)', color: '#6EA8FF', padding: '8px 10px', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' as const },
    aiBtn: { background: '#0052FF', border: 'none', borderRadius: 'var(--astron-radius-md)', color: '#D8E4FF', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '8px 14px', whiteSpace: 'nowrap' as const },
    aiResp: { marginTop: 4, background: '#080C18', border: '1px solid #1A2238', borderRadius: 'var(--astron-radius-md)', color: '#6EA8FF', fontSize: 11, lineHeight: 1.4, padding: '7px 9px', whiteSpace: 'pre-wrap' as const },
    aiSuggestionChip: (cmdId: string) => ({ padding: '6px 12px', fontSize: 11, background: '#0052FF', color: '#D8E4FF', borderRadius: 'var(--astron-radius-md)', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' }),
    bottomBar: { padding: '8px 12px', display: 'flex', gap: 8, flexShrink: 0, borderTop: '1px solid var(--astron-border)' } as const,
    allCmdBtn: { flex: 1, padding: '10px 12px', background: '#0052FF', border: 'none', borderRadius: 'var(--astron-radius-md)', color: '#D8E4FF', cursor: 'pointer', fontSize: 12, fontWeight: 700, textAlign: 'center' as const, transition: 'all 0.15s' },
    hotkeyBtn: { padding: '10px 14px', background: '#0E1428', border: '1px solid #1A2238', borderRadius: 'var(--astron-radius-md)', color: '#6EA8FF', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' },
    recentWrap: { padding: '4px 12px 6px' } as const,
    recentLabel: { fontSize: 9, color: '#4A6A9A', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 1 } as const,
    recentChip: { padding: '3px 8px', fontSize: 10, color: '#6EA8FF', cursor: 'pointer', borderRadius: 4, background: '#0E1428', display: 'inline-block', border: '1px solid #1A2238' } as const,
  }

  return (
    <div className="astron-root" style={S.root}>
      <div style={S.header}>
        <span style={S.logo}>ASTRON</span>
        <span style={S.version}>{csBridge.isConnected() ? 'Connected' : 'Offline'} · v2.0.1</span>
      </div>

      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: 'var(--astron-accent)', fontSize: 13 }}>⚡ Loading Astron...</div>
        </div>
      ) : (
        <div style={S.scrollArea}>
          {/* Search bar */}
          <div style={S.searchWrap}>
            <div style={S.searchRow}>
              <span style={S.searchIcon}>⌘</span>
              <input ref={searchRef} value={searchQuery} onChange={handleSearchInput} onKeyDown={handleSearchKeyDown} onFocus={() => { if (searchQuery.trim()) setShowSearchDropdown(true) }} placeholder="Search commands, effects, anything..." style={S.searchInput} />
              {(searchQuery.trim() || showSearchDropdown) && <span onClick={() => { setSearchQuery(''); setShowSearchDropdown(false) }} style={{ cursor: 'pointer', color: '#666', fontSize: 12 }}>✕</span>}
              {!searchQuery.trim() && <kbd style={S.kbd}>⌘Space</kbd>}
            </div>
            {showSearchDropdown && searchQuery.trim() && (
              <div style={S.dropdown}>
                {searchResults.length > 0 ? searchResults.map((result, i) => (
                  <div key={result.entry.id} onClick={() => selectSearchResult(result.entry.id)} onMouseEnter={() => setSelectedSearchIndex(i)} style={S.resultItem(i === selectedSearchIndex)}>
                    <span>{result.entry.label}</span>
                    <span style={S.resultBadge}>{result.entry.module ? result.entry.module.replace('_', ' ') : result.entry.type}</span>
                  </div>
                )) : <div style={S.noResults}>No results for &ldquo;{searchQuery}&rdquo;</div>}
              </div>
            )}
          </div>

          {/* Task buttons */}
          <div style={S.grid}>
            {TASK_BUTTONS.map(btn => (
              <div key={btn.id} onClick={() => handleCommandExecute(btn.id)} style={S.catBtn(btn.color)}
                onMouseEnter={e => { e.currentTarget.style.background = '#0E1428'; e.currentTarget.style.borderColor = btn.color }}
                onMouseLeave={e => { e.currentTarget.style.background = '#080C18'; e.currentTarget.style.borderColor = btn.color + '44' }}
              >
                <div style={S.catIcon}>{btn.icon}</div>
                <div style={S.catLabel}>{btn.label}</div>
                <div style={S.catCount}>click to run</div>
              </div>
            ))}
          </div>

          {/* All Commands toggle — BIG button */}
          <div style={{ padding: '4px 12px' }}>
            <div onClick={() => setShowAllCommands(!showAllCommands)}
              style={{ padding: '10px 12px', background: showAllCommands ? '#0052FF' : '#080C18', border: '1px solid ' + (showAllCommands ? '#0052FF' : '#1A2238'), borderRadius: 'var(--astron-radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!showAllCommands) { e.currentTarget.style.background = '#0E1428'; e.currentTarget.style.borderColor = '#0052FF' } }}
              onMouseLeave={e => { if (!showAllCommands) { e.currentTarget.style.background = '#080C18'; e.currentTarget.style.borderColor = '#1A2238' } }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: showAllCommands ? '#D8E4FF' : '#6EA8FF' }}>
                {showAllCommands ? '▾' : '▸'} All Commands ({allCommands.length})
              </span>
              <span style={{ fontSize: 10, color: showAllCommands ? '#D8E4FF' : '#4A6A9A' }}>
                {showAllCommands ? 'Collapse' : 'Expand'}
              </span>
            </div>
          </div>

          {showAllCommands && Object.keys(commandsByModule).sort().map(mod => (
            <div key={mod} style={{ margin: '0 12px 4px' }}>
              <div onClick={() => { const n = { ...expandedModules }; n[mod] = !n[mod]; setExpandedModules(n) }}
                style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 11, color: '#6EA8FF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, background: '#080C18', display: 'flex', justifyContent: 'space-between', border: '1px solid #1A2238' }}>
                <span>{expandedModules[mod] ? '▾' : '▸'} {mod.replace(/^\d+_/, '')}</span>
                <span style={{ color: '#4A6A9A', fontSize: 10 }}>{commandsByModule[mod].length} commands</span>
              </div>
              {expandedModules[mod] && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, padding: '4px 2px' }}>
                  {commandsByModule[mod].map(cmd => (
                    <span key={cmd.id} onClick={() => handleCommandExecute(cmd.id)}
                      style={{ padding: '5px 8px', fontSize: 10, background: '#0E1428', color: '#6EA8FF', borderRadius: 4, cursor: 'pointer', border: '1px solid #1A2238', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#0052FF'; e.currentTarget.style.color = '#D8E4FF'; e.currentTarget.style.borderColor = '#0052FF' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#0E1428'; e.currentTarget.style.color = '#6EA8FF'; e.currentTarget.style.borderColor = '#1A2238' }}
                    >
                      {cmd.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Quick actions */}
          <div style={S.quickRow}>
            <QuickActions onAction={handleQuickAction} favorites={config.favorites} />
          </div>

          {/* Status bar */}
          {status && (
            <div style={S.statusBar}>
              <span style={{ color: 'var(--astron-accent)' }}>{status.compName}</span>
              <span>{status.fps} fps</span>
              <span>{status.layers} layers · {status.selected} selected</span>
              <span>{status.time}</span>
            </div>
          )}
          {lastResult && (
            <div style={S.resultBar(lastResult.ok)}>{lastResult.label}: {lastResult.message}</div>
          )}

          {/* AI section */}
          <div style={S.aiWrap}>
            <div style={S.aiRow}>
              <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()} placeholder="💬 Ask AI to do something..." style={S.aiInput} />
              <button onClick={handleAiSubmit} style={S.aiBtn}>Ask</button>
            </div>
            {aiResponse !== '' && (
              <div>
                <div style={S.aiResp}>{aiResponse}</div>
                {aiSuggestions.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {aiSuggestions.map(id => {
                      const cmd = commandRegistry.get(id)
                      return (
                        <span key={id} onClick={() => { handleCommandExecute(id); setAiSuggestions([]); setAiResponse('') }}
                          style={S.aiSuggestionChip(id)}
                          onMouseEnter={e => { e.currentTarget.style.background = '#0072FF'; e.currentTarget.style.transform = 'scale(1.05)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#0052FF'; e.currentTarget.style.transform = 'scale(1)' }}
                        >
                          ▶ {cmd?.label || id.split(':').pop()}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent commands */}
          {recentCommandIds.length > 0 && (
            <div style={S.recentWrap}>
              <div style={S.recentLabel}>Recent</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {recentCommandIds.map(id => {
                  const cmd = commandRegistry.get(id)
                  return cmd ? <span key={id} onClick={() => handleCommandExecute(id)} style={S.recentChip}>{cmd.label}</span> : null
                })}
              </div>
            </div>
          )}

          {/* Bottom bar: Hotkeys + AI Keys */}
          <div style={S.bottomBar}>
            <span onClick={() => setIsHotkeysOpen(true)}
              style={S.hotkeyBtn}
              onMouseEnter={e => { e.currentTarget.style.background = '#0E1428'; e.currentTarget.style.borderColor = '#0052FF' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0E1428'; e.currentTarget.style.borderColor = '#1A2238' }}
            >
              ⌨ Keyboard Shortcuts
            </span>
            <span onClick={() => { loadKeyInputs(); setShowAiKeys(!showAiKeys) }}
              style={{ ...S.hotkeyBtn, flex: 1, textAlign: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0052FF' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1A2238' }}
            >
              {showAiKeys ? '▾ Hide' : '▸ AI'} Keys
            </span>
          </div>

          {/* AI Keys section */}
          {showAiKeys && (
            <div style={{ padding: '4px 12px 8px' }}>
              <div style={{ fontSize: 9, color: 'var(--astron-text-muted)', marginBottom: 2 }}>GROQ API Keys (one per line)</div>
              <textarea value={groqKeyInput} onChange={(e) => setGroqKeyInput(e.target.value)} rows={2} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--astron-bg-secondary)', border: '1px solid var(--astron-border)', borderRadius: 'var(--astron-radius-md)', color: 'var(--astron-text-secondary)', fontSize: 10, padding: '4px 6px', outline: 'none', resize: 'vertical' }} placeholder="gsk_xxx..." />
              <div style={{ fontSize: 9, color: 'var(--astron-text-muted)', marginTop: 4, marginBottom: 2 }}>Gemini API Keys (one per line)</div>
              <textarea value={geminiKeyInput} onChange={(e) => setGeminiKeyInput(e.target.value)} rows={2} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--astron-bg-secondary)', border: '1px solid var(--astron-border)', borderRadius: 'var(--astron-radius-md)', color: 'var(--astron-text-secondary)', fontSize: 10, padding: '4px 6px', outline: 'none', resize: 'vertical' }} placeholder="AIzaSy..." />
              <button onClick={() => { const g = groqKeyInput.split('\n').map(k => k.trim()).filter(Boolean); const gm = geminiKeyInput.split('\n').map(k => k.trim()).filter(Boolean); if (g.length > 0) localStorage.setItem('astron-groq-keys', g.join('\n')); if (gm.length > 0) localStorage.setItem('astron-gemini-keys', gm.join('\n')); setLastResult({ label: 'AI Keys', ok: true, message: 'Saved ' + g.length + ' GROQ + ' + gm.length + ' Gemini keys' }); setShowAiKeys(false) }} style={{ marginTop: 4, background: 'var(--astron-accent)', border: 'none', borderRadius: 'var(--astron-radius-md)', color: '#000', cursor: 'pointer', fontSize: 9, fontWeight: 700, padding: '3px 8px' }}>Save Keys</button>
            </div>
          )}
        </div>
      )}

      {/* Hotkeys modal */}
      {isHotkeysOpen && (
        <div onClick={() => setIsHotkeysOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 30 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 640, maxWidth: '96vw', maxHeight: '85vh', overflow: 'auto', background: 'var(--astron-bg-secondary)', border: '1px solid var(--astron-border-light)', borderRadius: 8, color: 'var(--astron-text-primary)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--astron-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--astron-bg-secondary)', zIndex: 1 }}>
              <strong style={{ fontSize: 14 }}>Keyboard Shortcuts</strong>
              <button onClick={() => setIsHotkeysOpen(false)} style={{ background: '#0E1428', border: '1px solid #1A2238', borderRadius: 6, color: '#6EA8FF', cursor: 'pointer', fontSize: 12, padding: '5px 12px', fontWeight: 600 }}>Close</button>
            </div>
            {allCommands.map((command) => {
              const combo = hotkeys[command.id] || ''
              const conflict = combo && AE_CONFLICTS.has(combo)
              return (
                <div key={command.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, padding: '9px 16px', borderBottom: '1px solid var(--astron-border)', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: '#D8E4FF' }}>{command.label}</span>
                  {conflict && <span style={{ color: 'var(--astron-accent-yellow)', fontSize: 10 }}>AE conflict</span>}
                  <button onClick={() => setListeningCommandId(command.id)}
                    style={{ minWidth: 130, padding: '6px 12px', background: listeningCommandId === command.id ? '#0052FF' : '#0E1428', border: '1px solid ' + (conflict ? 'var(--astron-accent-yellow)' : (listeningCommandId === command.id ? '#0052FF' : '#1A2238')), borderRadius: 6, color: conflict ? 'var(--astron-accent-yellow)' : (listeningCommandId === command.id ? '#D8E4FF' : '#6EA8FF'), cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}
                  >
                    {listeningCommandId === command.id ? 'Press keys...' : (combo || 'Set shortcut')}
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
