# Bridgeview Soccer Academy — Landing Page

A single-page landing for **Bridgeview Soccer Academy** (Brooklyn, NY), promoting a
free evaluation lesson for kids aged 5–7. Static site: plain HTML, CSS, and a small
amount of vanilla JavaScript — no build step, no framework, no dependencies.

## Quick start

It's a static site, so just open it — but to make the JavaScript (icons, quiz,
scroll animations) and relative asset paths work reliably, serve the folder over
HTTP rather than opening the file directly:

```bash
# from the project root
python3 -m http.server 8000
# then open:
#   http://localhost:8000/index.html      <- the page
#   http://localhost:8000/preview.html    <- desktop/mobile device preview
```

> Opening `index.html` straight from disk (file://) works too, but some browsers
> restrict JavaScript and local file access in that mode. Serving over HTTP avoids
> all of that.

## Project structure

```
bridgeview-landing/
├── index.html          # the landing page (all markup, CSS and JS inline)
├── preview.html        # dev-only: device toggle (loads index.html in a frame)
├── assets/
│   ├── img/            # photos (webp) + logo (png)
│   └── fonts/          # Archivo web fonts (woff2, latin subset)
├── README.md
└── .gitignore
```

## How it's built (notes for editing)

- **Everything visual lives in `index.html`.** CSS is in a `<style>` block in the
  `<head>`; the page logic is in a single `<script>` at the end of `<body>`.
- **Sections**, top to bottom: header, hero, the "screen time" problem, how a lesson
  works, what changes, summer offer, why-us / stats, photo gallery, reviews,
  guarantee, bonus, and a multi-step booking quiz, plus a sticky mobile CTA.
- **Scroll animations** use an `IntersectionObserver`. They are wrapped in a
  *no-JS safety guard*: an inline script adds a `js` class to `<html>`, and content
  is only hidden-for-animation while that class is present. If JavaScript is off,
  everything stays fully visible — animations can never hide the content.
- **Icons and the quiz** are set up by the script in `init()`. They require
  JavaScript (a real browser) to work.
- **Responsive design**: fluid type via `clamp()`, with breakpoints at 980 / 680 /
  600 / 400 px. The photo gallery keeps its portrait tile tall at every width so
  photos aren't cropped into thin strips.

## Lead capture — booking quiz (Netlify Forms → Kommo)

The booking quiz **is wired to [Netlify Forms](https://docs.netlify.com/forms/setup/)**
and to **Kommo** (via the Netlify Function below). It is a real
`<form name="evaluation-booking" data-netlify="true">`. On submit it POSTs to both
endpoints (with a hard 4 s timeout), then **redirects to `/thank-you`** — a separate
URL so ad platforms can count the conversion by page load.

The quiz is a **4-step flow** (age → experience → location → contact) with a
soccer-field progress bar. Fields sent with every submission:

| Field name    | Source                                  |
|---------------|-----------------------------------------|
| `name`        | "Your name" input                       |
| `phone`       | "Phone" input                           |
| `email`       | "Email" input                           |
| `age`         | Step 1 answer, e.g. `5-7` (filled by JS) |
| `experience`  | Step 2 answer, e.g. `none` (filled by JS)|
| `location`    | Step 3 answer, e.g. `yes` (filled by JS) |
| `bot-field`   | Honeypot (hidden anti-spam)             |

### Thank-you page & conversion tracking

After submission the visitor lands on **`thank-you.html`** (served at `/thank-you`,
`noindex`). Analytics are split so conversions aren't double-counted: the funnel
events (`scroll_to_quiz`, `quiz_start`, `quiz_step_experience`, `quiz_step_location`,
`quiz_contact_form`, plus Pixel `ViewContent`/`InitiateCheckout`) fire on the main
page, while the **`generate_lead`** (GA4) and **`Lead`** (Pixel) conversion fires
**only on `/thank-you`**, guarded by a `sessionStorage` flag so direct hits and F5
don't create phantom conversions. The Meta Pixel loader is present as a commented
block on both pages — uncomment and drop in the ID when the targeter provides it.

**What works automatically once deployed to Netlify:**

1. Form detection is on by default — after the first deploy the form appears under
   **Site → Forms** in the Netlify dashboard, and submissions are stored there.
2. Add an email notification: **Site configuration → Forms → Form notifications →
   Email notification** so leads also land in an inbox immediately.

**Getting the leads into Kommo (CRM):** done directly via a Netlify Function —
`netlify/functions/kommo-lead.js`. On submit the quiz POSTs the lead as JSON to
`/.netlify/functions/kommo-lead`, which:

1. creates a **Contact** (name, phone, email);
2. creates a **Lead** in pipeline `10044839` / status "New lead" `77725931`,
   responsible user `12327415`, tagged `Landing Quiz`, with custom fields
   Age (text), Soccer Experience (enum), Location (enum) and Source = "Website lead";
3. attaches a human-readable **note** with the full questionnaire.

Error handling: retries once on HTTP 429; on 5xx/network errors it still returns
`200` so the visitor sees the success screen, and the same submission is kept in
**Netlify Forms** as a backup (the quiz posts to both in parallel).

**Required setup — Netlify env var (the only secret):**

```
KOMMO_TOKEN = <long-lived Kommo API token>
```

Set it in **Netlify → Site settings → Environment variables**. It is read only on
the server (`process.env.KOMMO_TOKEN`) and is never exposed to the browser. All
other Kommo IDs are non-secret and hardcoded in the function. See `.env.example`.
Functions run on Node 20 (configured in `netlify.toml`); no npm dependencies.

- No analytics / pixel installed yet (Google Analytics, Meta Pixel).

## Deploy

Any static host works. Two easy options:

- **GitHub Pages**: push to GitHub, then Settings → Pages → deploy from the default
  branch (root). The site will be served from `index.html`.
- **Netlify / Cloudflare Pages**: drag-and-drop the folder, or connect the repo.
  No build command is needed; the publish directory is the project root.

## Credits

Photos and logo: Bridgeview Soccer Academy. Type: Archivo (Google Fonts, OFL).
