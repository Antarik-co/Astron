import React from 'react'

interface QuickAction {
  id: string
  icon: string
  label: string
}

interface QuickActionsProps {
  onAction: (actionId: string) => void
  favorites?: string[]
}

const DEFAULT_ACTIONS: QuickAction[] = [
  { id: 'automate:null', icon: '⊕', label: 'Null' },
  { id: 'automate:camera', icon: '◉', label: 'Camera' },
  { id: 'automate:anchor', icon: '⊙', label: 'Anchor' },
  { id: 'automate:purge', icon: '⌫', label: 'Purge' },
  { id: 'automate:precomp', icon: '▣', label: 'Precomp' },
]

export default function QuickActions({ onAction, favorites }: QuickActionsProps) {
  const actions = DEFAULT_ACTIONS

  return (
    <div style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
        QUICK ACTIONS
      </div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            onMouseEnter={(event) => { event.currentTarget.style.borderColor = '#FF9A00' }}
            onMouseLeave={(event) => { event.currentTarget.style.borderColor = '#333333' }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: favorites?.includes(action.id) ? '#2A2A2A' : '#252525',
              color: '#CCCCCC',
              border: '1px solid #333333',
              borderRadius: 999,
              padding: '5px 9px',
              cursor: 'pointer',
              fontSize: 11,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: '#FF9A00', fontWeight: 700 }}>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
