import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);
const prismaBin = require.resolve('prisma/build/index.js');
const tscBin = require.resolve('typescript/bin/tsc');

console.log('📦 [1/2] Generating Prisma Client...');
const prismaRes = spawnSync(process.execPath, [prismaBin, 'generate'], {
  cwd: backendDir,
  stdio: 'inherit',
});

if (prismaRes.status !== 0) {
  console.error('❌ Prisma generate failed with code:', prismaRes.status);
  process.exit(prismaRes.status || 1);
}

console.log('🔨 [2/2] Compiling TypeScript...');
const tscRes = spawnSync(process.execPath, [tscBin], {
  cwd: backendDir,
  stdio: 'inherit',
});

if (tscRes.status !== 0) {
  console.error('❌ TypeScript compilation failed with code:', tscRes.status);
  process.exit(tscRes.status || 1);
}

console.log('✅ Backend build completed successfully.');
