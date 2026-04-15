const express = require('express');
const path = require('path');
const { URL } = require('url');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const FOOTBALL_API_BASE = 'https://api.football-data.org/v4';
// Используем встроенный API ключ, если переменная окружения не установлена
const FOOTBALL_API_KEY = process.env.FOOTBALL_DATA_API_KEY || process.env.FOOTBALL_DATA_KEY || '2653331a276f4ce3bc6592eaa77d2a5b';

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.static(path.join(__dirname)));

app.use('/api', async (req, res) => {
    if (!FOOTBALL_API_KEY) {
        return res.status(500).json({
            error: 'Football-Data.org API key is not configured.'
        });
    }

    const pathWithoutApi = req.originalUrl.replace(/^\/api/, '');
    const targetUrl = new URL(pathWithoutApi, FOOTBALL_API_BASE);

    try {
        const response = await fetch(targetUrl.href, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Auth-Token': FOOTBALL_API_KEY,
            },
        });

        const body = await response.text();
        res.status(response.status);

        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        return res.send(body);
    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(502).json({
            error: 'Proxy request failed. Please check server logs and make sure the API key is configured.'
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        apiConfigured: !!FOOTBALL_API_KEY,
        port: PORT
    });
});

app.listen(PORT, () => {
    console.log(`✅ SportArena proxy server is running at http://localhost:${PORT}`);
    console.log(`📡 API Proxy: ${FOOTBALL_API_BASE}`);
    console.log(`🔑 API Key configured: ${FOOTBALL_API_KEY ? '✓' : '✗'}`);
});
