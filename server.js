const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let players = {};

// THE MAP: 800x600 Arena with some cover
const mapWalls = [
    { x: 400, y: -10, w: 820, h: 20 },  // Top Boundary
    { x: 400, y: 610, w: 820, h: 20 },  // Bottom Boundary
    { x: -10, y: 300, w: 20, h: 620 },  // Left Boundary
    { x: 810, y: 300, w: 20, h: 620 },  // Right Boundary
    { x: 400, y: 150, w: 40, h: 150 },  // Top Cover Wall
    { x: 400, y: 450, w: 40, h: 150 }   // Bottom Cover Wall
];

io.on('connection', (socket) => {
    console.log(`Player joined: ${socket.id}`);

    // 1. Join Game
    socket.on('join', (data) => {
        players[socket.id] = {
            id: socket.id,
            x: Math.random() * 600 + 100, // Random spawn
            y: Math.random() * 400 + 100,
            hp: 100,
            name: data.name || "Player",
            color: data.color || "#ff8c00"
        };
        // Send world state to the new player
        socket.emit('init', { players, mapWalls, myId: socket.id });
        // Tell everyone else
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    // 2. Sync Movement
    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            socket.broadcast.emit('updatePlayer', players[socket.id]);
        }
    });

    // 3. Sync Bullets
    socket.on('shoot', (data) => {
        socket.broadcast.emit('opponentShot', data);
    });

    // 4. Handle Damage & Respawns
    socket.on('hit', (targetId) => {
        if (players[targetId]) {
            players[targetId].hp -= 25; // 4 hits to eliminate
            
            if (players[targetId].hp <= 0) {
                players[targetId].hp = 100;
                players[targetId].x = Math.random() * 600 + 100;
                players[targetId].y = Math.random() * 400 + 100;
                io.emit('respawn', players[targetId]);
            }
            io.emit('updateHP', { id: targetId, hp: players[targetId].hp });
        }
    });

    // 5. Cleanup
    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Orange Arena running on port ${PORT}`));
