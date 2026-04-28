import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false
});

// Sauvegarde la session dans localStorage
export const saveSession = ({ code, pseudo, isManager }) => {
  localStorage.setItem('buzzer_session', JSON.stringify({ code, pseudo, isManager }));
};

// Récupère la session sauvegardée
export const loadSession = () => {
  try {
    const raw = localStorage.getItem('buzzer_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Efface la session
export const clearSession = () => {
  localStorage.removeItem('buzzer_session');
};