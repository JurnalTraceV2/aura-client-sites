"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.yookassa = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const cors = require("cors");
const yookassa_sdk_1 = require("yookassa-sdk");
// Initialize Firebase Admin
admin.initializeApp();
// Initialize CORS
const corsHandler = cors({ origin: true });
// Initialize YooKassa with production credentials
const yooKassa = new yookassa_sdk_1.YooKassa({
    shopId: functions.config().yookassa.shop_id || 'YOUR_SHOP_ID',
    secretKey: functions.config().yookassa.secret_key || 'YOUR_YOOKASSA_SECRET_KEY'
});
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
// Create payment function
exports.yookassa = functions.https.onRequest(async (req, res) => {
    return corsHandler(req, res, async () => {
        try {
            const { pathname } = new URL(req.url || '', `https://${req.headers.host}`);
            // Handle different payment endpoints
            if (pathname.includes('/create') && req.method === 'POST') {
                return await handleCreatePayment(req, res);
            }
            else if (pathname.includes('/check') && req.method === 'POST') {
                return await handleCheckPayment(req, res);
            }
            else if (pathname.includes('/webhook') && req.method === 'POST') {
                return await handleWebhook(req, res);
            }
            else {
                res.status(404).json({ error: 'Endpoint not found' });
            }
        }
        catch (error) {
            console.error('Payment error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});
// Create payment handler
async function handleCreatePayment(req, res) {
    var _a;
    const { tier, returnUrl, userId } = req.body;
    if (!tier || !PAYMENT_TIERS[tier]) {
        return res.status(400).json({ error: 'Invalid tier' });
    }
    const selectedPrice = PAYMENT_TIERS[tier];
    try {
        const payment = await yooKassa.createPayment({
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
        // Store payment info in Firestore
        await admin.firestore().collection('payments').doc(payment.id).set({
            paymentId: payment.id,
            status: payment.status,
            amount: selectedPrice.amount,
            currency: selectedPrice.currency,
            tier,
            userId: userId || 'anonymous_' + Date.now(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            subscription: selectedPrice.subscription
        });
        res.json({
            ok: true,
            paymentId: payment.id,
            confirmationUrl: (_a = payment.confirmation) === null || _a === void 0 ? void 0 : _a.confirmation_url,
            expiresAt: new Date(payment.expires_at).getTime(),
            amount: selectedPrice.amount,
            currency: selectedPrice.currency,
            description: selectedPrice.description
        });
    }
    catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({
            error: error.message || 'Failed to create payment'
        });
    }
}
// Check payment status handler
async function handleCheckPayment(req, res) {
    var _a, _b;
    const { paymentId } = req.body;
    if (!paymentId) {
        return res.status(400).json({ error: 'Payment ID required' });
    }
    try {
        // Get payment from YooKassa
        const payment = await yooKassa.getPayment(paymentId);
        // Update payment status in Firestore
        const paymentRef = admin.firestore().collection('payments').doc(paymentId);
        await paymentRef.update({
            status: payment.status,
            paid: payment.status === 'succeeded',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Get payment data from Firestore
        const paymentDoc = await paymentRef.get();
        const paymentData = paymentDoc.data();
        if (payment.status === 'succeeded' && (paymentData === null || paymentData === void 0 ? void 0 : paymentData.userId)) {
            // Update user subscription in Firestore
            await admin.firestore().collection('users').doc(paymentData.userId).update({
                subscription: paymentData.subscription,
                subscriptionActive: true,
                subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        res.json({
            ok: true,
            status: payment.status,
            paymentId: payment.id,
            paid: payment.status === 'succeeded',
            subscription: (paymentData === null || paymentData === void 0 ? void 0 : paymentData.subscription) || 'free',
            amount: (_a = payment.amount) === null || _a === void 0 ? void 0 : _a.value,
            currency: (_b = payment.amount) === null || _b === void 0 ? void 0 : _b.currency,
            description: payment.description
        });
    }
    catch (error) {
        console.error('Check payment error:', error);
        res.status(500).json({
            error: error.message || 'Failed to check payment'
        });
    }
}
// Webhook handler
async function handleWebhook(req, res) {
    const signature = req.headers['x-need-signature'];
    const webhookSecret = functions.config().yookassa.webhook_secret;
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
            const paymentId = object.id;
            // Update payment in Firestore
            await admin.firestore().collection('payments').doc(paymentId).update({
                status: 'succeeded',
                paid: true,
                webhookProcessed: true,
                webhookProcessedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Get payment data
            const paymentDoc = await admin.firestore().collection('payments').doc(paymentId).get();
            const paymentData = paymentDoc.data();
            if (paymentData === null || paymentData === void 0 ? void 0 : paymentData.userId) {
                // Update user subscription
                await admin.firestore().collection('users').doc(paymentData.userId).update({
                    subscription: paymentData.subscription,
                    subscriptionActive: true,
                    subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                // Log subscription activation
                await admin.firestore().collection('subscription_events').add({
                    userId: paymentData.userId,
                    subscription: paymentData.subscription,
                    paymentId,
                    event: 'activated',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        else if (event === 'payment.canceled') {
            const paymentId = object.id;
            await admin.firestore().collection('payments').doc(paymentId).update({
                status: 'canceled',
                paid: false,
                webhookProcessed: true,
                webhookProcessedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        res.status(200).json({ ok: true });
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({
            error: error.message || 'Webhook processing failed'
        });
    }
}
// General API function
exports.api = functions.https.onRequest(async (req, res) => {
    return corsHandler(req, res, async () => {
        const { pathname } = new URL(req.url || '', `https://${req.headers.host}`);
        // Handle auth endpoints
        if (pathname.includes('/auth/login') && req.method === 'POST') {
            return await handleAuthLogin(req, res);
        }
        else if (pathname.includes('/account/subscription') && req.method === 'GET') {
            return await handleGetSubscription(req, res);
        }
        else {
            res.status(404).json({ error: 'Endpoint not found' });
        }
    });
});
// Auth login handler
async function handleAuthLogin(req, res) {
    const { username, password, hwid } = req.body;
    try {
        // Get user from Firestore
        const userDoc = await admin.firestore().collection('users').doc(username).get();
        const userData = userDoc.data();
        if (!userData || userData.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (userData.hwid && userData.hwid !== hwid) {
            return res.status(403).json({ error: 'Account already in use on another device' });
        }
        // Update HWID
        await admin.firestore().collection('users').doc(username).update({
            hwid,
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        });
        // Generate token
        const token = crypto.createHash('sha256')
            .update(`${username}${hwid}${Date.now()}`)
            .digest('hex');
        res.json({
            token,
            user: {
                username,
                subscription: userData.subscription || 'free',
                subscriptionActive: userData.subscriptionActive || false,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000
            }
        });
    }
    catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: error.message || 'Authentication failed' });
    }
}
// Get subscription handler
async function handleGetSubscription(req, res) {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
    }
    try {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();
        res.json({
            ok: true,
            subscription: (userData === null || userData === void 0 ? void 0 : userData.subscription) || 'free',
            subscriptionActive: (userData === null || userData === void 0 ? void 0 : userData.subscriptionActive) || false,
            subscriptionUpdatedAt: userData === null || userData === void 0 ? void 0 : userData.subscriptionUpdatedAt
        });
    }
    catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: error.message || 'Failed to get subscription' });
    }
}
//# sourceMappingURL=index.js.map
