import React, { useMemo, useState } from 'react'
import { ModuleName } from '../../../types/index'

interface Preset {
  id: string
  name: string
  module: ModuleName
  tags: string[]
}

interface PresetGridProps {
  presets: Preset[]
  onApply: (presetId: string) => void
  filter?: string
}

const moduleColors: Record<ModuleName, string> = {
  motion: '#FF9A00',
  timeline: '#4A9EFF',
  effects: '#9B59B6',
  rig: '#C0392B',
  '3d': '#1ABC9C',
  audio: '#2ECC71',
  color: '#E74C3C',
  text: '#F39C12',
  export: '#3498DB',
  organize: '#7F8C8D',
  automate: '#8E44AD',
  ai_studio: '#6C3483',
}

export default function PresetGrid({ presets, onApply, filter }: PresetGridProps) {
  const [filterQuery, setFilterQuery] = useState(filter || '')

  const visiblePresets = useMemo(() => {
    const query = (filter || filterQuery).toLowerCase().trim()
    if (!query) {
      return presets
    }
    return presets.filter((preset) => {
      return preset.name.toLowerCase().includes(query) ||
        preset.tags.some((tag) => tag.toLowerCase().includes(query))
    })
  }, [presets, filter, filterQuery])

  return (
    <div style={{ padding: 12, background: '#1C1C1C', color: '#F0F0F0' }}>
      <input
        value={filterQuery}
        onChange={(event) => setFilterQuery(event.target.value)}
        placeholder="Filter presets..."
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: '#252525',
          border: '1px solid #3A3A3A',
          borderRadius: 6,
          color: '#F0F0F0',
          padding: '8px 10px',
          outline: 'none',
          fontSize: 12,
          marginBottom: 10,
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {visiblePresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onApply(preset.id)}
            onMouseEnter={(event) => { event.currentTarget.style.borderColor = '#FF9A00' }}
            onMouseLeave={(event) => { event.currentTarget.style.borderColor = '#333333' }}
            style={{
              background: '#252525',
              border: '1px solid #333333',
              borderRadius: 6,
              padding: 10,
              cursor: 'pointer',
              textAlign: 'left',
              color: '#F0F0F0',
              minHeight: 74,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: 12 }}>{preset.name}</span>
              <span
                style={{
                  background: moduleColors[preset.module],
                  color: preset.module === 'motion' || preset.module === 'audio' || preset.module === '3d' || preset.module === 'text' ? '#000000' : '#FFFFFF',
                  fontSize: 9,
                  fontWeight: 700,
                  borderRadius: 3,
                  padding: '2px 5px',
                  whiteSpace: 'nowrap',
                }}
              >
                {preset.module.toUpperCase()}
              </span>
            </div>
            <div style={{ color: '#777777', fontSize: 10, marginTop: 8, lineHeight: 1.4 }}>
              {preset.tags.join(', ')}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
