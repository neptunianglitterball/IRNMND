/**
 * Oura token storage for Vercel serverless.
 * Uses Upstash REST only. Accepts either:
 * - UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or
 * - storage_KV_REST_API_URL + storage_KV_REST_API_TOKEN (Vercel when project is linked to Upstash store).
 */
import { Redis } from '@upstash/redis';

const KEY = 'oura_tokens';

function getRedis() {
  // Standard Upstash, or Vercel-linked store (names can be storage_KV_* or STORAGE_KV_*)
  let url = process.env.UPSTASH_REDIS_REST_URL || process.env.storage_KV_REST_API_URL || process.env.STORAGE_KV_REST_API_URL || process.env.KV_REST_API_URL;
  let token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.storage_KV_REST_API_TOKEN || process.env.STORAGE_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token || !String(url).trim().startsWith('http')) return null;
  url = String(url).trim();
  token = String(token).trim();
  return new Redis({ url, token });
}

export async function loadTokens() {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(KEY);
    return raw != null ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
  } catch {
    return null;
  }
}

export async function saveTokens(tokens) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(KEY, JSON.stringify(tokens));
  } catch (e) {
    console.error('Oura saveTokens:', e);
  }
}

export async function clearTokens() {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(KEY);
  } catch (e) {
    console.error('Oura clearTokens:', e);
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
