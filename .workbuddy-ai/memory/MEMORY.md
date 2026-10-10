# Project memory — Brainrot Maroc Video Creator

## What this project is

Daily automation for a Moroccan TikTok channel: one original Darija absurdist
comedy short per day, rendered with Kling, delivered to TikTok via the official
Content Posting API. Platform: n8n at `http://localhost:5678`.

## Layout

- `n8n/workflows/01-daily-brainrot-main.json` — the daily run.
- `n8n/workflows/02-kling-text-to-video.json` — Kling sub-workflow.
- `n8n/workflows/03-tiktok-oauth-and-upload.json` — TikTok OAuth + upload.
- Site files are at the **repo root** (`index.html`, `privacy.html`,
  `terms.html`, `assets/`) because GitHub Pages serves `/` on `main`.
- `docs/` — SETUP-n8n, TIKTOK-APP, CHECKLIST, TEST-REPORT.

## Conventions and rules

- Secrets go in n8n credentials, never in workflow JSON or in the repo.
  Client key/secret go in n8n *variables* (`$vars.TIKTOK_CLIENT_KEY`, ...).
  `scripts/` prints only masked key previews.
- Default post mode is `INBOX` (draft). Public posting needs `video.publish`
  approval AND a Wait-on-webhook human confirmation. Never bypass that gate.
- Required hashtags in every concept: `#Morocco`, `#Maroc`, `#TikTokMaroc`.
  Voiceover <= 75 words, caption <= 120 chars, 3-5 hashtags.
- No promises of views/income anywhere.

## Known unresolved limits

- 20-35s is not achievable in one Kling call (5s/10s cap). Needs multi-clip
  ffmpeg stitch + TikTok `FILE_UPLOAD` source. Not wired.
- Kling output is silent; Darija voiceover is script-only (no TTS/mux yet).
- `REPLACE_WITH_CONTACT_EMAIL` still sits in `privacy.html` and `terms.html`;
  it must be replaced before submitting the TikTok app for review.
- TikTok OAuth cannot use `localhost` — n8n needs a public HTTPS URL.

## Validation habit that paid off

Always run `node scripts/validate-workflows.mjs` and, if n8n is available,
`n8n import:workflow --input=<file>`. Reading the JSON is not enough; both
tools caught real defects that eyeballing missed.
