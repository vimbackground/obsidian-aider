const fs = require('fs');
const path = require('path');

// Usage: node scripts/bump-version.js [major|minor|patch]
const type = (process.argv[2] || 'patch').toLowerCase();

const pkgPath = path.resolve(__dirname, '../package.json');
const manifestPath = path.resolve(__dirname, '../manifest.json');
const outputManifestPath = path.resolve(__dirname, '../output/obsidian-aider/manifest.json');
const versionsPath = path.resolve(__dirname, '../versions.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version || '0.1.0';

const [major, minor, patch] = oldVersion.split('.').map((num) => parseInt(num, 10));

let newVersion = '';
if (/^\d+\.\d+\.\d+/.test(type)) {
  newVersion = type;
} else if (type === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (type === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else {
  newVersion = `${major}.${minor}.${patch + 1}`;
}

console.log(`[Version Bump] ${oldVersion} -> ${newVersion} (${type.toUpperCase()} upgrade)`);

// 1. Update package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// 2. Update manifest.json
let minAppVersion = '0.15.0';
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = newVersion;
  if (manifest.minAppVersion) {
    minAppVersion = manifest.minAppVersion;
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

// 3. Update output/obsidian-aider/manifest.json if exists
if (fs.existsSync(outputManifestPath)) {
  const outManifest = JSON.parse(fs.readFileSync(outputManifestPath, 'utf8'));
  outManifest.version = newVersion;
  fs.writeFileSync(outputManifestPath, JSON.stringify(outManifest, null, 2) + '\n', 'utf8');
}

// 4. Update versions.json if exists
if (fs.existsSync(versionsPath)) {
  const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));
  versions[newVersion] = minAppVersion;
  fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2) + '\n', 'utf8');
}

console.log(`Successfully updated version to ${newVersion} in all manifest, package & versions files.`);
