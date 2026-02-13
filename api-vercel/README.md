# IronMind Coach – Oura API (standalone)

This folder is a **separate Vercel project** so the Oura API routes actually get deployed (the main app’s `api/` folder was returning 404 on Vercel).

## Deploy as second Vercel project

1. **New project in Vercel**
   - Vercel Dashboard → **Add New** → **Project**.
   - Import the **same GitHub repo** as the main app.
   - When asked for root directory, set **Root Directory** to **`api-vercel`** (click Edit, enter `api-vercel`, Continue).

2. **Build settings**
   - **Framework Preset:** Other.
   - **Build Command:** leave empty or set to `echo "No build"`.
   - **Output Directory:** leave empty.
   - **Install Command:** `npm install` (default).

3. **Environment variables** (same as main app for Oura + Redis)
   - `OURA_CLIENT_ID`
   - `OURA_CLIENT_SECRET`
   - `OURA_REDIRECT_URI` = `https://<THIS_API_PROJECT_DOMAIN>/api/oura-callback`  
     Example: `https://ironmind-coach-api.vercel.app/api/oura-callback`
   - `OURA_FRONTEND_URL` = `https://ironmind-coach.vercel.app` (your main app URL)
   - Upstash: either link the same Upstash Redis (Storage) to this project, or set `STORAGE_KV_REST_API_URL` and `STORAGE_KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).

4. **Oura app**
   - In Oura Developer, set redirect URI to:  
     `https://<THIS_API_PROJECT_DOMAIN>/api/oura-callback`  
     (e.g. `https://ironmind-coach-api.vercel.app/api/oura-callback`).

5. **Main app**
   - In the **main** Vercel project (ironmind-coach), add env:
   - `VITE_OURA_API_URL` = `https://<THIS_API_PROJECT_DOMAIN>`  
     (e.g. `https://ironmind-coach-api.vercel.app`, no trailing slash).
   - Redeploy the main app so the frontend uses this API URL.

After deploy, open `https://<api-project>/api/oura-status` – you should get JSON, not 404.
