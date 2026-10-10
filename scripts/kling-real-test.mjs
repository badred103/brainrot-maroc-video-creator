#!/usr/bin/env node
/**
 * Real Kling test: finds a model the account can actually use, then generates
 * one safe original clip from the sample concept and polls it to completion.
 *
 * Never prints the API key.
 *
 * Run:  node scripts/kling-real-test.mjs
 */

import { env, mask } from './load-env.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const concept = JSON.parse(readFileSync(join(here, '..', 'output', 'sample-concept.json'), 'utf8'));

const key = env.KLING_API_KEY;
if (!key) { console.error('KLING_API_KEY not set'); process.exit(1); }
const base = env.KLING_API_BASE || 'https://api.klingai.com';
const H = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

const CANDIDATES = ['kling-v2-5-turbo', 'kling-v2-1', 'kling-v2-master', 'kling-v1-5', 'kling-v1', 'kling-v3'];
const NEG = 'text, watermark, logo, subtitles, copyrighted character, brand name, violence, sexual content, gore, dangerous stunt, real person likeness';

console.log(`Kling base=${base}  key=${mask(key)}`);
console.log(`Prompt: "${concept.clip_prompts[0].slice(0, 80)}..."`);

let chosen = null;
let taskId = null;
for (const model of CANDIDATES) {
  const body = {
    model_name: model,
    prompt: concept.clip_prompts[0],
    negative_prompt: NEG,
    mode: 'std',
    duration: '10',
    aspect_ratio: '9:16',
    cfg_scale: 0.5,
    external_task_id: 'brm-test-' + Date.now(),
  };
  const r = await fetch(`${base}/v1/videos/text2video`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  const id = j?.data?.task_id;
  console.log(`  ${model.padEnd(18)} http=${r.status} code=${j.code ?? '-'} ${id ? 'ACCEPTED task=' + id : (j.message || '').slice(0, 90)}`);
  if (id) { chosen = model; taskId = id; break; }
}

if (!taskId) { console.log('\nRESULT: no model accepted by this account.'); process.exit(1); }
console.log(`\nModel accepted: ${chosen}`);
console.log(`task_id: ${taskId}  -> set KLING_MODEL=${chosen}`);

const maxPolls = Number(env.KLING_MAX_POLLS || 20);
const t0 = Date.now();
for (let i = 1; i <= maxPolls; i++) {
  await new Promise((r) => setTimeout(r, 30000));
  const q = await fetch(`${base}/v1/videos/text2video/${taskId}`, { headers: { Authorization: `Bearer ${key}` } });
  const qj = await q.json().catch(() => ({}));
  const st = qj?.data?.task_status;
  const url = qj?.data?.task_result?.videos?.[0]?.url;
  const dur = qj?.data?.task_result?.videos?.[0]?.duration;
  console.log(`  poll ${String(i).padStart(2)} (+${Math.round((Date.now() - t0) / 1000)}s) status=${st}`);
  if (st === 'succeed' || st === 'succeeded') {
    console.log(`\nRESULT: succeeded`);
    console.log(`  model      : ${chosen}`);
    console.log(`  video_url  : ${url}`);
    console.log(`  duration   : ${dur}`);
    console.log(`  elapsed    : ${Math.round((Date.now() - t0) / 1000)}s`);
    process.exit(0);
  }
  if (st === 'failed') {
    console.log(`\nRESULT: failed - ${qj?.data?.task_status_msg}`);
    process.exit(1);
  }
}
console.log(`\nRESULT: timed out after ${maxPolls} polls, last status unknown`);
process.exit(1);
