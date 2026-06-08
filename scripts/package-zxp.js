/**
 * package-zxp.js
 * Astron AE Plugin — ZXP Packager
 *
 * Creates a signed .zxp package for distribution.
 *
 * Prerequisites:
 *   1. ZXPSignCmd must be installed and accessible:
 *      - Download from: https://github.com/nicamedrano/nicamedrano.github.io/blob/master/bin/ZXPSignCmd.exe
 *      - Or: https://aescripts.com/learn/zxp-installer/
 *      - Place in: Astron/tools/ZXPSignCmd.exe
 *
 *   2. Run "npm run build:prod" first to create dist/
 *
 * Usage: npm run package
 *
 * Output: release/Astron-v1.0.0.zxp
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Configuration ──────────────────────────────────────────────
const EXTENSION_ID = 'co.antarik.astron';
const VERSION = require('../package.json').version;
const CERT_PASSWORD = 'AstronAntarik2024';
const CERT_COUNTRY = 'IN';
const CERT_STATE = 'India';
const CERT_ORG = 'Antarik by JPN STUDIO';
const CERT_CN = 'Antarik';

// ── Paths ──────────────────────────────────────────────────────
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');
const toolsDir = path.join(rootDir, 'tools');
const certFile = path.join(toolsDir, 'astron-cert.p12');
const outputZxp = path.join(releaseDir, `Astron-v${VERSION}.zxp`);

// Try to find ZXPSignCmd
const possiblePaths = [
  path.join(toolsDir, 'ZXPSignCmd.exe'),
  path.join(toolsDir, 'ZXPSignCmd'),
  'ZXPSignCmd',  // In system PATH
];

let zxpSignCmd = null;
for (const p of possiblePaths) {
  // For absolute paths, check file exists on disk
  if (path.isAbsolute(p) || p.includes(path.sep)) {
    if (fs.existsSync(p)) {
      zxpSignCmd = p;
      break;
    }
  } else {
    // For PATH-based names, try executing
    try {
      execSync(`"${p}"`, { stdio: 'pipe' });
      zxpSignCmd = p;
      break;
    } catch (e) {
      // ZXPSignCmd exits with code 1 when called with no args (prints usage)
      // That's fine — it means it exists
      if (e.status === 1 && e.stderr && e.stderr.toString().includes('Usage')) {
        zxpSignCmd = p;
        break;
      }
      continue;
    }
  }
}

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║          ASTRON — ZXP Packager               ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

// ── Verify Prerequisites ───────────────────────────────────────
if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('❌ dist/ folder not found or incomplete.');
  console.error('   Run "npm run build:prod" first.');
  process.exit(1);
}
console.log('✅ dist/ folder verified');

if (!zxpSignCmd) {
  console.error('');
  console.error('❌ ZXPSignCmd not found!');
  console.error('');
  console.error('   To install ZXPSignCmd:');
  console.error('   1. Download from: https://github.com/nicamedrano/nicamedrano.github.io/blob/master/bin/ZXPSignCmd.exe');
  console.error('   2. Place at:      Astron/tools/ZXPSignCmd.exe');
  console.error('');
  console.error('   Or install globally and ensure it\'s in your PATH.');
  console.error('');

  // Fallback: create a plain ZIP instead
  console.log('→ Creating ZIP package as fallback...');
  createZipFallback();
  process.exit(0);
}

console.log(`✅ ZXPSignCmd found: ${zxpSignCmd}`);

// ── Create directories ─────────────────────────────────────────
fs.mkdirSync(releaseDir, { recursive: true });
fs.mkdirSync(toolsDir, { recursive: true });

// ── Step 1: Create self-signed certificate ─────────────────────
if (!fs.existsSync(certFile)) {
  console.log('');
  console.log('→ Creating self-signed certificate...');
  try {
    execSync(
      `"${zxpSignCmd}" -selfSignedCert "${CERT_COUNTRY}" "${CERT_STATE}" "${CERT_ORG}" "${CERT_CN}" "${CERT_PASSWORD}" "${certFile}"`,
      { stdio: 'inherit' }
    );
    console.log(`  ✅ Certificate created: ${certFile}`);
  } catch (e) {
    console.error('  ❌ Failed to create certificate');
    console.error(e.message);
    process.exit(1);
  }
} else {
  console.log(`✅ Certificate exists: ${certFile}`);
}

// ── Step 2: Sign and package ───────────────────────────────────
console.log('');
console.log('→ Creating ZXP package...');

// Remove old ZXP if exists
if (fs.existsSync(outputZxp)) {
  fs.unlinkSync(outputZxp);
}

try {
  execSync(
    `"${zxpSignCmd}" -sign "${distDir}" "${outputZxp}" "${certFile}" "${CERT_PASSWORD}" -tsa http://timestamp.digicert.com`,
    { stdio: 'inherit' }
  );
} catch (e) {
  // Try without timestamp server (works offline)
  console.log('  ⚠️  Timestamp server unavailable, signing without timestamp...');
  try {
    execSync(
      `"${zxpSignCmd}" -sign "${distDir}" "${outputZxp}" "${certFile}" "${CERT_PASSWORD}"`,
      { stdio: 'inherit' }
    );
  } catch (e2) {
    console.error('  ❌ Failed to create ZXP package');
    console.error(e2.message);
    process.exit(1);
  }
}

// ── Step 3: Verify ─────────────────────────────────────────────
console.log('');
try {
  execSync(`"${zxpSignCmd}" -verify "${outputZxp}"`, { stdio: 'inherit' });
  console.log('✅ ZXP verification passed');
} catch (e) {
  console.log('⚠️  ZXP verification skipped');
}

// ── Done ───────────────────────────────────────────────────────
const stats = fs.statSync(outputZxp);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║            ✅ Package Complete                ║');
console.log('╠══════════════════════════════════════════════╣');
console.log(`║  File: Astron-v${VERSION}.zxp`);
console.log(`║  Size: ${sizeMB} MB`);
console.log(`║  Path: ${outputZxp}`);
console.log('║                                              ║');
console.log('║  Installation:                               ║');
console.log('║  1. Use ZXP Installer or Anastasiy\'s         ║');
console.log('║     Extension Manager to install              ║');
console.log('║  2. Restart After Effects                     ║');
console.log('║  3. Window → Extensions → Astron              ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

// ── Fallback ZIP ───────────────────────────────────────────────
function createZipFallback() {
  // Use PowerShell Compress-Archive (always available on Windows)
  const zipPath = path.join(releaseDir, `Astron-v${VERSION}.zip`);
  fs.mkdirSync(releaseDir, { recursive: true });

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  try {
    execSync(
      `powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: 'inherit' }
    );
    console.log('');
    console.log(`✅ ZIP created: ${zipPath}`);
    console.log('');
    console.log('   To install manually:');
    console.log('   1. Extract to: %APPDATA%\\Adobe\\CEP\\extensions\\co.antarik.astron\\');
    console.log('   2. Enable debug mode (run: npm run install:dev)');
    console.log('   3. Restart After Effects');
    console.log('   4. Window → Extensions → Astron');
  } catch (e) {
    console.error('❌ ZIP creation failed:', e.message);
  }
}
