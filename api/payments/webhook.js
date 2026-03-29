import yookassaWebhookHandler from './yookassa-webhook.js';

export default async function handler(req, res) {
  return yookassaWebhookHandler(req, res);
}
