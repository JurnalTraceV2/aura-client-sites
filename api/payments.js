const crypto = require('crypto');
const https = require('https');

// YooKassa credentials
const SHOP_ID = process.env.YOOKASSA_SHOP_ID || 'YOUR_SHOP_ID';
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || 'YOUR_YOOKASSA_SECRET_KEY';

// Helper function to make YooKassa API requests
function yooKassaRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    console.log('YooKassa Request:', { method, path, data, SHOP_ID: SHOP_ID !== 'YOUR_SHOP_ID' });
    
    const auth = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');
    const options = {
      hostname: 'api.yookassa.ru',
      port: 443,
      path: `/v3${path}`,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': generateIdempotenceKey()
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log('YooKassa Response:', { status: res.statusCode, body });
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.description || `HTTP ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          reject(new Error(`Invalid response: ${body}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error('YooKassa Request Error:', e);
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function generateIdempotenceKey() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Payment tiers configuration
const PAYMENT_TIERS = {
  beta: {
    amount: 99,
    currency: 'RUB',
    description: 'Aura Client - Beta РґРѕСЃС‚СѓРї',
    subscription: 'beta'
  },
  '1_month': {
    amount: 299,
    currency: 'RUB',
    description: 'Aura Client - 1 РјРµСЃСЏС† Premium',
    subscription: 'premium'
  },
  lifetime: {
    amount: 1999,
    currency: 'RUB',
    description: 'Aura Client - Lifetime Premium',
    subscription: 'lifetime'
  },
  hwid_reset: {
    amount: 49,
    currency: 'RUB',
    description: 'Aura Client - РЎР±СЂРѕСЃ HWID',
    subscription: 'hwid_reset'
  }
};

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse body for POST requests
  if (req.method === 'POST') {
    try {
      req.body = JSON.parse(req.body || '{}');
    } catch (e) {
      req.body = {};
    }
  }

  try {
    const { pathname } = new URL(req.url || '', `https://${req.headers.host}`);
    
    // Handle different payment endpoints
    if (pathname.includes('/create') && req.method === 'POST') {
      return await handleCreatePayment(req, res);
    } else if (pathname.includes('/check') && req.method === 'POST') {
      return await handleCheckPayment(req, res);
    } else if (pathname.includes('/webhook') && req.method === 'POST') {
      return await handleWebhook(req, res);
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create payment handler
async function handleCreatePayment(req, res) {
  const { tier, returnUrl, userId } = req.body;
  
  if (!tier || !PAYMENT_TIERS[tier]) {
    return res.status(400).json({ error: 'Invalid tier' });
  }

  const selectedPrice = PAYMENT_TIERS[tier];
  
  try {
    const payment = await yooKassaRequest('POST', '/payments', {
      amount: {
        value: selectedPrice.amount,
        currency: selectedPrice.currency
      },
      confirmation: {
        type: 'redirect',
        return_url: returnUrl || 'https://aura-client-sites.vercel.app/payment/success'
      },
      description: selectedPrice.description,
      metadata: {
        tier,
        userId: userId || 'anonymous_' + Date.now()
      },
      capture: true
    });

    res.json({
      ok: true,
      paymentId: payment.id,
      confirmationUrl: payment.confirmation?.confirmation_url,
      expiresAt: new Date(payment.expires_at).getTime(),
      amount: selectedPrice.amount,
      currency: selectedPrice.currency,
      description: selectedPrice.description
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create payment' 
    });
  }
}

// Check payment status handler
async function handleCheckPayment(req, res) {
  const { paymentId } = req.body;
  
  if (!paymentId) {
    return res.status(400).json({ error: 'Payment ID required' });
  }

  try {
    // Get payment from YooKassa
    const payment = await yooKassaRequest('GET', `/payments/${paymentId}`);

    res.json({
      ok: true,
      status: payment.status,
      paymentId: payment.id,
      paid: payment.status === 'succeeded',
      subscription: 'premium',
      amount: payment.amount?.value,
      currency: payment.amount?.currency,
      description: payment.description
    });
  } catch (error) {
    console.error('Check payment error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to check payment' 
    });
  }
}

// Webhook handler
async function handleWebhook(req, res) {
  const signature = req.headers['x-need-signature'];
  const webhookSecret = process.env.YOOKASSA_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET';
  
  if (!signature || !webhookSecret) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  // Verify webhook signature
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHash('sha256')
    .update(body + webhookSecret)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, object } = req.body;

  try {
    if (event === 'payment.succeeded') {
      console.log('Payment succeeded:', object.id);
    } else if (event === 'payment.canceled') {
      console.log('Payment canceled:', object.id);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ 
      error: error.message || 'Webhook processing failed' 
    });
  }
}

