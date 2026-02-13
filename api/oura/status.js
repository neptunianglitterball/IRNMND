import { loadTokens } from './tokens.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const tokens = await loadTokens();
    res.status(200).json({ connected: !!(tokens?.refresh_token) });
  } catch (err) {
    console.error('Oura status:', err?.message || err);
    res.status(200).json({ connected: false });
  }
}
