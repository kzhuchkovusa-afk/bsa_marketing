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

## Not wired up yet (TODO)

- The **"Book Evaluation Lesson" buttons** and the **booking quiz** do not submit
  anywhere yet. They need to be connected to a destination — e.g. a CRM (Kommo),
  Calendly, a form endpoint (Formspree / Netlify Forms), or a WhatsApp link.
- No analytics / pixel installed yet (Google Analytics, Meta Pixel).

## Deploy

Any static host works. Two easy options:

- **GitHub Pages**: push to GitHub, then Settings → Pages → deploy from the default
  branch (root). The site will be served from `index.html`.
- **Netlify / Cloudflare Pages**: drag-and-drop the folder, or connect the repo.
  No build command is needed; the publish directory is the project root.

## Credits

Photos and logo: Bridgeview Soccer Academy. Type: Archivo (Google Fonts, OFL).
