# MergeFlow Starter — Full UI (Vercel-friendly)

This contains the **full index.html UI** + a Vercel serverless backend.
Deploy both together on Vercel for the easiest setup.

## Deploy (all-in-one on Vercel)
1. Create a GitHub repo and upload **all files** from this folder.
2. On vercel.com → Add New → Project → Import Git Repository → Deploy.
   - Framework Preset: **Other**
   - Build Command: *(leave empty)*
   - Output Directory: *(leave empty)*
3. Open your site. Toggle **“Merge on server (beta)”** if you want the backend to merge files.
   (Works by default via `/api/merge`.)

If you instead host the frontend on GitHub Pages, set BACKEND_URL in index.html to your full Vercel URL.