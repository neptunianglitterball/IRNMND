const OURA_AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize';
const SCOPES = 'personal daily';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const CLIENT_ID = process.env.OURA_CLIENT_ID;
  const REDIRECT_URI = process.env.OURA_REDIRECT_URI;
  if (!CLIENT_ID || !REDIRECT_URI) {
    return res.status(500).json({ error: 'OURA_CLIENT_ID or OURA_REDIRECT_URI not configured' });
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
  });
  const url = `${OURA_AUTH_URL}?${params.toString()}`;
  res.status(200).json({ url });
}
