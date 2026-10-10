# TikTok Developer Portal setup

Everything below happens in your browser at **https://developers.tiktok.com**.
I cannot do any of it for you: it needs your TikTok login and, in places, your
phone. This document is the exact sequence.

> Verify each field label against the live portal - TikTok changes the UI
> without notice. The API endpoints and scope names below are the stable part.

## Step 1 - Organisation

1. Go to https://developers.tiktok.com and log in with the TikTok account you
   will post from.
2. Complete the organisation registration: legal entity type, country, contact
   email, and identity verification.
3. Status to reach: organisation **verified**.

## Step 2 - Create the app

1. **Apps -> Create app**.
2. Fill in:
   - **App name**: `Brainrot Maroc Video Creator`
   - **Category**: Entertainment / Media & Entertainment (pick closest available)
   - **Description**: paste this, it is truthful:

     > Automation for one Moroccan creator's own TikTok channel. It generates an
     > original short vertical comedy concept in Moroccan Darija each day,
     > renders a 9:16 video with an AI video model, and delivers it to the
     > account owner's TikTok inbox as a draft for review. Publishing is done by
     > the account owner. Uses Login Kit for OAuth and the Content Posting API
     > for upload.

   - **Platform**: Web
   - **App icon**: 512x512 PNG, no TikTok logo, no copyrighted art.
3. Save.

## Step 3 - Products

1. In the app, open **Products** and add:
   - **Login Kit** - required for OAuth.
   - **Content Posting API** - required for upload.
2. Under Content Posting API, request scopes:
   - `video.upload` - request now.
   - `video.publish` - **only request it once you are approved for it.** Requesting an
     unapproved scope causes authorisation failures. Leave it out at first.

## Step 4 - URLs

Fill these exactly:

| Field | Value |
| --- | --- |
| Privacy Policy URL | `https://badred103.github.io/brainrot-maroc-video-creator/privacy.html` |
| Terms of Service URL | `https://badred103.github.io/brainrot-maroc-video-creator/terms.html` |
| Redirect URI / Callback URL | `https://<your-public-n8n-host>/webhook/tiktok/oauth/callback` |

The redirect URI must be **public HTTPS** and must match, character for
character, the `TIKTOK_REDIRECT_URI` variable in n8n. `localhost` is rejected.

## Step 5 - Domain verification

The file `tiktokttB1XO2ClrdwV1jK0YXGJZ7bXmijBRcu.txt` is already at the root of
this repository and is already served by GitHub Pages. If the portal asks you
to verify the domain, use that file. Confirm it is reachable:

`https://badred103.github.io/brainrot-maroc-video-creator/tiktokttB1XO2ClrdwV1jK0YXGJZ7bXmijBRcu.txt`

## Step 6 - One thing you must fix before review

Both `privacy.html` and `terms.html` contain the placeholder
`REPLACE_WITH_CONTACT_EMAIL`. Replace it with a real email you control, then
commit and push. TikTok requires a working contact address. I did not invent
one for you.

```bash
# in privacy.html and terms.html
REPLACE_WITH_CONTACT_EMAIL   ->   your real email
```

## Step 7 - Test user

Add your own TikTok account as a **test user** in the app. Unaudited apps can
only be authorised by test users, which is exactly what you need for testing.

## Step 8 - Review

Only after steps 1-7 are complete and truthful:

- **Demo video**: screen-record the real flow - open the OAuth start page,
  authorise on TikTok, show the video arriving in the TikTok inbox as a draft,
  open the draft and publish it. No staged or fake footage.
- **Review description**: describe the daily single-concept generation, the
  automated safety gate, draft delivery, and that public posting requires the
  account owner's confirmation.
- Submit.

## After approval

1. Add `video.publish` to the app scopes (if approved).
2. In n8n, set `TIKTOK_SCOPES=user.info.basic,video.upload,video.publish`.
3. Re-run the OAuth flow so the new scope is granted.
4. Set `POST_MODE=DIRECT_POST` and `PRIVACY_LEVEL` to `SELF_ONLY` first.

Even then, the workflow will stop and ask you for explicit confirmation before
each public post. That is deliberate.
