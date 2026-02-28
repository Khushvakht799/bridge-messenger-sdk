const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Раздаём статические файлы из текущей папки
app.use(express.static(path.join(__dirname)));

// Хранилище эволюции сообщений
const evolutionStore = new Map();

// Подключения клиентов (userId -> ws)
const clients = new Map();

wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const userId = urlParams.get('userId') || `user_${uuidv4().slice(0,4)}`;
    console.log(`Client connected: ${userId}`);
    
    clients.set(userId, ws);
    
    // Отправляем историю эволюции (упрощённо)
    ws.send(JSON.stringify({
        type: 'system',
        content: 'Connected to BVG chat server'
    }));

    ws.on('message', (data) => {
        try {
            // Парсим BVG-сообщение (упрощённо — JSON)
            const msg = JSON.parse(data.toString());
            console.log(`Received from ${userId}:`, msg.id);
            
            // Сохраняем эволюцию
            if (!evolutionStore.has(msg.id)) {
                evolutionStore.set(msg.id, []);
            }
            evolutionStore.get(msg.id).push({
                event: 'received',
                timestamp: Date.now(),
                server: true
            });
            
            // Маршрутизация по intent
            const intent = msg.meta.intent.primary;
            const targetUserId = msg.meta.state.receiver;
            
            if (intent === 'chat' && clients.has(targetUserId)) {
                // Доставляем получателю
                clients.get(targetUserId).send(JSON.stringify({
                    ...msg,
                    meta: {
                        ...msg.meta,
                        state: {
                            ...msg.meta.state,
                            status: 'delivered'
                        }
                    }
                }));
                
                // Эволюция: доставлено
                evolutionStore.get(msg.id).push({
                    event: 'delivered',
                    timestamp: Date.now(),
                    to: targetUserId
                });
            } else if (intent === 'broadcast') {
                // Рассылка всем
                clients.forEach((client, id) => {
                    if (id !== userId) {
                        client.send(JSON.stringify(msg));
                    }
                });
            }
        } catch (e) {
            console.error('Failed to process message:', e);
        }
    });
    
    ws.on('close', () => {
        clients.delete(userId);
        console.log(`Client disconnected: ${userId}`);
    });
});

// API для получения эволюции
app.get('/evolution/:messageId', (req, res) => {
    const events = evolutionStore.get(req.params.messageId) || [];
    res.json({ messageId: req.params.messageId, events });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`BVG Chat Server running on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT}/client.html in your browser`);
});