import { getValidAccessToken } from './tokens.js';
import { OURA_API_BASE } from './tokens.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return res.status(401).json({ error: 'Not connected', connected: false });
    }
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const headers = { Authorization: `Bearer ${accessToken}` };
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
    res.status(200).json({
      connected: true,
      readiness: readiness.data || [],
      sleep: sleep.data || [],
      activity: activity.data || [],
      personal: personal || null,
    });
  } catch (e) {
    console.error('Oura data:', e?.message || e);
    res.status(401).json({ error: 'Not connected', connected: false });
  }
}
