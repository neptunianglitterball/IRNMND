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

1. Push the repo to GitHub and import it in [Vercel](https://vercel.com). Build: `npm run build`, Output: `dist`.
2. **Environment variables** (Vercel → Project → Settings → Environment Variables):
   - `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET` from your [Oura app](https://cloud.ouraring.com/oauth/applications).
   - `OURA_REDIRECT_URI` = `https://YOUR_VERCEL_DOMAIN.vercel.app/api/oura/callback` (replace with your real domain).
   - `OURA_FRONTEND_URL` = `https://YOUR_VERCEL_DOMAIN.vercel.app` (no trailing slash).
3. **Upstash Redis (required for Oura in production):** In the Vercel project go to **Integrations** → **Upstash Redis** → Add / Connect and link it to this project. This adds `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` automatically. Do not use a different Redis (e.g. Redis Labs with `REDIS_URL`) — only Upstash REST is supported so Oura tokens work in serverless.
4. In the **Oura** app settings, add the redirect URI: `https://YOUR_VERCEL_DOMAIN.vercel.app/api/oura/callback`.
5. Redeploy. "Connect Oura" on the live site will then work.

## Scripts

- `npm run dev` – Vite + Oura server (proxy `/api` to backend)
- `npm run dev:frontend` – Vite only
- `npm run dev:server` – Oura API server only
- `npm run build` – production build
- `npm run preview` – preview production build
