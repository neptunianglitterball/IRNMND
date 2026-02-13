/**
 * Oura API proxy: OAuth2 flow + token storage + data endpoints.
 * Keeps client_id/client_secret on server; frontend only talks to /api/oura/*.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = join(__dirname, '.oura_tokens.json');

const OURA_AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize';
const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';
const OURA_API_BASE = 'https://api.ouraring.com';

const CLIENT_ID = process.env.OURA_CLIENT_ID;
const CLIENT_SECRET = process.env.OURA_CLIENT_SECRET;
const PORT = process.env.OURA_SERVER_PORT || 3001;
// Oura must redirect the browser HERE with ?code=... (register this exact URL in Oura app)
const REDIRECT_URI = process.env.OURA_REDIRECT_URI || `http://localhost:${PORT}/api/oura/callback`;
// After we exchange the code, we send the user back to the frontend
const FRONTEND_URL = (process.env.OURA_FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const SCOPES = 'personal daily';

function loadTokens() {
  if (!existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveTokens(tokens) {
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf8');
}

function clearTokens() {
  if (existsSync(TOKEN_FILE)) {
    try {
      unlinkSync(TOKEN_FILE);
    } catch (e) {
      writeFileSync(TOKEN_FILE, '{}');
    }
  }
}

async function getValidAccessToken() {
  const tokens = loadTokens();
  if (!tokens?.refresh_token) return null;
  let { access_token, refresh_token, expires_at } = tokens;
  const now = Math.floor(Date.now() / 1000);
  if (expires_at && now < expires_at - 60) return access_token;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const res = await fetch(OURA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = await res.json();
  const newTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refresh_token,
    expires_at: data.expires_in ? now + data.expires_in : null,
  };
  saveTokens(newTokens);
  return newTokens.access_token;
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/api/oura/auth-url', (req, res) => {
  if (!CLIENT_ID) {
    return res.status(500).json({ error: 'OURA_CLIENT_ID not configured' });
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
  });
  const url = `${OURA_AUTH_URL}?${params.toString()}`;
  res.json({ url });
});

app.get('/api/oura/callback', async (req, res) => {
  const { code, error } = req.query;
  const backToApp = (query) => res.redirect(`${FRONTEND_URL}${query ? `?${query}` : ''}`);
  if (error) {
    return backToApp(`oura=error&message=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return backToApp('oura=error&message=no_code');
  }
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return backToApp('oura=error&message=server_not_configured');
  }
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
  });
  const tokenRes = await fetch(OURA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error('Oura token exchange failed:', tokenRes.status, errText);
    return backToApp('oura=error&message=token_exchange_failed');
  }
  const data = await tokenRes.json();
  const now = Math.floor(Date.now() / 1000);
  saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_in ? now + data.expires_in : null,
  });
  backToApp('oura=connected');
});

app.get('/api/oura/status', (req, res) => {
  const tokens = loadTokens();
  res.json({ connected: !!(tokens?.refresh_token) });
});

app.get('/api/oura/data', async (req, res) => {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return res.status(401).json({ error: 'Not connected', connected: false });
  }
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const headers = { Authorization: `Bearer ${accessToken}` };
  try {
    const [readinessRes, sleepRes, activityRes, personalRes] = await Promise.all([
      fetch(`${OURA_API_BASE}/v2/usercollection/daily_readiness?start_date=${weekAgo}&end_date=${today}`, { headers }),
      fetch(`${OURA_API_BASE}/v2/usercollection/daily_sleep?start_date=${weekAgo}&end_date=${today}`, { headers }),
      fetch(`${OURA_API_BASE}/v2/usercollection/daily_activity?start_date=${weekAgo}&end_date=${today}`, { headers }),
      fetch(`${OURA_API_BASE}/v2/usercollection/personal_info`, { headers }),
    ]);
    const readiness = readinessRes.ok ? await readinessRes.json() : { data: [] };
    const sleep = sleepRes.ok ? await sleepRes.json() : { data: [] };
    const activity = activityRes.ok ? await activityRes.json() : { data: [] };
    let personal = null;
    if (personalRes.ok) {
      const p = await personalRes.json();
      personal = p.data ?? p;
    }
    res.json({
      connected: true,
      readiness: readiness.data || [],
      sleep: sleep.data || [],
      activity: activity.data || [],
      personal: personal || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message, connected: true });
  }
});

app.post('/api/oura/disconnect', (req, res) => {
  clearTokens();
  res.json({ connected: false });
});

app.listen(PORT, () => {
  console.log(`Oura API server at http://localhost:${PORT}`);
});
