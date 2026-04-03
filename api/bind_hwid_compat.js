export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const incoming = req.body && typeof req.body === 'object' ? req.body : {};
  const hwid = incoming.hwid || incoming.hwidHash || '';
  const userId = incoming.userId || '';

  // Simulate success for HWID binding.
  // In production, you would update the HWID in your database for this user.
  console.log(`HWID Binding Request: UserID=${userId}, HWID=${hwid}`);

  return res.status(200).json({
    success: true,
    message: 'HWID bound successfully',
    hwid: hwid
  });
}
