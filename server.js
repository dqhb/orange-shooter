const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let players = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // 1. When a player joins
    socket.on('join', (data) => {
        players[socket.id] = {
            id: socket.id,
            x: 400,
            y: 300,
            hp: 100,
            name: data.name || "Guest",
            color: data.color || "#ff8c00"
        };
        // Send existing players to the newcomer
        socket.emit('init', players);
        // Tell everyone else a new player arrived
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    // 2. Handle Movement
    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            // Broadcast the update to everyone else
            socket.broadcast.emit('updatePlayer', players[socket.id]);
        }
    });

    // 3. Handle Shooting (The Weapon Logic)
    socket.on('shoot', (data) => {
        // We broadcast the shot to everyone else so they see the bullet
        // data contains: { x, y, dir }
        socket.broadcast.emit('opponentShot', {
            id: socket.id,
            x: data.x,
            y: data.y,
            dir: data.dir
        });
    });

    // 4. Handle Hits (When a player says "I hit someone")
    socket.on('hitPlayer', (targetId) => {
        if (players[targetId]) {
            players[targetId].hp -= 10;
            
            if (players[targetId].hp <= 0) {
                players[targetId].hp = 100; // Reset HP
                io.emit('playerKilled', { victim: targetId, killer: socket.id });
            } else {
                io.emit('updateHP', { id: targetId, hp: players[targetId].hp });
            }
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Arena Server running on port ${PORT}`));
