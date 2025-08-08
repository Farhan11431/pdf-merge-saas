# MergeFlow — Full Version (PDF Merger mini‑SaaS)

This is the complete version with:
- Beautiful UI (drag & drop, reorder, progress)
- Live pages counter
- Optional “Limit total pages”
- Client‑side merge (no server needed)
- Server merge via Vercel function (enforces page limit + returns X-Merged-Pages)

## Quick deploy — All-in-one on Vercel (recommended)
1) Create a new GitHub repo and upload **all files** from this folder.
2) Go to https://vercel.com → **Add New → Project → Import Git Repository** → Deploy
   - Framework Preset: **Other**
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
3) Open `https://YOUR-PROJECT.vercel.app`.
   - Client merge works instantly.
   - Toggle **“Merge on server (beta)”** to use the backend at `/api/merge`.

## Alternative — Frontend on GitHub Pages, backend on Vercel
1) Deploy this repo (or a copy with only frontend) to GitHub Pages (Settings → Pages → Deploy from branch → root).
2) Deploy the backend (`/api/merge.js` + `package.json`) to Vercel.
3) In `index.html`, set:
   const BACKEND_URL = "https://YOUR-PROJECT.vercel.app/api/merge";
   (instead of `/api/merge`).
4) Toggle **server mode** when you want the backend to merge.

## Sanity checks
- Visit `/api/merge` in your browser: you should see **Method Not Allowed** (405). That means the function exists.
- If you get 404 at root on Vercel, ensure files are at the repo root (not nested).

## Troubleshooting
- **White page**: you likely deployed the wrong `index.html`. Use the one in this zip.
- **CORS**: the backend allows `*` by default. Lock to your domain in `api/merge.js` when you go live.
- **Large files timeout**: serverless has limits. Consider a non‑serverless host later for huge PDFs.
- **Nothing happens**: open DevTools → Console for errors, and confirm `BACKEND_URL` if using GitHub Pages.