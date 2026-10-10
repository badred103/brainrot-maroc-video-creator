#!/usr/bin/env node
/**
 * Integration test for the Kling pipeline logic (same code paths as workflow 02).
 * Spins up a mock Kling server, runs create + poll + normalize + output build,
 * and asserts every stage.
 */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const concept = JSON.parse(readFileSync(join(here, '..', 'output', 'sample-concept.json'), 'utf8'));

let pollCount = 0;
const taskId = 'mock-task-' + Date.now();
const mockVideoUrl = 'https://mock.kling.ai/videos/brm-test-123.mp4';

const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'POST' && req.url === '/v1/videos/text2video') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const b = JSON.parse(body);
        console.log('[mock] create  model=' + b.model_name, 'duration=' + b.duration, 'aspect=' + b.aspect_ratio);
        if (!b.prompt || b.prompt.length < 5) {
          res.writeHead(400); res.end(JSON.stringify({ code: 1201, message: 'prompt too short' })); return;
        }
        res.writeHead(200);
        res.end(JSON.stringify({ code: 0, data: { task_id: taskId, task_status: 'processing' } }));
      } catch {
        res.writeHead(400); res.end(JSON.stringify({ code: 1201, message: 'bad body' }));
      }
    });
    return;
  }
  if (req.method === 'GET' && req.url === `/v1/videos/text2video/${taskId}`) {
    pollCount++;
    const status = pollCount >= 2 ? 'succeed' : 'processing';
    const result = status === 'succeed'
      ? { task_result: { videos: [{ url: mockVideoUrl, duration: 10 }] } }
      : {};
    console.log('[mock] query   poll=' + pollCount, 'status=' + status);
    res.writeHead(200);
    res.end(JSON.stringify({ code: 0, data: { task_id: taskId, task_status: status, ...result } }));
    return;
  }
  res.writeHead(404); res.end(JSON.stringify({ code: 404, message: 'not found' }));
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  console.log('\n=== Pipeline integration test ===\n');

  // 1) Build clip requests (same logic as "Build Clip Requests" node)
  const prompts = concept.clip_prompts;
  const runId = 'brm-int-test-' + Date.now();
  const requests = prompts.map((p, i) => ({
    run_id: runId, clip_index: i + 1, clip_count: prompts.length,
    prompt: String(p).slice(0, 2500),
    negative_prompt: concept.negative_prompt,
    model_name: 'kling-v2-5-turbo', mode: 'std', duration: '10',
    aspect_ratio: '9:16', cfg_scale: 0.5,
    api_base: base,
    external_task_id: (runId + '-c' + (i + 1)).slice(0, 64),
  }));
  console.log('build clips:', requests.length, 'clip(s)');

  // 2) Create tasks (same logic as "Create Kling Task" node)
  const created = [];
  for (const req of requests) {
    const r = await fetch(`${base}/v1/videos/text2video`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const j = await r.json();
    const ok = j.code === 0 || j.code === '0';
    const tid = j?.data?.task_id || null;
    created.push({
      ...req, task_id: tid, kling_status: ok && tid ? 'processing' : 'failed',
      terminal: !tid, video_url: null,
      error: tid ? null : 'Kling create failed: ' + JSON.stringify(j).slice(0, 400),
    });
    console.log('create     clip=' + req.clip_index, 'task=' + tid, 'ok=' + ok);
  }

  // 3) Poll loop (same logic as "Query Kling Task" + "Normalize Status" + "Check All Terminal")
  let polls = 0;
  const maxPolls = 5;
  let results = created.slice();
  while (polls < maxPolls) {
    polls++;
    await new Promise((r) => setTimeout(r, 500)); // fast for test
    for (let i = 0; i < results.length; i++) {
      const prev = results[i];
      if (prev.terminal) continue;
      const q = await fetch(`${base}/v1/videos/text2video/${prev.task_id}`);
      const qj = await q.json();
      const d = qj.data || {};
      const st = d.task_status || prev.kling_status;
      const url = d.task_result?.videos?.[0]?.url || null;
      const done = st === 'succeed' || st === 'succeeded' || st === 'failed' || st === 'FAILED';
      results[i] = { ...prev, kling_status: st, terminal: done, video_url: url,
        error: done && !(st === 'succeed' || st === 'succeeded') ? ('Kling task failed: ' + (d.task_status_msg || st)) : null };
      console.log('poll       clip=' + prev.clip_index, 'poll=' + polls, 'status=' + st, 'url=' + (url ? 'yes' : 'no'));
    }
    const allTerminal = results.length > 0 && results.every((r) => r.terminal);
    if (allTerminal) break;
  }

  // 4) Build output (same logic as "Build Output" node)
  const urls = results.map((r) => r.video_url).filter(Boolean);
  const errors = results.map((r) => r.error).filter(Boolean);
  let status = 'failed';
  if (urls.length === results.length && results.length > 0) status = 'succeeded';
  else if (urls.length > 0) status = 'partial';
  const out = {
    status, video_url: urls[0] || null, video_urls: urls,
    clip_count: results.length, approx_total_seconds: urls.length * 10,
    aspect_ratio: '9:16', polls, error: errors.length ? errors.join(' | ') : null,
    clips: results, finished_at: new Date().toISOString(),
  };

  // 5) Assertions
  console.log('\n--- assertions ---');
  const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAIL: ' + msg); console.log('PASS:', msg); };
  assert(out.status === 'succeeded', 'all 3 clips succeeded');
  assert(out.video_urls.length === 3, '3 video urls');
  assert(out.video_url === mockVideoUrl, 'first url matches mock');
  assert(out.error === null, 'no errors');
  assert(out.approx_total_seconds === 30, 'approx 30s total (3 clips x 10s)');
  assert(pollCount >= 2, 'mock server received at least 2 polls (some clips finish faster)');

  console.log('\nRESULT: pipeline logic works end-to-end.');
  server.close();
  process.exit(0);
});
