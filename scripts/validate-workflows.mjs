#!/usr/bin/env node
/**
 * Structural validation for the n8n workflow JSON files.
 * Run:  node scripts/validate-workflows.mjs
 *
 * Checks:
 *  1. Valid JSON, required top-level fields.
 *  2. Every node has name/type/typeVersion/position/parameters.
 *  3. Node names are unique.
 *  4. Every connection source/target node exists.
 *  5. Every connection index is a valid output of the source node type.
 *  6. Every node is reachable from some trigger (orphan detection).
 *  7. No obvious secret material is embedded in the file.
 *  8. Known placeholder values are reported (they must be replaced at setup).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'n8n', 'workflows');

// Nodes with more than one main output, and how many outputs they have.
const MULTI_OUTPUT = {
  'n8n-nodes-base.if': 2,
  'n8n-nodes-base.switch': 4,
  'n8n-nodes-base.splitInBatches': 2,
};
const TRIGGER_TYPES = new Set([
  'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.webhook',
  'n8n-nodes-base.executeWorkflowTrigger',
  'n8n-nodes-base.manualTrigger',
  'n8n-nodes-base.errorTrigger',
]);

const SECRET_PATTERNS = [
  { name: 'openai-style key', re: /sk-[A-Za-z0-9]{20,}/ },
  { name: 'google api key', re: /AIza[0-9A-Za-z_-]{30,}/ },
  { name: 'bearer token literal', re: /Bearer\s+[A-Za-z0-9._-]{30,}/ },
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'tiktok client secret value', re: /client_secret["'\s:=]+[A-Za-z0-9]{24,}/ },
];

let failures = 0;
let warnings = 0;
const fail = (f, m) => { failures++; console.log(`  FAIL  ${basename(f)}: ${m}`); };
const warn = (f, m) => { warnings++; console.log(`  WARN  ${basename(f)}: ${m}`); };

const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
if (!files.length) { console.error('No workflow JSON found in ' + dir); process.exit(1); }

for (const file of files) {
  const full = join(dir, file);
  console.log(`\n${file}`);
  let wf;
  try {
    wf = JSON.parse(readFileSync(full, 'utf8'));
  } catch (e) {
    fail(full, `not valid JSON: ${e.message}`);
    continue;
  }

  for (const key of ['name', 'nodes', 'connections', 'settings']) {
    if (!(key in wf)) fail(full, `missing top-level field "${key}"`);
  }
  if (!Array.isArray(wf.nodes) || !wf.nodes.length) fail(full, 'no nodes');

  const names = new Set();
  for (const n of wf.nodes) {
    for (const k of ['name', 'type', 'typeVersion', 'position', 'parameters']) {
      if (!(k in n)) fail(full, `node "${n.name || '?'}" missing "${k}"`);
    }
    if (names.has(n.name)) fail(full, `duplicate node name "${n.name}"`);
    names.add(n.name);
    if (!String(n.type).startsWith('n8n-nodes-base.')) warn(full, `node "${n.name}" uses non-core type ${n.type}`);
    if (!Array.isArray(n.position) || n.position.length !== 2) fail(full, `node "${n.name}" bad position`);
  }

  // connections
  const conns = wf.connections || {};
  const reachable = new Set();
  for (const [src, outs] of Object.entries(conns)) {
    if (!names.has(src)) { fail(full, `connection references unknown source node "${src}"`); continue; }
    const srcNode = wf.nodes.find((n) => n.name === src);
    const maxOut = MULTI_OUTPUT[srcNode.type] || 1;
    const branches = outs.main || [];
    if (branches.length > maxOut) {
      fail(full, `"${src}" (${srcNode.type}) declares ${branches.length} outputs, max is ${maxOut}`);
    }
    branches.forEach((targets, idx) => {
      if (!Array.isArray(targets)) { fail(full, `"${src}" output ${idx} is not an array`); return; }
      for (const t of targets) {
        if (!names.has(t.node)) { fail(full, `"${src}" -> unknown node "${t.node}"`); continue; }
        if (t.type !== 'main') fail(full, `"${src}" -> "${t.node}" uses type ${t.type}`);
        if (typeof t.index !== 'number') fail(full, `"${src}" -> "${t.node}" missing index`);
        reachable.add(t.node);
      }
    });
  }

  // orphan / trigger checks
  const triggers = wf.nodes.filter((n) => TRIGGER_TYPES.has(n.type)).map((n) => n.name);
  if (!triggers.length) warn(full, 'no trigger node found');
  for (const n of wf.nodes) {
    if (TRIGGER_TYPES.has(n.type)) continue;
    if (!reachable.has(n.name)) fail(full, `node "${n.name}" is not reachable from any connection (orphan)`);
  }

  // secret scan
  const raw = readFileSync(full, 'utf8');
  for (const p of SECRET_PATTERNS) {
    if (p.re.test(raw)) fail(full, `possible secret in file (${p.name})`);
  }

  // placeholders
  const placeholders = [...raw.matchAll(/REPLACE_[A-Z_]+/g)].map((m) => m[0]);
  if (placeholders.length) {
    warn(full, `contains ${placeholders.length} placeholder(s): ${[...new Set(placeholders)].join(', ')} (expected until setup)`);
  }

  console.log(`  OK    ${wf.nodes.length} nodes, ${triggers.length} trigger(s): ${triggers.join(', ') || 'none'}`);
}

console.log(`\n${failures} failure(s), ${warnings} warning(s)`);
process.exit(failures ? 1 : 0);
