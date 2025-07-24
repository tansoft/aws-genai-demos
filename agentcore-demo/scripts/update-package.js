const fs = require('fs');
const path = require('path');

// Read the package.json file
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add demo scripts
packageJson.scripts = {
  ...packageJson.scripts,
  'demo:runtime': 'npm run build && node dist/index.js runtime',
  'demo:memory': 'npm run build && node dist/index.js memory',
  'demo:identity': 'npm run build && node dist/index.js identity',
  'demo:gateway': 'npm run build && node dist/index.js gateway',
  'demo:code-interpreter': 'npm run build && node dist/index.js code-interpreter',
  'demo:browser': 'npm run build && node dist/index.js browser',
  'demo:observability': 'npm run build && node dist/index.js observability',
  'demo:all': 'npm run build && node dist/index.js all'
};

// Write the updated package.json file
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('Updated package.json with demo scripts');