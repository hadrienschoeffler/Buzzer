function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export class RoomManager {
  constructor() {
    this.rooms = {};
    this.socketToRoom = {};
  }

  create(socketId, pseudo, settings = {}) {
    const code = generateCode();

    this.rooms[code] = {
      code,
      managerPseudo: pseudo,
      managerSocketId: socketId,
      managerOnline: true,
      participants: {},
      buzzer: null,
      active: true,
      settings: {
        oneBuzzPerQuestion: settings.oneBuzzPerQuestion ?? false,
      },
      alreadyBuzzedThisQuestion: [],
    };

    this.socketToRoom[socketId] = { code, pseudo, isManager: true };
    return this.rooms[code];
  }

  join(code, socketId, pseudo) {
    const room = this.rooms[code];
    if (!room) return { success: false, error: 'Salon introuvable' };
    if (!room.active) return { success: false, error: 'Partie terminée' };

    if (room.managerPseudo === pseudo) {
      return { success: false, error: 'Ce pseudo est réservé au gérant' };
    }

    if (room.participants[pseudo]) {
      room.participants[pseudo].online = true;
    } else {
      room.participants[pseudo] = { pseudo, score: 0, online: true };
    }

    this.socketToRoom[socketId] = { code, pseudo, isManager: false };
    return { success: true };
  }

  rejoinAsManager(code, socketId, pseudo) {
    const room = this.rooms[code];
    if (!room) return { success: false, error: 'Salon introuvable' };
    if (room.managerPseudo !== pseudo) {
      return { success: false, error: 'Tu n’es pas le gérant de ce salon' };
    }

    room.managerSocketId = socketId;
    room.managerOnline = true;
    this.socketToRoom[socketId] = { code, pseudo, isManager: true };

    return { success: true };
  }

  buzz(code, pseudo) {
    const room = this.rooms[code];
    if (!room || room.buzzer !== null) return { success: false };
    if (!room.participants[pseudo]) return { success: false };

    if (
      room.settings.oneBuzzPerQuestion &&
      room.alreadyBuzzedThisQuestion.includes(pseudo)
    ) {
      return { success: false };
    }

    room.buzzer = pseudo;

    if (
      room.settings.oneBuzzPerQuestion &&
      !room.alreadyBuzzedThisQuestion.includes(pseudo)
    ) {
      room.alreadyBuzzedThisQuestion.push(pseudo);
    }

    return { success: true, pseudo };
  }

  refuseBuzz(code, socketId) {
    const room = this.rooms[code];
    if (!room || room.managerSocketId !== socketId) return { success: false };

    room.buzzer = null;
    return { success: true };
  }

  newQuestion(code, socketId) {
    const room = this.rooms[code];
    if (!room || room.managerSocketId !== socketId) return { success: false };

    room.buzzer = null;
    room.alreadyBuzzedThisQuestion = [];
    return { success: true };
  }

  validatePoint(code, socketId) {
    const room = this.rooms[code];
    if (!room || room.managerSocketId !== socketId || !room.buzzer) {
      return { success: false };
    }

    room.participants[room.buzzer].score += 1;

    room.buzzer = null;
    room.alreadyBuzzedThisQuestion = [];

    return { success: true };
  }

  endGame(code, socketId) {
    const room = this.rooms[code];
    if (!room || room.managerSocketId !== socketId) return { success: false };

    room.active = false;

    const scores = Object.values(room.participants).sort((a, b) => b.score - a.score);

    return { success: true, scores };
  }

  disconnect(socketId) {
    const info = this.socketToRoom[socketId];
    if (!info) return null;

    const { code, pseudo, isManager } = info;
    const room = this.rooms[code];

    delete this.socketToRoom[socketId];

    if (!room) return null;

    if (isManager) {
      room.managerOnline = false;
      return { code, pseudo, isManager: true };
    }

    if (room.participants[pseudo]) {
      room.participants[pseudo].online = false;
    }

    const anyoneOnline =
      room.managerOnline ||
      Object.values(room.participants).some((p) => p.online);

    if (!anyoneOnline) {
      delete this.rooms[code];
      return { code, deleted: true };
    }

    return { code, pseudo, isManager: false };
  }

  getPublicState(code) {
    const room = this.rooms[code];
    if (!room) return null;

    const participants = Object.values(room.participants);
    const onlineParticipants = participants.filter((p) => p.online);

    const remainingCanBuzz = onlineParticipants.filter(
      (p) => !room.alreadyBuzzedThisQuestion.includes(p.pseudo)
    );

    return {
      code: room.code,
      managerPseudo: room.managerPseudo,
      managerOnline: room.managerOnline,
      participants,
      buzzer: room.buzzer,
      active: room.active,
      settings: room.settings,
      alreadyBuzzedThisQuestion: room.alreadyBuzzedThisQuestion,
      remainingCanBuzzCount: remainingCanBuzz.length,
    };
  }
}