const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let players = {};

// Hardcoded Map for everyone
const mapWalls = [
    { x: 400, y: 10, w: 800, h: 20 }, { x: 400, y: 590, w: 800, h: 20 },
    { x: 10, y: 300, w: 20, h: 600 }, { x: 790, y: 300, w: 20, h: 600 },
    { x: 400, y: 300, w: 20, h: 250 }, // Center Wall
    { x: 200, y: 300, w: 250, h: 20 }, { x: 600, y: 300, w: 250, h: 20 }
];

io.on('connection', (socket) => {
    socket.on('join', (data) => {
        players[socket.id] = { id: socket.id, x: 100, y: 100, hp: 100, name: data.name, color: data.color };
        socket.emit('init', { players, mapWalls });
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
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
