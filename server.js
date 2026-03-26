const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let players = {};
let platforms = [];

// Create 50 platforms for a long run
for (let i = 0; i < 50; i++) {
    platforms.push({ x: i * 350, y: 400 + Math.random() * 200, w: 180 });
}

io.on('connection', (socket) => {
    socket.on('join', (nickname) => {
        players[socket.id] = { x: 100, y: 100, name: nickname || "Guest", anim: 0 };
        socket.emit('init', { players, platforms });
        socket.broadcast.emit('newPlayer', { id: socket.id, data: players[socket.id] });
    });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].anim = data.anim;
            socket.broadcast.emit('updatePlayer', { id: socket.id, ...data });
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

server.listen(process.env.PORT || 3000);