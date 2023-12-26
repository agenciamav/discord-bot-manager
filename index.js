require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const BotManager = require('./botManager');
const axios = require('axios');
const https = require('https');

const { APP_URL } = process.env;

// Create an express app
const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 7860;
const botManager = new BotManager();

// API status
app.get('/api', (req, res) => {
    res.json({ status: 'ok', message: 'Discord Bot Manager is running' });
});

// Bots status
app.get('/api/status', (req, res) => {
    const status = botManager.getBotsStatus();
    res.json(status);
});

// Endpoint para iniciar um bot
app.post('/api/start', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const response = botManager.startBot(token);
    res.json({ message: response });
});

// Endpoint para parar um bot
app.post('/api/stop', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const response = botManager.stopBot(token);
    res.json({ message: response });
});

// Fetch active bots and start them
axios.get(`${APP_URL}/api/assistants/active`, {
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    httpsAgent: new https.Agent({  
        rejectUnauthorized: false  
    }),
    headers: {
        'Authorization': `Bearer ${process.env.API_TOKEN}`
    }
})
.then(response => {
    const bots = response.data;
    bots.forEach(bot => {
        botManager.startBot(bot.discord_bot_token);
    });
})
.catch(error => {
    console.error('Error fetching active bots:', error.message);
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

