# IronMind – AI Coach

Precision fat-loss coach app: 1800 kcal target, AI-generated nutrition & training plans (Gemini), supplement checklist, and macro tracking.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Add your Gemini API key**  
   In `src/App.jsx`, set:
   ```js
   const apiKey = "YOUR_GEMINI_API_KEY";
   ```
   Get a key at [Google AI Studio](https://aistudio.google.com/apikey).

3. **Run the app**
   ```bash
   npm run dev
   ```
   This starts both the Vite dev server (http://localhost:5173) and the Oura API server (port 3001). Open the app URL in your browser.

4. **Oura (optional, real-time)**  
   To use live Oura Ring data instead of a screenshot:
   - Create an app at [Oura Developer](https://cloud.ouraring.com/oauth/applications) and get **Client ID** and **Client Secret**.
   - Copy `.env.example` to `.env` and set `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`, and `OURA_REDIRECT_URI` (e.g. `http://localhost:5173/` — must match the redirect URI in your Oura app).
   - Restart `npm run dev`. On the check-in screen, click **Connect Oura (real-time)** to authorize; readiness, sleep, and activity are then sent to the coach when you launch a plan.

## Features

- **Check-in**: Senolytic mode, pharma (Retatrutide / HGH), day type (workout/rest), push/pull/individual focus, cardio block, energy slider, **Oura connect (real-time)** or optional screenshot fallback.
- **Launch Coach AI**: Generates a 1800 kcal plan (macros, meals with gram weights, exercises) using your equipment and food list.
- **Workout view**: Live macro tracker (P/C/F remaining), feeding protocol, exercise list with swap-via-AI, Bio-Stack supplement checklist.
- **Recap**: Macro accuracy bars and energy balance; XP/level persisted in `localStorage`.

## Stack

- React 18 + Vite
- Tailwind CSS + tailwindcss-animate
- Lucide React icons
- Gemini API (`gemini-2.5-flash-preview-09-2025`)
- Express server for Oura OAuth2 + data proxy (no secrets in frontend)

## Deploy on Vercel (with Oura in production)

The main app’s `api/` folder often returns 404 on Vercel (Vite/static deploy). Use **two Vercel projects**: one for the frontend, one for the Oura API.

### Project 1: Frontend (existing – ironmind-coach)

1. Push the repo and deploy as usual. Build: `npm run build`, Output: `dist`. Framework: Vite is fine.
2. **Environment variable:** Add `VITE_OURA_API_URL` = `https://YOUR_API_PROJECT_DOMAIN` (no trailing slash). Example: `https://ironmind-coach-api.vercel.app`. This is the URL of **Project 2** below.
3. Redeploy after setting the variable.

### Project 2: Oura API (new – e.g. ironmind-coach-api)

1. In Vercel: **Add New** → **Project** → import the **same repo**.
2. Set **Root Directory** to **`api-vercel`** (the folder that contains only the API).
3. **Build:** Framework **Other**. Build Command: leave empty or `echo "No build"`. Output Directory: empty.
4. **Environment variables:** Same as before: `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`, `OURA_REDIRECT_URI`, `OURA_FRONTEND_URL`, and Upstash (link Storage or set `STORAGE_KV_REST_API_URL` / `STORAGE_KV_REST_API_TOKEN`).
   - `OURA_REDIRECT_URI` = `https://YOUR_API_PROJECT_DOMAIN/api/oura-callback` (e.g. `https://ironmind-coach-api.vercel.app/api/oura-callback`).
   - `OURA_FRONTEND_URL` = `https://ironmind-coach.vercel.app` (your frontend URL).
5. In the **Oura** app, set redirect URI to `https://YOUR_API_PROJECT_DOMAIN/api/oura-callback`.
6. Deploy. Then open `https://YOUR_API_PROJECT_DOMAIN/api/oura-status` – you should get JSON, not 404.

See **api-vercel/README.md** for a step-by-step checklist.

## Scripts

- `npm run dev` – Vite + Oura server (proxy `/api` to backend)
- `npm run dev:frontend` – Vite only
- `npm run dev:server` – Oura API server only
- `npm run build` – production build
- `npm run preview` – preview production build
