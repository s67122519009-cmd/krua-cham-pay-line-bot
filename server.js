
require('dotenv').config();

const express = require('express');
const crypto = require('crypto');

const app = express();

const SECRET = process.env.LINE_CHANNEL_SECRET;
const N8N_URL = 'http://127.0.0.1:5678/webhook/line-bot';

if (!SECRET) {
  throw new Error('Missing LINE_CHANNEL_SECRET');
}

// รับ Raw Body เพื่อใช้ตรวจลายเซ็น
app.post('/line-webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req, res) => {

    if (!Buffer.isBuffer(req.body)) {
      return res.sendStatus(400);
    }

    const signature = req.get('x-line-signature') || '';

    const expected = crypto
      .createHmac('sha256', SECRET)
      .update(req.body)
      .digest();

    const received = Buffer.from(signature, 'base64');

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return res.sendStatus(401);
    }

    try {
      const response = await fetch(N8N_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: req.body
      });

      res.sendStatus(response.ok ? 200 : 502);
    } catch (error) {
      console.error('n8n forwarding failed:', error.message);
      res.sendStatus(502);
    }
  }
);

app.listen(3000, '127.0.0.1', () => {
  console.log('LINE Webhook Gateway running on port 3000');
});
