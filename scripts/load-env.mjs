import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Loads .env WITHOUT printing values. Returns a plain object. */
export function loadEnv() {
  const p = join(root, '.env');
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

/** Masks a secret so it can be shown safely in a log line. */
export function mask(v) {
  if (!v) return '(empty)';
  const s = String(v);
  if (s.length <= 10) return '*'.repeat(s.length);
  return s.slice(0, 4) + '*'.repeat(Math.min(12, s.length - 8)) + s.slice(-4);
}

export const env = Object.assign({}, loadEnv(), process.env);
export const rootDir = root;
