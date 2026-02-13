import { saveTokens } from './tokens.js';

const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';

export default async function handler(req, res) {
  const { code, error } = req.query;
  const FRONTEND_URL = (process.env.OURA_FRONTEND_URL || '').replace(/\/$/, '') || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173';
  const REDIRECT_URI = process.env.OURA_REDIRECT_URI;
  const backToApp = (query) => res.redirect(`${FRONTEND_URL}${query ? `?${query}` : ''}`);

  if (error) return backToApp(`oura=error&message=${encodeURIComponent(error)}`);
  if (!code) return backToApp('oura=error&message=no_code');

  const CLIENT_ID = process.env.OURA_CLIENT_ID;
  const CLIENT_SECRET = process.env.OURA_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
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
  await saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_in ? now + data.expires_in : null,
  });
  return backToApp('oura=connected');
}
