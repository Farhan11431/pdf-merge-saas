# MergeFlow Starter (PDF Merger — mini SaaS)

This is a beginner-friendly starter to run a PDF merger as a mini SaaS.

You have **two deployment options**:

---

## Option A — *Simplest*: Deploy everything on **Vercel** (frontend + API together)

1. Create a repo on GitHub and upload **all files** from this folder.
2. Go to vercel.com → **Add New → Project → Import Git Repository**.
3. Framework **Other** (no build needed). Deploy.
4. Open the Vercel URL (e.g. `https://your-app.vercel.app`).
   - The frontend will load from `index.html`.
   - The serverless API is at `/api/merge`.
   - The default config already points `BACKEND_URL` to `/api/merge`, so **server merge works instantly** when you toggle it on.

> You don’t need GitHub Pages for this option (your code is still on GitHub; the site runs on Vercel).

---

## Option B — Frontend on **GitHub Pages**, backend on **Vercel**

1. **Backend on Vercel**
   - Keep `api/merge.js` and `package.json` in a separate repo *or* the same repo.
   - Import that repo into Vercel and deploy.
   - Copy the backend URL: `https://YOUR-PROJECT.vercel.app/api/merge`.

2. **Frontend on GitHub Pages**
   - In the repo that hosts `index.html`, go to **Settings → Pages** → Source: *Deploy from a branch*, Branch: `main`, Folder: `/ (root)`, Save.
   - Get your public Pages URL.

3. **Connect the two**
   - Edit `index.html` → set `BACKEND_URL` to your full Vercel URL (e.g. `https://YOUR-PROJECT.vercel.app/api/merge`).
   - Toggle **“Merge on server (beta)”** in the UI when you want the backend to merge files.

---

## Local test (optional)

Just double‑click `index.html` to open locally. Client‑side merging works without any server.  
For server‑merge locally, you need to run the backend (Vercel dev) or deploy it first.

---

## Troubleshooting

- **CORS error** when frontend is on GitHub Pages: the backend sets `Access-Control-Allow-Origin: *`. If you want to lock it down, change it in `api/merge.js`.
- **Big files fail**: try fewer/smaller PDFs. Serverless functions have time/memory limits. For very large files, consider a non-serverless host later.
- **404 for /api/merge**: you’re likely on GitHub Pages (which can’t run Node) and haven’t set `BACKEND_URL` to the Vercel URL. Or you haven’t deployed the backend yet.
- **Nothing happens on merge**: open DevTools → Console for errors. Often it’s a bad URL or a missing file.

---

## Credits

- Merging done by `pdf-lib`
- Upload parsing on backend via `formidable`

License: MIT
