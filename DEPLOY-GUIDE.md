# Deploy SignalFlow to Vercel (Free, No Credit Card)

## What you need
- A GitHub account (free) — github.com
- A Vercel account (free) — vercel.com
- An Anthropic API key — console.anthropic.com

---

## STEP 1 — Put the files on GitHub

1. Go to **github.com** and sign in
2. Click the **+** icon (top right) → **"New repository"**
3. Name it: `signalflow`
4. Make it **Public**
5. Click **"Create repository"**

Now upload the files from this zip:
- Click **"uploading an existing file"** link on the page
- Drag in ALL files from this zip (keep the folder structure: `api/` folder, `public/` folder, `vercel.json`)
- Click **"Commit changes"**

---

## STEP 2 — Deploy on Vercel

1. Go to **vercel.com** and sign in with GitHub
2. Click **"Add New Project"**
3. Find your `signalflow` repo and click **"Import"**
4. Leave all settings as default
5. Click **"Deploy"**

It will deploy in about 30 seconds. You'll get a URL like `https://signalflow-abc123.vercel.app`

---

## STEP 3 — Add your Anthropic API key

1. In Vercel, go to your project → **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Name: `ANTHROPIC_API_KEY`
4. Value: your `sk-ant-...` key from console.anthropic.com
5. Click **"Save"**
6. Go to **Deployments** → click the three dots on your latest deployment → **"Redeploy"**

That's it. Your app is live permanently, for free.

---

## File structure in the zip

```
signalflow/
├── vercel.json          ← tells Vercel how to route requests
├── api/
│   ├── markets.js       ← fetches Polymarket, Kalshi, Manifold, Metaculus
│   └── analyze.js       ← proxies Claude AI (keeps your API key secret)
└── public/
    └── index.html       ← the full app UI
```

---

## Volume filter guide

The app has a volume filter at the top. Here's what each level means:

| Setting | What you see | Best for |
|---|---|---|
| Show all | Every market loaded | Exploring / research |
| $100k+ (default) | Markets with real participation | Daily use |
| $500k+ | Only highly liquid markets | High conviction trades only |
| $1M+ | Top 5-10 markets | Maximum signal quality |

**Rule of thumb:** Higher volume = more people have put real money on the outcome = more reliable signal.

---

## How the AI integration works

Your browser talks to YOUR Vercel server (`/api/analyze`).
Your server talks to Claude using your secret API key.
The API key never appears in the browser — it's safe.

```
Your Browser
    ↓ calls /api/analyze
Your Vercel Server (has secret API key)
    ↓ calls Anthropic
Claude AI
    ↓ returns trade ideas
Your Browser shows the results
```

---

## Updating the app later

If you want to change anything (e.g. add a new market source):
1. Edit the file on GitHub (click the file → pencil icon)
2. Commit the change
3. Vercel auto-deploys in ~20 seconds

No terminal needed, ever.
