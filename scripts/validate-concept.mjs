#!/usr/bin/env node
/**
 * Offline rule check for a generated concept.
 * Mirrors the validation inside "Parse And Validate Concept" in
 * n8n/workflows/01-daily-brainrot-main.json, so the rules can be tested
 * without running n8n or spending API calls.
 *
 * Run:  node scripts/validate-concept.mjs [path-to-concept.json]
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] || join(here, '..', 'output', 'sample-concept.json');

const BANNED = /\b(kill|suicide|rape|nude|porn|sexual|isis|jihad|cocaine|heroin|weed|hashish)\b/i;
const REQUIRED_TAGS = ['#morocco', '#maroc', '#tiktokmaroc'];
const REQUIRED_FIELDS = ['concept_title', 'setting', 'hook', 'kling_prompt', 'clip_prompts', 'voiceover_darija', 'caption', 'hashtags', 'safety'];

function validate(o, opts = {}) {
  const issues = [];
  const clipCount = opts.clipCount || 3;

  for (const k of REQUIRED_FIELDS) {
    if (o[k] === undefined || o[k] === null || o[k] === '') issues.push(`Missing field: ${k}`);
  }

  const vo = String(o.voiceover_darija || '');
  const voWords = vo.trim().split(/\s+/).filter(Boolean).length;
  if (voWords > 75) issues.push(`Voiceover too long: ${voWords} words (max 75).`);
  if (voWords < 5) issues.push(`Voiceover too short: ${voWords} words.`);

  const cap = String(o.caption || '');
  if (cap.length > 120) issues.push(`Caption too long: ${cap.length} chars (max 120).`);
  if (cap.length < 10) issues.push('Caption too short.');

  let tags = (Array.isArray(o.hashtags) ? o.hashtags : [])
    .map((t) => String(t).trim()).filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`));
  tags = [...new Set(tags)];
  if (tags.length < 3 || tags.length > 5) issues.push(`Hashtag count invalid: ${tags.length} (need 3 to 5).`);
  for (const n of REQUIRED_TAGS) {
    if (!tags.some((t) => t.toLowerCase() === n)) issues.push(`Missing required hashtag: ${n}`);
  }

  const blob = [o.kling_prompt, vo, cap, tags.join(' '), o.concept_title || ''].join(' ');
  if (BANNED.test(blob)) issues.push('Banned term matched in generated content.');

  if (o.safety?.passed !== true) {
    issues.push(`Model safety check failed. Flags: ${JSON.stringify(o.safety?.flags || [])}`);
  }

  let clips = Array.isArray(o.clip_prompts) && o.clip_prompts.length ? o.clip_prompts.map(String) : [String(o.kling_prompt || '')];
  while (clips.length < clipCount) clips.push(clips[clips.length - 1]);
  clips = clips.slice(0, clipCount);

  return {
    ok: issues.length === 0,
    issues,
    metrics: { vo_words: voWords, caption_chars: cap.length, hashtags: tags, clip_count: clips.length },
  };
}

if (!existsSync(target)) {
  console.error(`File not found: ${target}`);
  process.exit(1);
}
const concept = JSON.parse(readFileSync(target, 'utf8'));
const r = validate(concept);

console.log(`Concept: ${concept.concept_title}`);
console.log(`Setting: ${concept.setting}`);
console.log('');
console.log(`voiceover words : ${r.metrics.vo_words}  (limit 75)   ${r.metrics.vo_words <= 75 ? 'PASS' : 'FAIL'}`);
console.log(`caption chars   : ${r.metrics.caption_chars}  (limit 120)  ${r.metrics.caption_chars <= 120 ? 'PASS' : 'FAIL'}`);
console.log(`hashtags        : ${r.metrics.hashtags.join(' ')}`);
console.log(`clips           : ${r.metrics.clip_count}`);
console.log(`safety.passed   : ${concept.safety?.passed}`);
console.log('');
if (r.ok) {
  console.log('RESULT: concept passes every rule and would be sent to Kling.');
  process.exit(0);
}
console.log('RESULT: concept REJECTED. Issues:');
for (const i of r.issues) console.log(` - ${i}`);
process.exit(2);

export { validate };
