\import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ПРИВАТНЫЙ КЛЮЧ (НОВЫЙ, из генерации)
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIHDHlU83kZ6RGTZAYIPoYbI2OG5Frb10qzpbsNJVwtaq
-----END PRIVATE KEY-----`;

const usedNonces = new Set();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  // Простая проверка токена (в реальности проверяй в Firebase)
  if (!token || token.length < 10) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const jarPath = path.join(process.cwd(), 'public', 'downloads', 'AuraClient.jar');
    
    // Проверяем, существует ли файл
    if (!fs.existsSync(jarPath)) {
      console.error('❌ JAR не найден:', jarPath);
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const jarBuffer = fs.readFileSync(jarPath);
    const jarHash = crypto.createHash('sha256').update(jarBuffer).digest('hex');
    const jarSize = jarBuffer.length;
    const timestamp = Date.now();
    const expiresAt = timestamp + 60 * 1000; // 1 минута
    const nonce = crypto.randomBytes(16).toString('hex');

    // Каноничный JSON
    const payload = JSON.stringify({
      version: "1.0.0",
      url: "https://aura-client-sites.vercel.app/downloads/AuraClient.jar",
      hash: jarHash,
      size: jarSize,
      timestamp: timestamp,
      expiresAt: expiresAt,
      nonce: nonce
    });

    // Подпись
    const sign = crypto.createSign('SHA256');
    sign.update(payload);
    sign.end();
    const signature = sign.sign(PRIVATE_KEY, 'base64');

    return res.status(200).json({
      payload: payload,
      signature: signature
    });
    
  } catch (error) {
    console.error('❌ Ошибка манифеста:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}