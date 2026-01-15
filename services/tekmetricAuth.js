const tekmetricAuth = (req, res, next) => {
  const signature = req.header('X-Tekmetric-Signature');
  const apiKey = req.header('X-API-Key');
  
  if (!signature || !apiKey) {
    return res.status(401).json({ error: 'Invalid webhook credentials' });
  }
  
  // Verify HMAC signature or API key
  const expectedSignature = crypto
    .createHmac('sha256', process.env.TEKMETRIC_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
    
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Store webhook context if needed
  req.webhookSource = 'tekmetric';
  next();
};
