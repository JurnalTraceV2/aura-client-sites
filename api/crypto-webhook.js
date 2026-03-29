import paymentWebhookHandler from './payments/webhook.js';

export default async function handler(req, res) {
  return paymentWebhookHandler(req, res);
}
