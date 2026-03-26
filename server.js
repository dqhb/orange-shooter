const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let players = {};

// THE MAP (Make sure this matches your client)
const mapWalls = [
    { x: 400, y: 5, w: 800, h: 10 }, { x: 400, y: 595, w: 800, h: 10 },
    { x: 5, y: 300, w: 10, h: 600 }, { x: 795, y: 300, w: 10, h: 600 },
    { x: 400, y: 150, w: 10, h: 300 }, { x: 400, y: 450, w: 10, h: 300 },
    { x: 150, y: 300, w: 300, h: 10 }, { x: 650, y: 300, w: 300, h: 10 }
];

io.on('connection', (socket) => {
    socket.on('join', (data) => {
        // Create player record
        players[socket.id] = { 
            id: socket.id, 
            x: 100, y: 100, 
            hp: 100, 
            name: data.name || "Guest", 
            color: data.color || "#ff8c00" 
        };
        
        // 1. Send the map and ALL current players to the person who just joined
        socket.emit('init', { players, mapWalls });

        // 2. Tell everyone else that a new player joined
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            // Send movement to everyone EXCEPT the sender
            socket.broadcast.emit('updatePlayer', players[socket.id]);
        }
    });

    socket.on('shoot', (data) => {
        socket.broadcast.emit('opponentShot', { id: socket.id, ...data });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

server.listen(process.env.PORT || 3000);
