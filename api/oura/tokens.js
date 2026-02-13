/**
 * Oura token storage for Vercel serverless (uses REDIS_URL from linked Redis).
 */
import { createClient } from 'redis';

const KEY = 'oura_tokens';

async function getClient() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const client = createClient({ url });
  client.on('error', () => {});
  await client.connect();
  return client;
}

export async function loadTokens() {
  let client;
  try {
    client = await getClient();
    if (!client) return null;
    const raw = await client.get(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  } finally {
    if (client) await client.quit();
  }
}

export async function saveTokens(tokens) {
  let client;
  try {
    client = await getClient();
    if (!client) return;
    await client.set(KEY, JSON.stringify(tokens));
  } catch (e) {
    console.error('Oura saveTokens:', e);
  } finally {
    if (client) await client.quit();
  }
}

export async function clearTokens() {
  let client;
  try {
    client = await getClient();
    if (!client) return;
    await client.del(KEY);
  } catch (e) {
    console.error('Oura clearTokens:', e);
  } finally {
    if (client) await client.quit();
  }
}

const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';
const OURA_API_BASE = 'https://api.ouraring.com';

export async function getValidAccessToken() {
  const CLIENT_ID = process.env.OURA_CLIENT_ID;
  const CLIENT_SECRET = process.env.OURA_CLIENT_SECRET;
  const tokens = await loadTokens();
  if (!tokens?.refresh_token || !CLIENT_ID || !CLIENT_SECRET) return null;
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
    await clearTokens();
    return null;
  }
  const data = await res.json();
  const newTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refresh_token,
    expires_at: data.expires_in ? now + data.expires_in : null,
  };
  await saveTokens(newTokens);
  return newTokens.access_token;
}

export { OURA_API_BASE };
