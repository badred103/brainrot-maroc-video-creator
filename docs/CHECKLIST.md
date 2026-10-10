# Progress checklist

Updated after each phase. Status values: DONE / PARTIAL / BLOCKED (reason).

## 1. TikTok Developer Organization - BLOCKED (needs your login)

- [ ] Register at developers.tiktok.com
- [ ] Complete identity / entity verification
- [ ] Status: verified

Nothing I can do without your TikTok login and verification.

## 2. TikTok App + Content Posting API - BLOCKED (needs your login)

- [ ] App created: name, category, description, platform Web, 512x512 icon
- [ ] Login Kit enabled
- [ ] Content Posting API enabled
- [ ] Scope `video.upload` requested
- [ ] Scope `video.publish` requested **only after approval**
- [ ] Privacy Policy URL set
- [ ] Terms of Service URL set
- [ ] Redirect URI set (public HTTPS)
- [ ] Your account added as test user
- [ ] Demo video recorded (real flow, no staging)
- [ ] Submitted for review

See `docs/TIKTOK-APP.md` for the exact values.

## 3. GitHub repository - DONE

- [x] Repo: https://github.com/badred103/brainrot-maroc-video-creator (public)
- [x] Contains site, workflows, docs, scripts
- [x] Existing TikTok domain-verification file preserved at repo root
- [x] `.gitignore` excludes `.env`, tokens, `output/`

## 4. Terms / Privacy website - DONE (one placeholder left)

- [x] `index.html` - overview + short description of the tool
- [x] `privacy.html` - full Privacy Policy
- [x] `terms.html` - full Terms of Service
- [x] No secrets, no personal data, no analytics
- [ ] **You must do:** replace `REPLACE_WITH_CONTACT_EMAIL` in both files

## 5. GitHub Pages - DONE

- [x] Pages enabled, source = `main` branch, path `/`
- [x] Site live: https://badred103.github.io/brainrot-maroc-video-creator/
- [x] Privacy: https://badred103.github.io/brainrot-maroc-video-creator/privacy.html
- [x] Terms: https://badred103.github.io/brainrot-maroc-video-creator/terms.html
- [x] HTTPS enforced
- [x] Both policy URLs are linked from the homepage nav

## 6. TikTok OAuth + n8n connection - PARTIAL

- [x] OAuth start webhook (returns the TikTok authorise link)
- [x] OAuth callback webhook (exchanges code, stores tokens)
- [x] Refresh-token flow with automatic renewal before expiry
- [x] Tokens kept in n8n workflow static data, never in files or this repo
- [x] No password is ever requested
- [ ] **You must do:** create the app, put client key/secret into n8n variables
- [ ] **You must do:** give n8n a public HTTPS URL for the callback
- [ ] Activate workflow `03` and run the OAuth flow once

## 7. Kling generation workflow test - PARTIAL

- [x] Workflow `02` built: create task -> poll -> return URL, status, error
- [x] 9:16 aspect ratio, duration configurable (5 or 10s)
- [x] Poll budget and timeout handled
- [x] Imports cleanly into real n8n 2.35.7
- [x] `scripts/smoke-test.mjs` ready for a live end-to-end Kling call
- [ ] **You must do:** add your Kling API key (credential or `.env`), then run
      the smoke test. Not executed here: no key available.

## 8. TikTok upload / direct-post test - BLOCKED (needs OAuth)

- [x] Workflow `03` built: draft (inbox) path and direct-post path
- [x] Draft path uses `video.upload` -> video lands in TikTok inbox as a draft
- [x] Direct-post path gated behind explicit human confirmation
- [x] Status polling and error reporting
- [ ] **You must do:** complete phase 6 first

## Requirements coverage

| # | Requirement | Status |
| --- | --- | --- |
| 1 | n8n as automation platform | DONE |
| 2 | Gemini agent: prompt, Darija VO <=75w, caption <=120c, 3-5 hashtags with the 3 required, safety check | DONE (generated + enforced in code) |
| 3 | Moroccan everyday settings, no stereotypes/hate/sexual/dangerous/copyright/copying | DONE (in the system prompt + validation gate) |
| 4 | Daily 20:30 Africa/Casablanca | DONE (cron + workflow timezone) |
| 5 | Kling prompt sent to a Kling text-to-video workflow | DONE |
| 6 | Kling: create, poll, return URL + status + error, 9:16 | DONE |
| 7 | No keys/tokens printed, stored publicly, or repeated | DONE (credentials + masked previews only) |
| 8 | TikTok official portal, Login Kit, Content Posting API, OAuth, no password, refresh | DONE in design; BLOCKED on your portal login |
| 9 | GitHub Pages site with Privacy, Terms, description, no secrets | DONE |
| 10 | Policy URLs added to TikTok app | BLOCKED on portal access (URLs ready) |
| 11 | All required app fields + demo video | BLOCKED on portal access (values ready in `docs/TIKTOK-APP.md`) |
| 12 | Submit for review only when truthful and complete | BLOCKED - not submitted |
| 13 | Drafts via `video.upload` until direct post is approved | DONE (default mode is INBOX) |
| 14 | Explicit confirmation before any public post | DONE (Wait-on-webhook approval gate) |
| 15 | Test with one safe video and report | PARTIAL - see `docs/TEST-REPORT.md` |
| 16 | No promises of views/income | DONE (stated on the site and in the Terms) |
