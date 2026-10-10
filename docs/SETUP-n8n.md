# n8n setup

Your n8n instance: **http://localhost:5678**

## 0. Give me access (optional but fastest)

If you want me to import the workflows into your instance instead of you
clicking through the UI:

1. In n8n, open **Settings -> n8n API**.
2. **Create an API key**, copy it.
3. Paste it to me (or set `N8N_API_KEY=...` in a local, git-ignored `.env`).

Without it, follow steps 1-6 manually. Both work identically.

## 1. Import the three workflows

n8n -> **Workflows** -> **Import from File**, in this order:

1. `n8n/workflows/02-kling-text-to-video.json`
2. `n8n/workflows/03-tiktok-oauth-and-upload.json`
3. `n8n/workflows/01-daily-brainrot-main.json`

All three were validated by importing them into a real n8n 2.35.7 instance
(`n8n import:workflow`) and by `node scripts/validate-workflows.mjs`.

## 2. Create credentials

**Settings -> Credentials -> New**

| Credential | Type | Fields |
| --- | --- | --- |
| `Gemini API Key` | Header Auth | Name: `x-goog-api-key` &nbsp;/&nbsp; Value: your Google AI Studio key |
| `Kling API Auth` | Header Auth | Name: `Authorization` &nbsp;/&nbsp; Value: `Bearer <your-kling-api-key>` |

Then open each workflow and attach the credential on the nodes that show a
credential warning:

- `01`: node **Gemini Generate Concept**
- `02`: nodes **Create Kling Task** and **Query Kling Task**

If Kling requires JWT auth instead of a static API key, keep the same Header
Auth credential and replace the value with `Bearer <jwt>`; note that JWTs
expire, so that variant needs a token-refresh step.

## 3. Wire the sub-workflow calls

In `01-daily-brainrot-main.json`, open each **Execute Workflow** node and pick
the sub-workflow from the list (the JSON contains a placeholder ID):

- **Run Kling Text-To-Video** -> `BRM - Kling Text-to-Video (sub)`
- **Upload To TikTok** -> `BRM - TikTok OAuth + Upload (sub)`

## 4. Create n8n variables

**Settings -> Variables -> Add variable**

Required for TikTok:

| Variable | Example |
| --- | --- |
| `TIKTOK_CLIENT_KEY` | from TikTok Developer Portal |
| `TIKTOK_CLIENT_SECRET` | from TikTok Developer Portal |
| `TIKTOK_REDIRECT_URI` | `https://<your-public-n8n-host>/webhook/tiktok/oauth/callback` |
| `TIKTOK_SCOPES` | `user.info.basic,video.upload` (add `video.publish` only after approval) |

Optional tuning (defaults are used if unset):

| Variable | Default | Meaning |
| --- | --- | --- |
| `POST_MODE` | `INBOX` | `INBOX` = draft for review. `DIRECT_POST` = publish (needs approval + confirmation). |
| `PRIVACY_LEVEL` | `SELF_ONLY` | TikTok privacy level for direct post. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | |
| `CLIP_COUNT` | `3` | Clips generated per run. |
| `KLING_MODEL` | `kling-v1-6` | Confirm the model name in your Kling console. |
| `KLING_MODE` | `std` | |
| `KLING_DURATION` | `10` | `5` or `10`. |
| `KLING_MAX_POLLS` | `20` | 20 polls x 45s ~= 15 min budget. |
| `ENABLE_FFMPEG_MERGE` | `false` | Set `true` to stitch clips locally with ffmpeg. |
| `FFMPEG_PATH` | `ffmpeg` | |
| `OUTPUT_DIR` | `/tmp` | Where merged files are written. |
| `NOTIFY_WEBHOOK_URL` | empty | Any URL that accepts a POST (Discord/Telegram bridge, your own endpoint). Empty = no notifications. |

## 5. Make n8n reachable over public HTTPS

**This is the one hard blocker for TikTok OAuth.** TikTok will not redirect to
`http://localhost:5678`. The callback must be a public `https://` URL.

Pick one:

- **n8n Cloud** (easiest): host the workflows there, callback becomes
  `https://<your-subdomain>.app.n8n.cloud/webhook/tiktok/oauth/callback`.
- **Tunnel**: run `cloudflared tunnel --url http://localhost:5678` or
  `ngrok http 5678`, then set `TIKTOK_REDIRECT_URI` to the HTTPS URL it gives
  you, and register exactly that URL in the TikTok app.

Then activate workflow `03` and open:

`https://<your-public-n8n-host>/webhook/tiktok/oauth/start`

Click the button, log in on TikTok's own page, approve. You never type your
TikTok password anywhere except on TikTok.

The tokens are stored in that workflow's static data (n8n's own database), not
in files and not in this repository.

## 6. Timezone and schedule

Workflow `01` has `timezone: Africa/Casablanca` and cron `30 20 * * *`, so it
fires at 20:30 Morocco time. If your server clock is UTC, the workflow
timezone setting still controls the trigger - no conversion needed.

Activate `01` only after steps 2-5 are done, otherwise the first run fails on
credentials.

## 7. First test run

1. Open `01`, click **Execute Workflow** (manual) - or better:
2. Open `02` alone and execute it with pinned input to check Kling.
3. Then run `01` end to end once and read the report node output.

Then:

```bash
cp .env.example .env      # fill it locally, never commit it
node scripts/smoke-test.mjs        # live Gemini + Kling check
node scripts/validate-concept.mjs  # offline rule check
node scripts/validate-workflows.mjs
```
