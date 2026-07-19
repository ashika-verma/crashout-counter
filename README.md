# 🚨 Crashout Counter

A workplace-safety sign for your emotional stability. Press the big red button when
you're crashing out, and the board — *"THIS FACILITY HAS OPERATED [n] DAYS SINCE THE
LAST CRASHOUT"* — resets to zero in shame. Open the page any time and it counts up
live, estimates how many crashouts you've *heroically resisted*, and tracks your
longest streak.

No build step, no framework, no server. Just three static files.

## Files

| File | Purpose |
|------|---------|
| `index.html` | markup |
| `styles.css` | the hazard-sign look |
| `app.js` | timer, stats, chaos animation, optional sync |
| `.nojekyll` | tells GitHub Pages to serve files as-is |

## Where does the data live?

**By default: only in your browser** (`localStorage`). Zero setup — it just works.
The tradeoff is that it's per-browser: a different device or a cleared cache starts fresh.

**Optionally: a private GitHub Gist** becomes your "backend" so your crashouts follow
you everywhere — still no server or hosting bill. Click **☁ sync & settings** in the
app and follow the steps. In short:

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Generate a token with **Account permissions → Gists → Read and write**.
3. Paste it into the app. Leave the Gist ID blank and it creates a private gist for you.

The token is stored only in your browser's `localStorage` and is sent only to
`api.github.com`. Because a purely static site can't hide secrets, use a
**fine-grained token scoped to Gists only** — never a classic token with broad access.

## Deploy to GitHub Pages

```bash
cd crashout-counter
git init && git add . && git commit -m "🚨 crashout counter"
git branch -M main
git remote add origin https://github.com/<you>/crashout-counter.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**,
pick `main` / `root`, save. Your site goes live at
`https://<you>.github.io/crashout-counter/` within a minute or two.

## Run locally

Open `index.html` directly, or serve it (needed only if you use Gist sync, since
`fetch` wants a real origin):

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```
