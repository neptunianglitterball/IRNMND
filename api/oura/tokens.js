/**
 * Oura token storage for Vercel serverless.
 * Supports (1) Upstash REST: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * or (2) Native Redis: REDIS_URL (must start with redis:// or rediss://).
 */
import { createClient } from 'redis';
import { Redis } from '@upstash/redis';

const KEY = 'oura_tokens';

function useUpstashRest() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token && url.startsWith('http');
}

function useNativeRedis() {
  const url = (process.env.REDIS_URL || '').trim();
  return url && (url.startsWith('redis://') || url.startsWith('rediss://'));
}

async function getUpstashClient() {
  if (!useUpstashRest()) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

async function getNativeClient() {
  if (!useNativeRedis()) return null;
  const url = (process.env.REDIS_URL || '').trim();
  const client = createClient({ url });
  client.on('error', () => {});
  await client.connect();
  return client;
}

export async function loadTokens() {
  const upstash = await getUpstashClient();
  if (upstash) {
    try {
      const raw = await upstash.get(KEY);
      return raw != null ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    } catch {
      return null;
    }
  }
  let client;
  try {
    client = await getNativeClient();
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
  const upstash = await getUpstashClient();
  if (upstash) {
    try {
      await upstash.set(KEY, JSON.stringify(tokens));
    } catch (e) {
      console.error('Oura saveTokens:', e);
    }
    return;
  }
  let client;
  try {
    client = await getNativeClient();
    if (!client) return;
    await client.set(KEY, JSON.stringify(tokens));
  } catch (e) {
    console.error('Oura saveTokens:', e);
  } finally {
    if (client) await client.quit();
  }
}

export async function clearTokens() {
  const upstash = await getUpstashClient();
  if (upstash) {
    try {
      await upstash.del(KEY);
    } catch (e) {
      console.error('Oura clearTokens:', e);
    }
    return;
  }
  let client;
  try {
    client = await getNativeClient();
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
