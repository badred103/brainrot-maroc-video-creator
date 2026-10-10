# Test report

Ran 2026-10-10, n8n at `http://localhost:5678` (not modified - no access yet),
workflow validation done against a locally installed **n8n 2.35.7**.

Tags: `[measured]` = produced by running something just now;
`[not-tested]` = built but not executed.

## What was tested

| Test | Method | Result |
| --- | --- | --- |
| Workflow JSON parses | `node scripts/validate-workflows.mjs` | 3/3 parse, 0 failures `[measured]` |
| Node graph integrity | same script: unique names, every connection target exists, no orphans, output-index bounds | 0 failures `[measured]` |
| Real n8n import (their version) | `n8n import:workflow` against the user's installed n8n 2.42.6 with an isolated temp user folder | 3/3 "Successfully imported" `[measured]` |
| No secrets embedded | regex scan for `sk-`, `AIza`, `Bearer <long>`, private-key blocks, `client_secret=<long>` | 0 hits in all 3 files `[measured]` |
| Concept rule gate | `node scripts/validate-concept.mjs` on `output/sample-concept.json` | PASS `[measured]` |
| App icon 512x512 | `python scripts/make-app-icon.py` | PNG 512x512 RGBA, original artwork `[measured]` |
| GitHub Pages reachable | HTTP GET on the three URLs | 200 OK `[measured]` |
| Live Gemini call | `scripts/smoke-test.mjs` | **not run** - no API key `[not-tested]` |
| Live Kling generation | `scripts/smoke-test.mjs` | **not run** - no API key `[not-tested]` |
| Real TikTok upload | requires OAuth | **not run** - blocked `[not-tested]` |

## Concept gate, measured

```
voiceover words : 50   (limit 75)    PASS
caption chars   : 47   (limit 120)   PASS
hashtags        : #Morocco #Maroc #TikTokMaroc #Darija #BrainrotMaroc   (3-5, all 3 required present)  PASS
clips           : 3
safety.passed   : true
RESULT: concept passes every rule and would be sent to Kling.
```

Sample concept written for this test: *L'Hanout Dyal 3 A.M.* - a customer asks
a late-night neighbourhood shop for something that fixes bad decisions.
Fictional characters, everyday setting, no politics, religion, violence,
stunts, brands or real-person likeness.

## Bugs found and fixed during validation

Real defects, caught by running the validators - not by reading the code:

1. `03` had two stray connection keys with trailing spaces
   (`"Draft (Inbox) Or Direct Post? "` and `"Prepare Post Payload "`) that
   referenced nodes that do not exist. Removed.
2. `03` used a `Merge` node to rejoin the token-refresh branch. Only one input
   ever carries data, and n8n's Merge returns nothing when an input is empty -
   the workflow would have stalled on every run. Replaced with direct
   connections from both branches.
3. `Merge Post Init` in `03` had **no input 0**: both init nodes were wired to
   input 1. Wired `Prepare Post Payload` to input 0.
4. Every `Merge` node used `combineBy: "position"`. The installed n8n Merge v3
   enum is `combineAll | combineByFields | combineByPosition | combineBySql`,
   so the value would not have resolved. Changed to `combineByPosition`.
5. `If` node `notEmpty` operator in `01` was missing `singleValue: true`.
6. All three workflows were missing the top-level `id` field; n8n's importer
   rejects them with `NOT NULL constraint failed: workflow_entity.id`. Added.

## Which numbered requirements are complete

**Complete:** 1, 2, 3, 4, 5, 6, 7, 9, 13, 14, 16.

**Complete in design, blocked on your login:** 8, 10, 11, 12.

**Partial:** 15 - see below.

## Credentials and URLs you must provide manually

Nothing here can be done by me:

1. **TikTok Developer Portal** - log in, create/verify the organisation and app,
   enable Login Kit + Content Posting API, set the two policy URLs and a public
   HTTPS redirect URI, add your account as a test user, record a real demo
   video, submit for review. Exact values: `docs/TIKTOK-APP.md`.
2. **TikTok Client Key + Client Secret** - paste into n8n variables
   `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`.
3. **A public HTTPS URL for n8n** - `localhost:5678` cannot be a TikTok
   redirect. Use n8n Cloud or a tunnel.
4. **Gemini API key** and **Kling API key** - into n8n credentials.
5. **A real contact email** - replace `REPLACE_WITH_CONTACT_EMAIL` in
   `privacy.html` and `terms.html` before submitting for review.
6. **Optional:** an n8n API key so I can import the workflows into your
   instance myself (Settings -> n8n API).

## Exact errors encountered

- `n8n import:workflow` -> `SQLITE_CONSTRAINT: NOT NULL constraint failed:
  workflow_entity.id` on all three files. Cause: missing workflow `id`. Fixed.
- `GET /rest/workflows` on `http://localhost:5678` -> `401` with and without an
  API key. Cause: no valid n8n API key available to me. Expected; unresolved.
- No other runtime errors, because no live API call could be made without keys.

## Was a video generated?

**No.** `[not-tested]`. No Kling key was available, so no render was attempted.

## Draft, private, or public?

**Nothing was published to TikTok at all.** No OAuth, no upload.

What the configuration will produce once keys exist:

- Default `POST_MODE=INBOX` -> **draft** in your TikTok inbox, nothing public.
  This is requirement 13 and it is the default.
- `POST_MODE=DIRECT_POST` with `PRIVACY_LEVEL=SELF_ONLY` -> a **private** post.
- `POST_MODE=DIRECT_POST` with `PRIVACY_LEVEL=PUBLIC` -> a **public** post, and
  the workflow stops to ask you first.

## Known limits, stated plainly

- **20-35 seconds is not reachable in one Kling call.** Kling returns 5s or 10s
  clips. The workflow generates 3 clips; stitching them into one file requires
  ffmpeg plus the TikTok `FILE_UPLOAD` source, which is not wired. Until it is,
  the daily run delivers a **10-second** clip, not 30 seconds.
- **No audio.** Kling text-to-video is silent. The Darija voiceover exists as a
  script only; TTS + mux is not wired.
- Model names (`kling-v1-6`, `gemini-2.5-flash`) are defaults. Confirm against
  your own console; if Kling rejects the model name the create call fails fast
  and reports the error.
- No claim of views, likes, followers or income is made anywhere.
