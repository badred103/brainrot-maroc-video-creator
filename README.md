# Brainrot Maroc Video Creator

End-to-end automation for a Moroccan TikTok channel that publishes original,
fast-paced absurdist comedy in Darija.

One concept per day -> one 9:16 vertical AI video -> delivered to TikTok
**only** through TikTok's official Content Posting API.

Public site (GitHub Pages): https://badred103.github.io/brainrot-maroc-video-creator/

- Overview: https://badred103.github.io/brainrot-maroc-video-creator/
- Privacy Policy: https://badred103.github.io/brainrot-maroc-video-creator/privacy.html
- Terms of Service: https://badred103.github.io/brainrot-maroc-video-creator/terms.html

## What is in this repo

| Path | What it is |
| --- | --- |
| `index.html`, `privacy.html`, `terms.html`, `assets/` | The public GitHub Pages site. No secrets, no personal data. |
| `n8n/workflows/01-daily-brainrot-main.json` | Main daily workflow: schedule -> Gemini concept -> safety gate -> Kling -> TikTok. |
| `n8n/workflows/02-kling-text-to-video.json` | Sub-workflow: Kling create task, poll until terminal, return video URL + status + error. |
| `n8n/workflows/03-tiktok-oauth-and-upload.json` | Sub-workflow: TikTok OAuth (start + callback + refresh) and upload (draft or direct post). |
| `docs/SETUP-n8n.md` | n8n credentials, variables and wiring. Start here. |
| `docs/TIKTOK-APP.md` | TikTok Developer Portal steps, scopes, redirect URLs, review submission. |
| `docs/CHECKLIST.md` | The 8-phase progress checklist with current status. |
| `docs/TEST-REPORT.md` | What was actually tested, and what was not. |
| `scripts/` | Local validators and live API smoke tests. Keys are never printed, only masked. |
| `output/sample-concept.json` | One original, safe sample concept used for the offline rule test. |

## How a daily run works

1. `20:30 Africa/Casablanca` - schedule trigger fires (cron `30 20 * * *`,
   workflow timezone `Africa/Casablanca`).
2. Gemini returns one structured concept: visual prompt, 3 clip prompts,
   Darija voiceover (<= 75 words), caption (<= 120 chars), 3-5 hashtags
   (must include `#Morocco`, `#Maroc`, `#TikTokMaroc`), and a model safety check.
3. A validation gate enforces every one of those limits, plus a banned-term
   scan and `safety.passed === true`. Anything failing stops the run
   and notifies you. No video is generated, nothing is posted.
4. Kling generates 9:16 clip(s). The workflow polls until `succeeded` or
   `failed` and reports the final URL, status and any error message.
5. TikTok: by default the video is sent to your TikTok **inbox as a draft**
   (`video.upload` scope). Public posting requires `video.publish` approval
   **and** an explicit confirmation prompt at that moment.

## Honest limits

- **Kling generates 5s or 10s clips.** A true 20-35s video needs 2-4 clips
  stitched. The workflow generates 3 clips by default and can merge them with
  ffmpeg into a local file (`ENABLE_FFMPEG_MERGE=true`), but a local file
  cannot be sent by URL - publishing it needs the `FILE_UPLOAD` source, which
  is not wired yet. Until then the daily run delivers a 10s clip.
- **Kling text-to-video produces no audio.** The Darija voiceover is produced
  as a script. Turning it into audio needs a TTS provider plus an ffmpeg mux;
  not wired.
- No promise of views, likes, followers or income is made anywhere, and none
  should be.

## Safety rules baked in

Every concept is written under a fixed policy and then checked: no hate speech,
no sexual content, no violence or gore, no dangerous stunts, no self-harm, no
drugs or alcohol, no politics, no religion, no real-person impersonation, no
copyrighted characters, brands or music, no medical or financial claims, no
fear-mongering. A failed check stops the run.

## Secrets

Nothing secret is in this repository. API keys live in n8n credentials.
TikTok `client_key` / `client_secret` live in n8n variables or a local,
git-ignored `.env`. `scripts/` prints only masked key previews.
