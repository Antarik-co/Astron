// ============================================================
// src/types/index.ts
// Astron — After Effects Power Extension
// WARNING: All exported names are locked contracts.
//          Every downstream file imports by exact name.
//          Do not rename, remove, or restructure exports.
// ============================================================

// ── 1. ModuleName ────────────────────────────────────────────
export type ModuleName =
  | 'motion'
  | 'timeline'
  | 'effects'
  | 'rig'
  | '3d'
  | 'audio'
  | 'color'
  | 'text'
  | 'export'
  | 'organize'
  | 'automate'
  | 'ai_studio';

// ── 2. WorkspaceProfile ──────────────────────────────────────
export type WorkspaceProfile =
  | 'motion_design'
  | 'vfx'
  | 'character_animation'
  | 'social_content'
  | 'minimal';

// ── 3. CommandSource ─────────────────────────────────────────
export type CommandSource =
  | 'astron'
  | 'native_effect'
  | 'third_party'
  | 'script'
  | 'preset'
  | 'ai_action';

// ── 4. CommandParams ─────────────────────────────────────────
export interface CommandParams {
  [key: string]: string | number | boolean | string[];
}

// ── 6. AstronCommandResult ───────────────────────────────────
// Declared before AstronCommand — execute() references this type.
export interface AstronCommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

// ── 5. AstronCommand ─────────────────────────────────────────
export interface AstronCommand {
  /** Unique identifier. Format: "module:category:name" e.g. "motion:ease:overshoot" */
  id: string;
  /** Display label shown in command palette. e.g. "Apply Overshoot Easing" */
  label: string;
  description: string;
  module: ModuleName;
  /** Search keywords — minimum 5 entries per command */
  keywords: string[];
  shortcut?: string;
  params?: CommandParams;
  execute: (params?: CommandParams) => Promise<AstronCommandResult>;
}

// ── 7. IndexEntry ────────────────────────────────────────────
export interface IndexEntry {
  id: string;
  label: string;
  type: 'command' | 'effect' | 'script' | 'preset' | 'ai_action';
  module?: ModuleName;
  source: CommandSource;
  keywords: string[];
  /** Fuse.js relevance score — populated after search, absent in raw index */
  score?: number;
}

// ── 8. SearchResult ──────────────────────────────────────────
export interface SearchResult {
  entry: IndexEntry;
  score: number;
  matches: string[];
}

// ── 9. ModuleConfig ──────────────────────────────────────────
export interface ModuleConfig {
  name: ModuleName;
  displayName: string;
  /** Icon identifier — maps to /src/assets/icons/ */
  icon: string;
  enabled: boolean;
  commands: AstronCommand[];
  version: string;
}

// ── 10. AIConfig ─────────────────────────────────────────────
export interface AIConfig {
  cloudEnabled: boolean;
  dailyLimit: number;
  apiCallCount: number;
  provider: 'groq' | 'gemini' | 'local';
}

// ── 11. AstronConfig ─────────────────────────────────────────
export interface AstronConfig {
  modules: Record<ModuleName, boolean>;
  workspace: WorkspaceProfile;
  ai: AIConfig;
  version: string;
  /** Pinned command IDs shown in Quick Actions bar */
  favorites: string[];
  /** Last-used command IDs — capped at 20, newest first */
  recentCommands: string[];
}

// ── 12. ExtendScriptMessage ──────────────────────────────────
export interface ExtendScriptMessage {
  action: string;
  module: string;
  params: Record<string, unknown>;
}

// ── 13. ExtendScriptResult ───────────────────────────────────
export interface ExtendScriptResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ── 14. DEFAULT_ASTRON_CONFIG ────────────────────────────────
export const DEFAULT_ASTRON_CONFIG: AstronConfig = {
  modules: {
    motion:    true,
    timeline:  true,
    effects:   true,
    rig:       true,
    '3d':      true,
    audio:     true,
    color:     true,
    text:      true,
    export:    true,
    organize:  true,
    automate:  true,
    ai_studio: true,
  },
  workspace: 'motion_design',
  ai: {
    cloudEnabled: true,
    dailyLimit:   200,
    apiCallCount: 0,
    provider:     'groq',
  },
  version:        '1.0.0',
  favorites:      [],
  recentCommands: [],
};

// ── 15. MODULE_DISPLAY_NAMES ─────────────────────────────────
export const MODULE_DISPLAY_NAMES: Record<ModuleName, string> = {
  motion:    'MOTION',
  timeline:  'TIMELINE',
  effects:   'EFFECTS',
  rig:       'RIG',
  '3d':      '3D',
  audio:     'AUDIO',
  color:     'COLOR',
  text:      'TEXT',
  export:    'EXPORT',
  organize:  'ORGANIZE',
  automate:  'AUTOMATE',
  ai_studio: 'AI STUDIO',
};
