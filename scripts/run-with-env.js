const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const candidates = [
  '.env.production',
  '.env.local',
  '.env',
];

for (const envFileName of candidates) {
  const envFile = path.resolve(process.cwd(), envFileName);
  if (fs.existsSync(envFile)) {
    require('dotenv').config({ path: envFile, override: false });
  }
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('No command provided to run-with-env.js');
  process.exit(1);
}

const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
