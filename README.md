<p align="center">
  <img src="assets/banner.png" alt="Astron Banner" width="100%" />
</p>

<h1 align="center">⚡ Astron</h1>
<h3 align="center">After Effects Power Extension</h3>

<p align="center">
  <strong>85 commands • 12 modules • AI-powered • One keyboard shortcut</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/After_Effects-2022+-9999FF?style=for-the-badge&logo=adobeaftereffects&logoColor=white" alt="AE 2022+" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/AI-GROQ_+_Gemini-FF6B35?style=for-the-badge&logo=openai&logoColor=white" alt="AI Powered" />
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <em>Built by <a href="https://antarik.co">Antarik by JPN STUDIO</a> • Bundle ID: <code>co.antarik.astron</code></em>
</p>

---

## 🎯 What is Astron?

**Astron** is a professional Adobe CEP plugin that transforms After Effects into a command-driven powerhouse. Instead of clicking through menus, just type what you want.

```
/ease overshoot          → Apply overshoot easing to selected layers
/stagger 3               → Stagger layers by 3 frames
/camera orbit            → Create an orbital camera rig
/grade cinematic         → Apply cinematic color grading
"make this text bounce"  → AI understands and suggests commands
```

> **One panel. 85 commands. Zero menu diving.**

---

## 🧩 12 Modules

<table>
  <tr>
    <td align="center" width="25%">
      <h4>🎬 Motion</h4>
      <code>/ease</code> <code>/stagger</code> <code>/bounce</code><br/>
      <code>/wiggle</code> <code>/loop</code>
    </td>
    <td align="center" width="25%">
      <h4>⏱ Timeline</h4>
      <code>/select</code> <code>/shift</code> <code>/snap</code><br/>
      <code>/rename</code> <code>/sort</code>
    </td>
    <td align="center" width="25%">
      <h4>✨ Effects</h4>
      <code>/glow</code> <code>/clear</code> <code>/stack</code><br/>
      <code>/add</code>
    </td>
    <td align="center" width="25%">
      <h4>🦴 Rig</h4>
      <code>/ik</code> <code>/fk</code><br/>
      <code>/rubber-hose</code>
    </td>
  </tr>
  <tr>
    <td align="center">
      <h4>🎥 3D</h4>
      <code>/camera</code> <code>/lights</code><br/>
      <code>/convert</code>
    </td>
    <td align="center">
      <h4>🎵 Audio</h4>
      <code>/beats</code> <code>/sync</code><br/>
      <code>/tempo</code>
    </td>
    <td align="center">
      <h4>🎨 Color</h4>
      <code>/grade</code> <code>/saturate</code> <code>/lut</code><br/>
      <code>/warm</code> <code>/cool</code>
    </td>
    <td align="center">
      <h4>📝 Text</h4>
      <code>/animate</code> <code>/typewriter</code><br/>
      <code>/swap-font</code>
    </td>
  </tr>
  <tr>
    <td align="center">
      <h4>📤 Export</h4>
      <code>/web</code> <code>/lossless</code> <code>/social</code><br/>
      <code>/version</code> <code>/queue</code>
    </td>
    <td align="center">
      <h4>📂 Organize</h4>
      <code>/clean</code> <code>/missing</code><br/>
      <code>/color-code</code> <code>/health</code>
    </td>
    <td align="center">
      <h4>⚙️ Automate</h4>
      <code>/null</code> <code>/anchor</code> <code>/purge</code><br/>
      <code>/precomp</code> <code>/lights-3pt</code>
    </td>
    <td align="center">
      <h4>🤖 AI Studio</h4>
      <code>/ask</code> <code>/suggest</code><br/>
      <code>/health</code> <code>/rename</code>
    </td>
  </tr>
</table>

---

## 🧠 AI Architecture

Astron uses a **3-tier AI cascade** that guarantees a response every time:

```
User Input
    │
    ├─ LocalAI (pattern matching)     →  <50ms   ← always works, offline
    │
    ├─ GROQ (5 keys, Llama 3.3 70B)  →  ~200ms  ← ultra-fast cloud inference
    │
    ├─ Gemini (4 keys, Flash 2.0)     →  ~500ms  ← reliable fallback
    │
    └─ Local fallback                 →  <50ms   ← guaranteed response
```

| Provider | Model | Keys | Role |
|----------|-------|------|------|
| **GROQ** | `llama-3.3-70b-versatile` | 5 (round-robin) | Primary cloud AI |
| **Gemini** | `gemini-2.0-flash` | 4 (round-robin) | Secondary fallback |
| **Local** | Pattern matching | — | Offline, instant |

> 9 API keys with automatic round-robin rotation ensure maximum uptime and rate-limit resilience.

---

## 🚀 Quick Start

### Prerequisites
- Adobe After Effects **2022** or later
- Node.js **18+**
- npm

### Build from Source
```bash
git clone https://github.com/your-org/astron.git
cd astron
npm install
npm run build:prod
```

### Install for Development
```bash
npm run install:dev
```
This does everything automatically:
1. ✅ Enables CEP debug mode (Windows registry)
2. ✅ Creates a junction to AE's extensions folder
3. ✅ Open AE → **Window → Extensions → Astron**

### Create ZXP Package (for Distribution)
```bash
npm run package
```
→ Output: `release/Astron-v1.0.0.zxp`

---

## 📦 Installation (End Users)

### Option 1: ZXP Installer (Recommended)
1. Download [ZXP Installer](https://aescripts.com/learn/zxp-installer/) or [Anastasiy's Extension Manager](https://install.anastasiy.com/)
2. Drag `Astron-v1.0.0.zxp` onto the installer
3. Restart After Effects
4. **Window → Extensions → Astron** ✨

### Option 2: Manual Install
1. Extract contents to:
   ```
   Windows : %APPDATA%\Adobe\CEP\extensions\co.antarik.astron\
   macOS   : ~/Library/Application Support/Adobe/CEP/extensions/co.antarik.astron/
   ```
2. Enable debug mode:
   - **Windows:** Registry → `HKCU\SOFTWARE\Adobe\CSXS.11` → `PlayerDebugMode` = `1`
   - **macOS:** `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`
3. Restart AE → **Window → Extensions → Astron**

---

## 🏗 Architecture

```
astron/
├── CSXS/manifest.xml              # CEP extension manifest
├── .debug                          # CEP debug config (port 8088)
├── .gitignore                      # 🔒 Protects API keys
├── src/
│   ├── config/
│   │   └── api-keys.ts             # 🔒 9 API keys (gitignored)
│   ├── types/index.ts              # Core type definitions (locked)
│   ├── core/
│   │   ├── CommandPalette/         # Registry, Parser, FuzzySearch, IndexBuilder
│   │   ├── ModuleManager/          # Registry, Loader, Toggle, Workspaces
│   │   └── AIOrchestrator/         # LocalAI, CloudAI (GROQ), GeminiAI, Router
│   ├── bridge/
│   │   ├── CSInterface/index.ts    # TypeScript → ExtendScript bridge
│   │   └── extendscript/           # AE scripting engine (ES3 .jsx)
│   ├── modules/                    # 12 feature modules (01–12)
│   │   ├── 01_motion/              # Motion.module.ts + motion.commands.ts + .jsx
│   │   ├── 02_timeline/
│   │   └── ... (12 modules)
│   ├── ui/                         # React components
│   └── lib/CSInterface.js          # Adobe CEP bridge library
├── scripts/
│   ├── install-dev.js              # One-click dev installer
│   └── package-zxp.js              # ZXP/ZIP packager
├── dist/                           # Built extension (236 KB prod)
└── release/                        # Packaged .zxp/.zip
```

---

## 📋 NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Development build (with sourcemaps) |
| `npm run build:prod` | Production build (minified, 236 KB) |
| `npm run dev` | Watch mode for live development |
| `npm run typecheck` | TypeScript type checking |
| `npm run install:dev` | Install to AE + enable debug mode |
| `npm run package` | Create ZXP/ZIP for distribution |

---

## 🔐 Security

API keys are stored in `src/config/api-keys.ts` which is **excluded from git** via `.gitignore`. Never commit this file.

If cloning fresh, create your own `src/config/api-keys.ts`:
```typescript
export const GROQ_KEYS: string[] = [
  'your-groq-key-1',
  'your-groq-key-2',
  // ... up to 5 keys
];

export const GEMINI_KEYS: string[] = [
  'your-gemini-key-1',
  // ... up to 4 keys
];
```

---

## 🎯 Creating a ZXP Package (Step-by-Step)

### Step 1: Get ZXPSignCmd
Download Adobe's signing tool:
- **Windows:** [ZXPSignCmd.exe](https://github.com/nicamedrano/nicamedrano.github.io/blob/master/bin/ZXPSignCmd.exe)
- Or search "ZXPSignCmd download" — several mirrors available

### Step 2: Place It
```
astron/
└── tools/
    └── ZXPSignCmd.exe     ← place here
```

### Step 3: Build + Package
```bash
npm run build:prod         # Creates minified dist/
npm run package            # Signs + creates ZXP
```

### Step 4: Get Your Package
```
astron/
└── release/
    └── Astron-v1.0.0.zxp  ← ready to sell!
```

### Step 5: Distribute
| Platform | How |
|----------|-----|
| **Gumroad** | Upload `.zxp` + tell buyers to use ZXP Installer |
| **aescripts.com** | Submit to their marketplace |
| **Direct** | Email the `.zxp` file |
| **Your website** | Download link + installation instructions |

> **Pro tip:** For marketplace distribution, consider purchasing a code-signing certificate from a Certificate Authority for added trust.

---

## 🤝 Credits

**Astron** is developed by **[Antarik by JPN STUDIO](https://antarik.co)**

- Architecture designed using AI-assisted development
- 9 API keys powering real-time AI features
- 85 commands across 12 professional modules

---

<p align="center">
  <strong>© 2026 Antarik by JPN STUDIO. All rights reserved.</strong><br/>
  <a href="https://antarik.co">antarik.co</a>
</p>
