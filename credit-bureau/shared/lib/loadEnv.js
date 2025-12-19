import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, '..', '..');
const loaded = new Set();

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }
  const separator = trimmed.indexOf('=');
  if (separator === -1) {
    return null;
  }
  const key = trimmed.slice(0, separator).trim();
  const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
  return { key, value };
}

function manualLoad(filePath) {
  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    if (parsed.key && !(parsed.key in process.env)) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

function loadFile(candidate) {
  if (!candidate) return;
  const resolved = path.resolve(candidate);
  if (loaded.has(resolved) || !fs.existsSync(resolved)) {
    return;
  }
  try {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(resolved);
    } else {
      manualLoad(resolved);
    }
    loaded.add(resolved);
  } catch (error) {
    console.warn(`Failed to load env file ${resolved}: ${error.message}`);
  }
}

const defaults = [
  path.join(process.cwd(), '.env'),
  path.join(workspaceRoot, '.env'),
  path.join(workspaceRoot, 'vars', 'local.env')
];

defaults.forEach((file) => loadFile(file));

export function loadEnvFiles(files = []) {
  files.forEach((file) => loadFile(file));
}
