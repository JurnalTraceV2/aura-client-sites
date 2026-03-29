import manifestHandler from './launcher/manifest.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const incoming = req.body && typeof req.body === 'object' ? req.body : {};
  const mappedReq = {
    ...req,
    body: {
      sessionToken: incoming.sessionToken || incoming.token,
      hwidHash: incoming.hwidHash || incoming.hwid
    }
  };

  return manifestHandler(mappedReq, res);
}
