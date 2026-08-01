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

## Contact form setup (Web3Forms)

The contact form currently points to Web3Forms' shared endpoint with a placeholder
access key:

```
access_key = "YOUR_ACCESS_KEY"
```

To make it live:

1. Go to [web3forms.com](https://web3forms.com) and enter `davis.nettech@gmail.com`
   to get a free access key (free tier: 250 submissions/month, no account/dashboard
   needed — the key is emailed to you immediately).
2. In `index.html`, find the `<form id="contactForm" ...>` tag and replace
   `YOUR_ACCESS_KEY` in the hidden `access_key` input's `value` with your real key.
3. Submit a test message from the live site once and confirm it arrives by email.

The form includes a honeypot field (`botcheck`) for basic spam filtering and sets
the reply-to address to whatever the visitor enters, so replying to the
notification email goes straight to them.

To also route submissions to a second person (e.g. a business partner) without
paying for Web3Forms' Pro CC-email feature, set up a Gmail filter instead:
**Settings → Filters and Blocked Addresses → Create a new filter**, matching
`subject:("New inquiry from IntegralAI website")`, with the action **Forward to**
their (pre-verified) email address. This only forwards form submissions, not your
whole inbox.

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
