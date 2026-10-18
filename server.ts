import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Store active sessions: roomCode -> { tvSocketId, phoneSocketId }
  const rooms = new Map<string, { tvId?: string; phoneId?: string }>();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // TV connects and creates a room
    socket.on('tv_create_room', (roomCode) => {
      socket.join(roomCode);
      let room = rooms.get(roomCode);
      if (!room) {
        room = {};
        rooms.set(roomCode, room);
      }
      room.tvId = socket.id;
      console.log(`TV connected to room: ${roomCode}`);
      socket.emit('room_created', { roomCode });
    });

    // Phone scans QR code and joins room as controller
    socket.on('phone_join_room', (roomCode) => {
      socket.join(roomCode);
      let room = rooms.get(roomCode);
      if (!room) {
        room = {};
        rooms.set(roomCode, room);
      }
      room.phoneId = socket.id;
      console.log(`Phone connected to room: ${roomCode}`);

      // Notify TV that phone is connected
      if (room.tvId) {
        io.to(room.tvId).emit('phone_connected');
      }
      socket.emit('joined_success');
    });

    // Phone sends motion orientation / swing action
    socket.on('phone_motion_data', ({ roomCode, alpha, beta, gamma, stroke, power }) => {
      const room = rooms.get(roomCode);
      if (room && room.tvId) {
        io.to(room.tvId).emit('tv_receive_motion', { alpha, beta, gamma, stroke, power });
      }
    });

    // Phone triggers swing button or touch gesture
    socket.on('phone_swing_action', ({ roomCode, gesture, power }) => {
      const room = rooms.get(roomCode);
      if (room && room.tvId) {
        io.to(room.tvId).emit('tv_receive_swing', { gesture, power });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      for (const [roomCode, room] of rooms.entries()) {
        if (room.tvId === socket.id) {
          room.tvId = undefined;
          if (room.phoneId) {
            io.to(room.phoneId).emit('tv_disconnected');
          }
        }
        if (room.phoneId === socket.id) {
          room.phoneId = undefined;
          if (room.tvId) {
            io.to(room.tvId).emit('phone_disconnected');
          }
        }
      }
    });
  });

  // Vite development middleware
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Tennis Motion server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
