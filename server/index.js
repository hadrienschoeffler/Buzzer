import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './roomManager.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const rooms = new RoomManager();

io.on('connection', (socket) => {
  console.log(`🔌 Connecté : ${socket.id}`);

  // --- Créer un salon ---
  socket.on('create_room', ({ pseudo }, callback) => {
    const room = rooms.create(socket.id, pseudo);
    socket.join(room.code);
    console.log(`🏠 Salon créé : ${room.code} par ${pseudo}`);
    callback({ success: true, room: rooms.getPublicState(room.code) });
  });

  // --- Rejoindre un salon (participant) ---
  socket.on('join_room', ({ code, pseudo }, callback) => {
    const result = rooms.join(code, socket.id, pseudo);
    if (!result.success) return callback(result);
    socket.join(code);
    io.to(code).emit('room_updated', rooms.getPublicState(code));
    console.log(`👤 ${pseudo} a rejoint ${code}`);
    callback({ success: true, room: rooms.getPublicState(code) });
  });

  // --- Reconnexion gérant ---
  socket.on('rejoin_as_manager', ({ code, pseudo }, callback) => {
    const result = rooms.rejoinAsManager(code, socket.id, pseudo);
    if (!result.success) return callback(result);
    socket.join(code);
    io.to(code).emit('room_updated', rooms.getPublicState(code));
    io.to(code).emit('manager_back');
    console.log(`👑 Gérant ${pseudo} reconnecté sur ${code}`);
    callback({ success: true, room: rooms.getPublicState(code) });
  });

  // --- Buzzer ---
  socket.on('buzz', ({ code, pseudo }) => {
    const result = rooms.buzz(code, pseudo);
    if (result.success) {
      io.to(code).emit('room_updated', rooms.getPublicState(code));
    }
  });

  // --- Reset buzzer ---
  socket.on('reset_buzz', ({ code }) => {
    const result = rooms.resetBuzz(code, socket.id);
    if (result.success) {
      io.to(code).emit('room_updated', rooms.getPublicState(code));
      io.to(code).emit('buzz_reset');
    }
  });

  // --- Valider (+1 point) ---
  socket.on('validate_point', ({ code }) => {
    const result = rooms.validatePoint(code, socket.id);
    if (result.success) {
      io.to(code).emit('room_updated', rooms.getPublicState(code));
      io.to(code).emit('buzz_reset');
    }
  });

  // --- Fin de partie ---
  socket.on('end_game', ({ code }) => {
    const result = rooms.endGame(code, socket.id);
    if (result.success) {
      io.to(code).emit('game_over', { scores: result.scores });
    }
  });

  // --- Déconnexion ---
  socket.on('disconnect', () => {
    const affected = rooms.disconnect(socket.id);
    if (affected && !affected.deleted) {
      const state = rooms.getPublicState(affected.code);
      if (state) {
        io.to(affected.code).emit('room_updated', state);
        if (affected.isManager) {
          io.to(affected.code).emit('manager_left');
        }
      }
    }
    console.log(`❌ Déconnecté : ${socket.id}`);
  });
});

httpServer.listen(3001, () => {
  console.log('✅ Serveur lancé sur http://localhost:3001');
});