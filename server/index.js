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
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const rooms = new RoomManager();

io.on('connection', (socket) => {
  console.log(`Connecté : ${socket.id}`);

  socket.on('create_room', ({ pseudo, settings }, callback) => {
    const room = rooms.create(socket.id, pseudo, settings);
    socket.join(room.code);

    console.log(`Salon créé : ${room.code} par ${pseudo}`);

    callback({
      success: true,
      room: rooms.getPublicState(room.code),
    });
  });

  socket.on('join_room', ({ code, pseudo }, callback) => {
    const result = rooms.join(code, socket.id, pseudo);
    if (!result.success) return callback(result);

    socket.join(code);

    io.to(code).emit('room_updated', rooms.getPublicState(code));
    io.to(code).emit('notification', {
      message: `${pseudo} a rejoint le salon`,
    });

    console.log(`${pseudo} a rejoint ${code}`);

    callback({
      success: true,
      room: rooms.getPublicState(code),
    });
  });

  socket.on('rejoin_as_manager', ({ code, pseudo }, callback) => {
    const result = rooms.rejoinAsManager(code, socket.id, pseudo);
    if (!result.success) return callback(result);

    socket.join(code);

    io.to(code).emit('room_updated', rooms.getPublicState(code));
    io.to(code).emit('manager_back');

    console.log(`Gérant reconnecté sur ${code}`);

    callback({
      success: true,
      room: rooms.getPublicState(code),
    });
  });

  socket.on('buzz', ({ code, pseudo }) => {
    const result = rooms.buzz(code, pseudo);

    if (result.success) {
      io.to(code).emit('room_updated', rooms.getPublicState(code));
    }
  });

  socket.on('refuse_buzz', ({ code }) => {
    const result = rooms.refuseBuzz(code, socket.id);

    if (result.success) {
      io.to(code).emit('room_updated', rooms.getPublicState(code));
    }
  });

  socket.on('new_question', ({ code }) => {
    const result = rooms.newQuestion(code, socket.id);

    if (result.success) {
      io.to(code).emit('room_updated', rooms.getPublicState(code));
      io.to(code).emit('notification', {
        message: 'Nouvelle question',
      });
    }
  });

  socket.on('validate_point', ({ code }) => {
    const result = rooms.validatePoint(code, socket.id);

    if (result.success) {
      io.to(code).emit('room_updated', rooms.getPublicState(code));
      io.to(code).emit('notification', {
        message: 'Bonne réponse validée',
      });
    }
  });

  socket.on('end_game', ({ code }) => {
    const result = rooms.endGame(code, socket.id);

    if (result.success) {
      io.to(code).emit('game_over', { scores: result.scores });
    }
  });

  socket.on('disconnect', () => {
    const affected = rooms.disconnect(socket.id);

    if (affected && !affected.deleted) {
      const state = rooms.getPublicState(affected.code);

      if (state) {
        io.to(affected.code).emit('room_updated', state);

        if (affected.isManager) {
          io.to(affected.code).emit('manager_left');
          io.to(affected.code).emit('notification', {
            message: 'Le gérant s’est déconnecté',
          });
        } else {
          io.to(affected.code).emit('notification', {
            message: `${affected.pseudo} s’est déconnecté`,
          });
        }
      }
    }

    console.log(`Déconnecté : ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});