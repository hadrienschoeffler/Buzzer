function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export class RoomManager {
  constructor() {
    this.rooms = {};        // code -> room
    this.socketToRoom = {}; // socketId -> { code, pseudo, isManager }
  }

  create(socketId, pseudo) {
    const code = generateCode();
    this.rooms[code] = {
      code,
      managerPseudo: pseudo,
      managerSocketId: socketId,
      managerOnline: true,
      participants: {},   // pseudo -> { pseudo, score, online }
      buzzer: null,       // pseudo du buzzeur actif
      active: true
    };
    this.socketToRoom[socketId] = { code, pseudo, isManager: true };
    return this.rooms[code];
  }

 join(code, socketId, pseudo) {
  const room = this.rooms[code];
  if (!room) return { success: false, error: 'Salon introuvable' };
  if (!room.active) return { success: false, error: 'Partie terminée' };

  // Reconnexion d'un participant existant
  if (room.participants[pseudo]) {
    room.participants[pseudo].online = true;
    const oldSocketId = Object.keys(this.socketToRoom)
      .find(id => this.socketToRoom[id]?.code === code && this.socketToRoom[id]?.pseudo === pseudo);
    if (oldSocketId) delete this.socketToRoom[oldSocketId];
    this.socketToRoom[socketId] = { code, pseudo, isManager: false };
    return { success: true, reconnected: true };
  }

  // Pseudo déjà pris par quelqu'un d'autre
  const pseudoTaken = Object.values(room.participants).some(p => p.pseudo === pseudo);
  if (pseudoTaken) return { success: false, error: 'Ce pseudo est déjà pris dans ce salon' };

  // Pseudo identique au gérant
  if (room.managerPseudo === pseudo) return { success: false, error: 'Ce pseudo est déjà pris dans ce salon' };

  // Nouveau participant
  room.participants[pseudo] = { pseudo, score: 0, online: true };
  this.socketToRoom[socketId] = { code, pseudo, isManager: false };
  return { success: true, reconnected: false };
}

  // Reconnexion du gérant
  rejoinAsManager(code, socketId, pseudo) {
    const room = this.rooms[code];
    if (!room) return { success: false, error: 'Salon introuvable' };
    if (room.managerPseudo !== pseudo) return { success: false, error: 'Tu n\'es pas le gérant de ce salon' };

    // Supprime l'ancien socketId du gérant
    const oldSocketId = Object.keys(this.socketToRoom)
      .find(id => this.socketToRoom[id]?.code === code && this.socketToRoom[id]?.isManager);
    if (oldSocketId) delete this.socketToRoom[oldSocketId];

    room.managerSocketId = socketId;
    room.managerOnline = true;
    this.socketToRoom[socketId] = { code, pseudo, isManager: true };
    return { success: true };
  }

  buzz(code, pseudo) {
    const room = this.rooms[code];
    if (!room || room.buzzer !== null) return { success: false };
    if (!room.participants[pseudo]) return { success: false };
    room.buzzer = pseudo;
    return { success: true, pseudo };
  }

  resetBuzz(code, socketId) {
    const room = this.rooms[code];
    if (!room || room.managerSocketId !== socketId) return { success: false };
    room.buzzer = null;
    return { success: true };
  }

  validatePoint(code, socketId) {
    const room = this.rooms[code];
    if (!room || room.managerSocketId !== socketId || !room.buzzer) return { success: false };
    room.participants[room.buzzer].score += 1;
    room.buzzer = null;
    return { success: true };
  }

  endGame(code, socketId) {
    const room = this.rooms[code];
    if (!room || room.managerSocketId !== socketId) return { success: false };
    room.active = false;
    const scores = Object.values(room.participants)
      .sort((a, b) => b.score - a.score);
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
      return { code, isManager: true };
    }

    // Participant : on le marque offline mais on garde ses points
    if (room.participants[pseudo]) {
      room.participants[pseudo].online = false;
    }

    // Ferme le salon seulement si tout le monde est offline
    const anyoneOnline =
      room.managerOnline ||
      Object.values(room.participants).some(p => p.online);
    if (!anyoneOnline) {
      delete this.rooms[code];
      return { code, deleted: true };
    }

    return { code, isManager: false };
  }

  getPublicState(code) {
    const room = this.rooms[code];
    if (!room) return null;
    return {
      code: room.code,
      managerPseudo: room.managerPseudo,
      managerOnline: room.managerOnline,
      participants: Object.values(room.participants),
      buzzer: room.buzzer,
      active: room.active
    };
  }
}