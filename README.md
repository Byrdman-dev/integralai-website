# IntegralAI Website

A static marketing site for IntegralAI — AI integration for small and medium-sized
businesses. Plain HTML/CSS/JS, no build step, deployable directly to GitHub Pages.

## Structure

```
website/
├── index.html
├── css/styles.css
├── js/main.js       # nav, scroll reveal, stat counters, demo tabs, contact form
├── js/demos.js       # RAG assistant + AI receptionist simulated demos
├── assets/favicon.svg
└── README.md
```

## Run locally

No build tools required. Either:

- Open `index.html` directly in a browser, or
- Serve it locally (recommended, avoids some browser file:// restrictions):

```bash
npx serve .
```

then visit the printed local URL.

## Contact form setup (Formspree)

The contact form currently points to a placeholder Formspree endpoint:

```
https://formspree.io/f/YOUR_FORM_ID
```

To make it live:

1. Go to [formspree.io](https://formspree.io) and sign up (free tier: 50 submissions/month).
2. Create a new form and set the notification email to `davis.nettech@gmail.com`.
3. Copy the form ID Formspree gives you (looks like `xayzabcd`).
4. In `index.html`, find the `<form id="contactForm" ...>` tag and replace
   `YOUR_FORM_ID` in the `action` attribute with your real form ID.
5. Submit a test message from the live site once and confirm it in Formspree's
   dashboard (first submission from a new form usually requires a one-time
   confirmation click).

The form includes a honeypot field (`_gotcha`) for basic spam filtering and sets
the reply-to address to whatever the visitor enters, so replying to the
notification email goes straight to them.

## Demos

Both demos in the "See it in action" section run entirely client-side —
no API keys, no backend, nothing sent anywhere:

- **RAG Knowledge Assistant** — simple keyword-matching retrieval against a small
  FAQ knowledge base defined in `js/demos.js`, with source citations, to illustrate
  the retrieve-then-answer pattern.
- **AI Voice Receptionist** — a scripted call-flow state machine (greeting → menu →
  booking/FAQ/message → confirmation) that uses the browser's built-in
  `speechSynthesis` API to actually speak each line aloud.

Both are clearly labeled "Simulated demo" in the UI. To swap in real, live demos
later (e.g. actual hosted RAG or voice agents), replace the relevant panel content
in `index.html`'s `#demos` section with an embed or link-out, and remove the
corresponding logic from `js/demos.js`.

## Deploying to GitHub Pages

1. Create a new GitHub repository (public, since GitHub Pages on the free tier
   requires a public repo unless you have GitHub Pro/Enterprise).
2. From this `website/` folder:

   ```bash
   git init
   git add .
   git commit -m "Initial IntegralAI site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

3. On GitHub, go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`.
5. Save. GitHub will publish the site at:

   ```
   https://<your-username>.github.io/<repo-name>/
   ```

6. (Optional) To use a custom domain, add a `CNAME` file to the repo root
   containing your domain, and configure DNS per
   [GitHub's custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Editing content

- Copy, service descriptions, and section text live directly in `index.html`.
- Colors, fonts, spacing, and effects are controlled by CSS custom properties at
  the top of `css/styles.css` (`:root { ... }`) — change the palette there rather
  than hunting through individual rules.
- The FAQ knowledge base for the RAG demo and the call script for the receptionist
  demo are both plain JS data structures in `js/demos.js`.
