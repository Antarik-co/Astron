const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname);
const CDP_PORT = 8088;

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    }).on('error', reject);
  });
}

function cdpSend(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const timeout = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 15000);
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

(async () => {
  console.log('=== ASTRON v2.0.1 — FULL COMMAND EXECUTION TEST ===\n');

  const targets = await httpGet(`http://localhost:${CDP_PORT}/json`);
  const panelTarget = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(panelTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.on('open', resolve); ws.on('error', reject); });
  await cdpSend(ws, 'DOM.enable');
  await cdpSend(ws, 'Runtime.enable');
  await cdpSend(ws, 'Page.enable');

  async function evalJS(expression) {
    const result = await cdpSend(ws, 'Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true,
    });
    return result.result?.value;
  }

  async function screenshot(filename) {
    const result = await cdpSend(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(RESULTS_DIR, filename), Buffer.from(result.data, 'base64'));
  }

  // ── STEP 1: Get all registered commands from the registry ──
  console.log('Step 1: Reading command registry...');
  const commandIds = await evalJS(`
    (() => {
      // All commands are registered on window via the allCommands array in App.tsx
      // We can access them through the React devtools or by scanning the DOM
      // But the most reliable way is to check what's in the commandRegistry
      // Since commandRegistry is a module-level singleton, we need to access it via the bundle
      // Let's try to find it
      return 'check-needed';
    })()
  `);

  // Let's directly test each known command by clicking its button or executing via the registry
  // First, let's get all command IDs from the UI
  const allCommandIds = await evalJS(`
    (() => {
      // The allCommands array is module-scoped in App.tsx, not globally accessible
      // But we can extract them from the DOM by looking at the hotkeys modal
      // which lists all commands
      return null;
    })()
  `);

  // Known command IDs from the codebase
  const ALL_COMMANDS = [
    // Motion (13)
    'motion:ease:overshoot', 'motion:ease:elastic', 'motion:ease:bounce',
    'motion:ease:ease-in', 'motion:ease:ease-out', 'motion:ease:linear',
    'motion:stagger:default', 'motion:bounce', 'motion:wiggle',
    'motion:loop:cycle', 'motion:loop:pingpong', 'motion:copy-ease', 'motion:paste-ease',
    // Timeline (33)
    'timeline:select:after', 'timeline:select:before', 'timeline:select:crossing',
    'timeline:select:starting-after', 'timeline:select:adj', 'timeline:select:null',
    'timeline:select:shape', 'timeline:select:precomp', 'timeline:select:video',
    'timeline:select:audio', 'timeline:select:shy', 'timeline:select:guide',
    'timeline:select:psd', 'timeline:select:ai', 'timeline:select:label',
    'timeline:invert', 'timeline:shift:+1', 'timeline:shift:-1',
    'timeline:shift:+5', 'timeline:shift:-5', 'timeline:shift:+10', 'timeline:shift:-10',
    'timeline:snap:closest', 'timeline:snap:earliest-start', 'timeline:snap:latest-start',
    'timeline:snap:earliest-end', 'timeline:snap:latest-end',
    'timeline:snap:closest:ripple', 'timeline:snap:earliest-start:ripple',
    'timeline:snap:closest:no-gaps', 'timeline:snap:prev-layer',
    'timeline:fill-gaps', 'timeline:status', 'timeline:rename', 'timeline:sort',
    // Effects (7)
    'effects:glow:soft', 'effects:glow:medium', 'effects:glow:hard',
    'effects:clear', 'effects:stack:save', 'effects:stack:apply', 'effects:add',
    // Rig (3)
    'rig:ik', 'rig:fk', 'rig:rubber-hose',
    // 3D (13)
    '3d:camera:push-in', '3d:camera:pull-out', '3d:camera:orbit',
    '3d:camera:ken-burns', '3d:camera:truck-left', '3d:camera:truck-right',
    '3d:camera:crane-up', '3d:camera:crane-down',
    '3d:lights:studio', '3d:lights:dramatic', '3d:lights:back', '3d:lights:3pt',
    '3d:convert',
    // Audio (3)
    'audio:beats', 'audio:sync', 'audio:tempo',
    // Color (9)
    'color:grade:cinematic', 'color:grade:film', 'color:grade:moody',
    'color:grade:social-pop', 'color:grade:teal-orange',
    'color:saturate', 'color:warm', 'color:cool', 'color:lut',
    // Text (7)
    'text:animate:fade-up', 'text:animate:slide-left', 'text:animate:scale-in',
    'text:animate:typewriter', 'text:animate:word-by-word',
    'text:swap-font', 'text:animate:typewriter-speed',
    // Export (5)
    'export:web', 'export:lossless', 'export:social', 'export:version', 'export:queue',
    // Organize (4)
    'organize:clean', 'organize:missing', 'organize:color-code', 'organize:health',
    // Automate (6)
    'automate:null', 'automate:camera', 'automate:lights-3pt',
    'automate:anchor', 'automate:purge', 'automate:precomp',
    // AI Studio (4)
    'ai:ask', 'ai:suggest', 'ai:health', 'ai:rename',
  ];

  console.log(`Total commands to test: ${ALL_COMMANDS.length}\n`);

  // ── STEP 2: First check if there's an active comp ──
  console.log('Step 2: Checking AE state...');
  const aeState = await evalJS(`
    (() => {
      const text = document.body.innerText;
      return {
        connected: text.includes('Connected'),
        hasStatus: text.includes('fps'),
        statusText: text.substring(text.indexOf('fps') - 30, text.indexOf('fps') + 10)
      };
    })()
  `);
  console.log(`  Connected: ${aeState.connected}`);
  console.log(`  Has status: ${aeState.hasStatus}`);
  if (aeState.hasStatus) console.log(`  Status: ${aeState.statusText.trim()}`);

  // ── STEP 3: Test each command ──
  console.log('\nStep 3: Testing commands...\n');

  const results = { pass: [], fail: [], skip: [] };

  for (const cmdId of ALL_COMMANDS) {
    // Execute the command via the command registry
    const result = await evalJS(`
      (async () => {
        try {
          // Access the React app's internal state through the DOM
          // The commandRegistry is a module singleton - we need to trigger execution
          // through the UI click handler or directExtendScript call

          // Method: Dispatch a custom event that App.tsx listens to
          // Or: Find the command in the DOM and click it

          // Most reliable: Use the fact that all commands are registered
          // and we can trigger them via the handleCommandExecute callback
          // which is bound to the window through React's event system

          // Actually, let's use the simplest approach: call Astron.handle directly
          // through the CSInterface bridge that's already loaded in the panel

          if (typeof window.__CSInterface === 'undefined' && typeof CSInterface !== 'undefined') {
            window.__CSInterface = new CSInterface();
          }

          if (!window.__CSInterface) {
            return { ok: false, error: 'No CSInterface available (dev mode)' };
          }

          // Map command IDs to their ExtendScript messages
          const cmdMap = {
            'motion:ease:overshoot': { module: 'motion', action: 'applyEasing', params: { preset: 'overshoot' } },
            'motion:ease:elastic': { module: 'motion', action: 'applyEasing', params: { preset: 'elastic' } },
            'motion:ease:bounce': { module: 'motion', action: 'applyEasing', params: { preset: 'bounce' } },
            'motion:ease:ease-in': { module: 'motion', action: 'applyEasing', params: { preset: 'ease-in' } },
            'motion:ease:ease-out': { module: 'motion', action: 'applyEasing', params: { preset: 'ease-out' } },
            'motion:ease:linear': { module: 'motion', action: 'applyEasing', params: { preset: 'linear' } },
            'motion:stagger:default': { module: 'motion', action: 'applyStagger', params: { delayMs: 100, direction: 'right' } },
            'motion:bounce': { module: 'motion', action: 'applyBounce', params: { height: 50, decay: 0.7, elasticity: 1.2 } },
            'motion:wiggle': { module: 'motion', action: 'applyWiggle', params: { frequency: 2, amplitude: 20 } },
            'motion:loop:cycle': { module: 'motion', action: 'applyLoop', params: { type: 'cycle' } },
            'motion:loop:pingpong': { module: 'motion', action: 'applyLoop', params: { type: 'pingpong' } },
            'motion:copy-ease': { module: 'motion', action: 'copyEasing', params: {} },
            'motion:paste-ease': { module: 'motion', action: 'pasteEasing', params: {} },

            'timeline:select:after': { module: 'timeline', action: 'selectAfterCursor', params: {} },
            'timeline:select:before': { module: 'timeline', action: 'selectBeforeCursor', params: {} },
            'timeline:select:crossing': { module: 'timeline', action: 'selectCrossing', params: {} },
            'timeline:select:starting-after': { module: 'timeline', action: 'selectStartingAfterCursor', params: {} },
            'timeline:select:adj': { module: 'timeline', action: 'selectByType', params: { layerType: 'adj' } },
            'timeline:select:null': { module: 'timeline', action: 'selectByType', params: { layerType: 'null' } },
            'timeline:select:shape': { module: 'timeline', action: 'selectByType', params: { layerType: 'shape' } },
            'timeline:select:precomp': { module: 'timeline', action: 'selectByType', params: { layerType: 'precomp' } },
            'timeline:select:video': { module: 'timeline', action: 'selectByType', params: { layerType: 'video' } },
            'timeline:select:audio': { module: 'timeline', action: 'selectByType', params: { layerType: 'audio' } },
            'timeline:select:shy': { module: 'timeline', action: 'selectByType', params: { layerType: 'shy' } },
            'timeline:select:guide': { module: 'timeline', action: 'selectByType', params: { layerType: 'guide' } },
            'timeline:select:psd': { module: 'timeline', action: 'selectByType', params: { layerType: 'psd' } },
            'timeline:select:ai': { module: 'timeline', action: 'selectByType', params: { layerType: 'ai' } },
            'timeline:select:label': { module: 'timeline', action: 'selectByLabelColor', params: { labelIndices: [] } },
            'timeline:invert': { module: 'timeline', action: 'invertSelection', params: {} },
            'timeline:shift:+1': { module: 'timeline', action: 'shiftFrames', params: { frames: 1 } },
            'timeline:shift:-1': { module: 'timeline', action: 'shiftFrames', params: { frames: -1 } },
            'timeline:shift:+5': { module: 'timeline', action: 'shiftFrames', params: { frames: 5 } },
            'timeline:shift:-5': { module: 'timeline', action: 'shiftFrames', params: { frames: -5 } },
            'timeline:shift:+10': { module: 'timeline', action: 'shiftFrames', params: { frames: 10 } },
            'timeline:shift:-10': { module: 'timeline', action: 'shiftFrames', params: { frames: -10 } },
            'timeline:snap:closest': { module: 'timeline', action: 'snapToCurrentTime', params: { mode: 'closest' } },
            'timeline:snap:earliest-start': { module: 'timeline', action: 'snapToCurrentTime', params: { mode: 'earliest-start' } },
            'timeline:snap:latest-start': { module: 'timeline', action: 'snapToCurrentTime', params: { mode: 'latest-start' } },
            'timeline:snap:earliest-end': { module: 'timeline', action: 'snapToCurrentTime', params: { mode: 'earliest-end' } },
            'timeline:snap:latest-end': { module: 'timeline', action: 'snapToCurrentTime', params: { mode: 'latest-end' } },
            'timeline:snap:closest:ripple': { module: 'timeline', action: 'snapToCurrentTime', params: { mode: 'closest', ripple: true, preserveGaps: true } },
            'timeline:snap:earliest-start:ripple': { module: 'timeline', action: 'snapToCurrentTime', params: { mode: 'earliest-start', ripple: true, preserveGaps: true } },
            'timeline:snap:closest:no-gaps': { module: 'timeline', action: 'snapToCurrentTime', params: { mode: 'closest', ripple: false, preserveGaps: false } },
            'timeline:snap:prev-layer': { module: 'timeline', action: 'snapToPrevLayer', params: {} },
            'timeline:fill-gaps': { module: 'timeline', action: 'fillGaps', params: {} },
            'timeline:status': { module: 'timeline', action: 'getStatus', params: {} },
            'timeline:rename': { module: 'timeline', action: 'bulkRename', params: { pattern: 'Layer_##' } },
            'timeline:sort': { module: 'timeline', action: 'sortTimeline', params: { by: 'name' } },

            'effects:glow:soft': { module: 'effects', action: 'applyGlow', params: { quality: 'soft' } },
            'effects:glow:medium': { module: 'effects', action: 'applyGlow', params: { quality: 'medium' } },
            'effects:glow:hard': { module: 'effects', action: 'applyGlow', params: { quality: 'hard' } },
            'effects:clear': { module: 'effects', action: 'clearEffects', params: {} },
            'effects:stack:save': { module: 'effects', action: 'saveStack', params: { name: 'TestStack' } },
            'effects:stack:apply': { module: 'effects', action: 'applyStack', params: { stackName: 'TestStack' } },
            'effects:add': { module: 'effects', action: 'addEffect', params: { effectName: 'ADBE Gaussian Blur 2' } },

            'rig:ik': { module: 'rig', action: 'buildIK', params: {} },
            'rig:fk': { module: 'rig', action: 'buildFK', params: {} },
            'rig:rubber-hose': { module: 'rig', action: 'addRubberHose', params: {} },

            '3d:camera:push-in': { module: '3d', action: 'addCamera', params: { movement: 'push-in' } },
            '3d:camera:pull-out': { module: '3d', action: 'addCamera', params: { movement: 'pull-out' } },
            '3d:camera:orbit': { module: '3d', action: 'addCamera', params: { movement: 'orbit' } },
            '3d:camera:ken-burns': { module: '3d', action: 'addCamera', params: { movement: 'ken-burns' } },
            '3d:camera:truck-left': { module: '3d', action: 'addCamera', params: { movement: 'truck-left' } },
            '3d:camera:truck-right': { module: '3d', action: 'addCamera', params: { movement: 'truck-right' } },
            '3d:camera:crane-up': { module: '3d', action: 'addCamera', params: { movement: 'crane-up' } },
            '3d:camera:crane-down': { module: '3d', action: 'addCamera', params: { movement: 'crane-down' } },
            '3d:lights:studio': { module: '3d', action: 'add3DLights', params: { type: 'studio' } },
            '3d:lights:dramatic': { module: '3d', action: 'add3DLights', params: { type: 'dramatic' } },
            '3d:lights:back': { module: '3d', action: 'add3DLights', params: { type: 'back' } },
            '3d:lights:3pt': { module: '3d', action: 'add3DLights', params: { type: '3pt' } },
            '3d:convert': { module: '3d', action: 'convert2Dto3D', params: {} },

            'audio:beats': { module: 'audio', action: 'detectBeats', params: { bpm: 120 } },
            'audio:sync': { module: 'audio', action: 'syncLayerToMarkers', params: {} },
            'audio:tempo': { module: 'audio', action: 'setTempo', params: { bpm: 120 } },

            'color:grade:cinematic': { module: 'color', action: 'applyGrade', params: { preset: 'cinematic' } },
            'color:grade:film': { module: 'color', action: 'applyGrade', params: { preset: 'film' } },
            'color:grade:moody': { module: 'color', action: 'applyGrade', params: { preset: 'moody' } },
            'color:grade:social-pop': { module: 'color', action: 'applyGrade', params: { preset: 'social-pop' } },
            'color:grade:teal-orange': { module: 'color', action: 'applyGrade', params: { preset: 'teal-orange' } },
            'color:saturate': { module: 'color', action: 'quickSaturate', params: { amount: 30 } },
            'color:warm': { module: 'color', action: 'adjustTemperature', params: { direction: 'warm', amount: 50 } },
            'color:cool': { module: 'color', action: 'adjustTemperature', params: { direction: 'cool', amount: 50 } },
            'color:lut': { module: 'color', action: 'applyLUT', params: { lutName: '' } },

            'text:animate:fade-up': { module: 'text', action: 'applyTextAnimation', params: { animation: 'fade-up' } },
            'text:animate:slide-left': { module: 'text', action: 'applyTextAnimation', params: { animation: 'slide-left' } },
            'text:animate:scale-in': { module: 'text', action: 'applyTextAnimation', params: { animation: 'scale-in' } },
            'text:animate:typewriter': { module: 'text', action: 'applyTextAnimation', params: { animation: 'typewriter' } },
            'text:animate:word-by-word': { module: 'text', action: 'applyTextAnimation', params: { animation: 'word-by-word' } },
            'text:swap-font': { module: 'text', action: 'swapFont', params: { oldFont: '', newFont: '' } },
            'text:animate:typewriter-speed': { module: 'text', action: 'applyTypewriter', params: { speed: 10 } },

            'export:web': { module: 'export', action: 'quickExport', params: { format: 'web' } },
            'export:lossless': { module: 'export', action: 'quickExport', params: { format: 'lossless' } },
            'export:social': { module: 'export', action: 'quickExport', params: { format: 'web' } },
            'export:version': { module: 'export', action: 'saveVersionSnapshot', params: {} },
            'export:queue': { module: 'export', action: 'addToRenderQueue', params: {} },

            'organize:clean': { module: 'organize', action: 'cleanUnused', params: {} },
            'organize:missing': { module: 'organize', action: 'findMissing', params: {} },
            'organize:color-code': { module: 'organize', action: 'applyColorCodes', params: {} },
            'organize:health': { module: 'organize', action: 'healthCheck', params: {} },

            'automate:null': { module: 'automate', action: 'createNull', params: {} },
            'automate:camera': { module: 'automate', action: 'createCamera', params: {} },
            'automate:lights-3pt': { module: 'automate', action: 'create3PointLight', params: {} },
            'automate:anchor': { module: 'automate', action: 'centerAnchorPoint', params: {} },
            'automate:purge': { module: 'automate', action: 'purgeMemory', params: {} },
            'automate:precomp': { module: 'automate', action: 'precompSelected', params: { name: 'Astron Precomp' } },

            'ai:ask': null,
            'ai:suggest': null,
            'ai:health': null,
            'ai:rename': { module: 'ai_studio', action: 'smartRename', params: {} },
          };

          const msg = cmdMap['${cmdId}'];
          if (!msg) return { ok: false, error: 'No ExtendScript mapping', skip: true };

          const payload = JSON.stringify(msg);
          const script = 'Astron.handle(' + payload + ')';

          return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve({ ok: false, error: 'ExtendScript timeout' }), 10000);
            window.__CSInterface.evalScript(script, (result) => {
              clearTimeout(timeout);
              try {
                const parsed = typeof result === 'string' ? JSON.parse(result) : result;
                if (parsed.success) {
                  resolve({ ok: true, data: parsed.data });
                } else {
                  resolve({ ok: false, error: parsed.error || 'Unknown error' });
                }
              } catch (e) {
                resolve({ ok: false, error: 'Parse error: ' + result });
              }
            });
          });
        } catch (e) {
          return { ok: false, error: e.message };
        }
      })()
    `);

    const status = result?.skip ? 'SKIP' : (result?.ok ? 'PASS' : 'FAIL');
    const detail = result?.ok ? JSON.stringify(result.data).substring(0, 80) : (result?.error || 'unknown');

    if (result?.skip) results.skip.push(cmdId);
    else if (result?.ok) results.pass.push(cmdId);
    else results.fail.push(cmdId);

    console.log(`  [${status}] ${cmdId} → ${detail}`);
  }

  // ── SUMMARY ──
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║         COMMAND EXECUTION SUMMARY                ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  PASS: ${results.pass.length}/${ALL_COMMANDS.length}`);
  console.log(`║  FAIL: ${results.fail.length}/${ALL_COMMANDS.length}`);
  console.log(`║  SKIP: ${results.skip.length}/${ALL_COMMANDS.length}`);
  console.log('╠══════════════════════════════════════════════════╣');

  if (results.fail.length > 0) {
    console.log('║  FAILED COMMANDS:');
    results.fail.forEach(id => console.log(`║    - ${id}`));
  }
  if (results.skip.length > 0) {
    console.log('║  SKIPPED (no ExtendScript mapping):');
    results.skip.forEach(id => console.log(`║    - ${id}`));
  }
  console.log('╚══════════════════════════════════════════════════╝');

  // Save results to file
  fs.writeFileSync(
    path.join(RESULTS_DIR, 'command-test-results.json'),
    JSON.stringify(results, null, 2)
  );

  ws.close();
  process.exit(0);
})().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
