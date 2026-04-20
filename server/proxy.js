require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Groq AI Middleware Route
app.post('/api/ai', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required." });

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are the built-in AI assistant for the Solana Bloomberg Terminal. Provide highly concise, accurate, and professional answers for Solana developers and traders. Never use markdown headers, keep it raw text for CLI.'
        },
        { role: 'user', content: message }
      ],
      model: 'llama3-8b-8192',
    });

    res.json({ reply: chatCompletion.choices[0]?.message?.content || '' });
  } catch (error) {
    console.error('Groq Error:', error.message);
    res.status(500).json({ error: 'Failed to process AI request.' });
  }
});

// A generic proxy wrapper to protect paid RPC or Helius keys later
app.get('/api/rpc-proxy', async (req, res) => {
  try {
    // Example: Using a protected Helius key
    // const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
    // const result = await axios.post(heliusUrl, { method: req.query.method, ... });
    res.json({ status: 'RPC Proxy ready to be implemented' });
  } catch (error) {
    res.status(500).json({ error: 'RPC Proxy failed' });
  }
});

// Basic health check
app.get('/', (req, res) => {
  res.send('Solana Terminal Proxy Server is running safely.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔐 Secure Proxy Server listening on port ${PORT}`);
});
