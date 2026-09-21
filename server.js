/**
 * Backend Entrypoint
 * Allows running "node server" directly from the backend directory.
 */

const path = require('path');
const fs = require('fs');

const distServer = path.join(__dirname, 'dist', 'server.js');

if (fs.existsSync(distServer)) {
  require(distServer);
} else {
  console.log('Building backend TypeScript files...');
  try {
    const { execSync } = require('child_process');
    execSync('npx tsc', { cwd: __dirname, stdio: 'inherit' });
    require(distServer);
  } catch (err) {
    console.error('Failed to compile backend, trying tsx runner...');
    const { spawn } = require('child_process');
    const child = spawn('npx', ['tsx', path.join(__dirname, 'src', 'server.ts')], {
      stdio: 'inherit',
      shell: true,
    });
    child.on('exit', (code) => process.exit(code || 0));
  }
}
