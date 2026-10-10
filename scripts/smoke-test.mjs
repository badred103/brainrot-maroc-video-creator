#!/usr/bin/env node
/**
 * Live smoke test for the two external APIs the workflow depends on.
 * Run:  cp .env.example .env   (fill it)   then:  node scripts/smoke-test.mjs
 *
 * - never prints API keys, only a masked preview
 * - skips any provider whose key is missing
 * - exits 1 only if a provider was configured AND failed
 */

import { env, mask } from './load-env.mjs';

const log = (...a) => console.log(...a);
let configured = 0;
let failed = 0;

async function testGemini() {
  const key = env.GEMINI_API_KEY;
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!key) { log('\n[Gemini] SKIPPED - GEMINI_API_KEY not set'); return; }
  configured++;
  log(`\n[Gemini] testing model=${model} key=${mask(key)}`);

  const schema = {
    type: 'OBJECT',
    properties: {
      concept_title: { type: 'STRING' },
      setting: { type: 'STRING' },
      hook: { type: 'STRING' },
      kling_prompt: { type: 'STRING' },
      clip_prompts: { type: 'ARRAY', items: { type: 'STRING' } },
      negative_prompt: { type: 'STRING' },
      voiceover_darija: { type: 'STRING' },
      caption: { type: 'STRING' },
      hashtags: { type: 'ARRAY', items: { type: 'STRING' } },
      safety: { type: 'OBJECT', properties: { passed: { type: 'BOOLEAN' }, flags: { type: 'ARRAY', items: { type: 'STRING' } }, notes: { type: 'STRING' } } },
      retention_note: { type: 'STRING' },
    },
    required: ['concept_title', 'setting', 'hook', 'kling_prompt', 'clip_prompts', 'negative_prompt', 'voiceover_darija', 'caption', 'hashtags', 'safety', 'retention_note'],
  };

  const body = {
    systemInstruction: { parts: [{ text: 'You generate one original Moroccan Darija comedy short concept. Reply with JSON only, matching the schema.' }] },
    contents: [{ role: 'user', parts: [{ text: 'One safe original concept set in a Moroccan cafe. No copyrighted characters.' }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 1.0 },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { failed++; log(`[Gemini] FAIL http=${res.status} ${JSON.stringify(json).slice(0, 300)}`); return; }
  const text = ((json.candidates || [])[0]?.content?.parts || []).map((p) => p.text || '').join('');
  let parsed = null;
  try { parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text); } catch { /* reported below */ }
  if (!parsed) { failed++; log(`[Gemini] FAIL response not JSON: ${text.slice(0, 200)}`); return; }
  const words = String(parsed.voiceover_darija || '').trim().split(/\s+/).filter(Boolean).length;
  log(`[Gemini] OK  title="${parsed.concept_title}"`);
  log(`[Gemini]     vo_words=${words} caption_chars=${String(parsed.caption || '').length} tags=${(parsed.hashtags || []).join(' ')}`);
  log(`[Gemini]     safety.passed=${parsed.safety?.passed}`);
  if (words > 75) { log('[Gemini] WARN voiceover over 75 words - the workflow would reject it'); }
  if (String(parsed.caption || '').length > 120) { log('[Gemini] WARN caption over 120 chars - the workflow would reject it'); }
}

async function testKling() {
  const key = env.KLING_API_KEY;
  if (!key) { log('\n[Kling] SKIPPED - KLING_API_KEY not set'); return; }
  configured++;
  const base = env.KLING_API_BASE || 'https://api.klingai.com';
  const model = env.KLING_MODEL || 'kling-v1-6';
  const duration = env.KLING_DURATION || '10';
  const maxPolls = Number(env.KLING_MAX_POLLS || 20);
  log(`\n[Kling] testing ${base} model=${model} duration=${duration}s key=${mask(key)}`);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
  const createBody = {
    model_name: model,
    prompt: 'Handheld vertical shot inside a small Moroccan neighbourhood grocery at night. A fictional shopkeeper slides an unlabelled glass bottle across the counter. Warm fluorescent light, slow push-in, comedic deadpan.',
    negative_prompt: 'text, watermark, logo, subtitles, copyrighted character, brand name, violence, sexual content, gore, dangerous stunt, real person likeness',
    mode: env.KLING_MODE || 'std',
    duration,
    aspect_ratio: '9:16',
    cfg_scale: 0.5,
    external_task_id: 'brm-smoke-' + Date.now(),
  };

  const res = await fetch(`${base}/v1/videos/text2video`, { method: 'POST', headers, body: JSON.stringify(createBody) });
  const json = await res.json().catch(() => ({}));
  const taskId = json?.data?.task_id;
  if (!taskId) { failed++; log(`[Kling] FAIL create http=${res.status} ${JSON.stringify(json).slice(0, 400)}`); return; }
  log(`[Kling] created task_id=${taskId}`);

  for (let i = 1; i <= maxPolls; i++) {
    await new Promise((r) => setTimeout(r, 30000));
    const q = await fetch(`${base}/v1/videos/text2video/${taskId}`, { headers: { Authorization: `Bearer ${key}` } });
    const qj = await q.json().catch(() => ({}));
    const st = qj?.data?.task_status;
    const urlVid = qj?.data?.task_result?.videos?.[0]?.url;
    log(`[Kling] poll ${i}: status=${st}`);
    if (st === 'succeed' || st === 'succeeded') { log(`[Kling] OK  video_url=${urlVid}`); return; }
    if (st === 'failed') { failed++; log(`[Kling] FAIL task failed: ${qj?.data?.task_status_msg}`); return; }
  }
  failed++;
  log(`[Kling] FAIL timed out after ${maxPolls} polls`);
}

await testGemini();
await testKling();

log(`\nSummary: ${configured} provider(s) configured, ${failed} failure(s)`);
if (!configured) log('No API keys configured - nothing was tested. Fill .env and re-run.');
process.exit(failed ? 1 : 0);
