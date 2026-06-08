import React from 'react'

interface ModuleToggleProps {
  label: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  color?: string
}

export default function ModuleToggle({ label, enabled, onChange, color }: ModuleToggleProps) {
  const accent = color || '#FF9A00'

  return (
    <div
      onClick={() => onChange(!enabled)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <span style={{ color: '#CCCCCC', fontSize: 11 }}>{label}</span>
      <span
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          background: enabled ? accent : '#3A3A3A',
          position: 'relative',
          transition: 'background 0.15s ease',
          display: 'inline-block',
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#FFFFFF',
            position: 'absolute',
            top: 2,
            left: enabled ? 16 : 2,
            transition: 'left 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
          }}
        />
      </span>
    </div>
  )
}
