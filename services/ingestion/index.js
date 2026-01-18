import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { tekmetricWebhook } from './handlers.js';
dotenv.config();

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(cors());

// Health Check
app.get('/', (req, res) => {
  res.send('Innu Ingestion Service is Running 📥');
});

// Route
app.post('/webhooks/tekmetric', tekmetricWebhook);

app.listen(PORT, () => {
  console.log(`Ingestion Service listening on port 8080`);
});