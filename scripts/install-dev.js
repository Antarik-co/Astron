/**
 * install-dev.js
 * Astron AE Plugin — Development Installer
 *
 * This script:
 * 1. Enables CEP debug mode in the Windows registry
 * 2. Creates a junction (symlink) from the AE extensions directory
 *    to this project's dist/ folder, enabling live-reload development.
 *
 * Usage: npm run install:dev
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const EXTENSION_ID = 'co.antarik.astron';
const CSXS_VERSION = '11';

// ── Paths ──────────────────────────────────────────────────────
const distPath = path.resolve(__dirname, '..', 'dist');
const roamingPath = process.env.APPDATA;
const extensionsDir = path.join(roamingPath, 'Adobe', 'CEP', 'extensions');
const targetPath = path.join(extensionsDir, EXTENSION_ID);

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║        ASTRON — Development Installer        ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

// ── Step 1: Verify dist/ exists ────────────────────────────────
if (!fs.existsSync(distPath)) {
  console.error('❌ dist/ folder not found. Run "npm run build" first.');
  process.exit(1);
}

if (!fs.existsSync(path.join(distPath, 'index.html'))) {
  console.error('❌ dist/index.html not found. Run "npm run build" first.');
  process.exit(1);
}

console.log('✅ dist/ folder verified');

// ── Step 2: Enable CEP Debug Mode ─────────────────────────────
console.log('');
console.log('→ Enabling CEP debug mode...');

try {
  // Try multiple CSXS versions (9, 10, 11) for compatibility
  for (const ver of ['9', '10', '11']) {
    const regPath = `HKCU\\SOFTWARE\\Adobe\\CSXS.${ver}`;
    try {
      execSync(
        `reg add "${regPath}" /v PlayerDebugMode /t REG_SZ /d 1 /f`,
        { stdio: 'pipe' }
      );
      console.log(`  ✅ CSXS.${ver} debug mode enabled`);
    } catch (e) {
      // Ignore — older versions may not be relevant
    }
  }
} catch (e) {
  console.warn('⚠️  Could not set registry. Run as Administrator if needed.');
  console.warn('   Manual: Set HKCU\\SOFTWARE\\Adobe\\CSXS.11\\PlayerDebugMode = 1');
}

// ── Step 3: Create extensions directory ────────────────────────
console.log('');
console.log('→ Setting up extension directory...');

if (!fs.existsSync(extensionsDir)) {
  fs.mkdirSync(extensionsDir, { recursive: true });
  console.log(`  Created: ${extensionsDir}`);
}

// ── Step 4: Create junction / symlink ──────────────────────────
if (fs.existsSync(targetPath)) {
  const stats = fs.lstatSync(targetPath);
  if (stats.isSymbolicLink() || stats.isDirectory()) {
    console.log(`  Removing existing: ${targetPath}`);
    try {
      // Remove junction/symlink
      if (stats.isSymbolicLink()) {
        fs.unlinkSync(targetPath);
      } else {
        fs.rmSync(targetPath, { recursive: true });
      }
    } catch (e) {
      console.error(`  ❌ Could not remove existing directory. Delete manually:`);
      console.error(`     ${targetPath}`);
      process.exit(1);
    }
  }
}

try {
  // Create a directory junction (works without admin on Windows)
  execSync(`mklink /J "${targetPath}" "${distPath}"`, { stdio: 'pipe', shell: true });
  console.log(`  ✅ Junction created:`);
  console.log(`     ${targetPath}`);
  console.log(`     → ${distPath}`);
} catch (e) {
  // Fallback: copy the files
  console.log('  ⚠️  Junction failed, copying files instead...');
  copyDir(distPath, targetPath);
  console.log(`  ✅ Files copied to: ${targetPath}`);
}

// ── Done ───────────────────────────────────────────────────────
console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║           ✅ Installation Complete            ║');
console.log('╠══════════════════════════════════════════════╣');
console.log('║                                              ║');
console.log('║  1. Open After Effects                       ║');
console.log('║  2. Go to: Window → Extensions → Astron      ║');
console.log('║  3. The Astron panel should appear!           ║');
console.log('║                                              ║');
console.log('║  If not visible, restart After Effects.       ║');
console.log('║                                              ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

// ── Helpers ────────────────────────────────────────────────────
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
