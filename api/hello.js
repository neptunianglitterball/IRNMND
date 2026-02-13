// Minimal test: if this returns 200, the api folder is deployed.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ ok: true, message: 'API is working' });
}
