import React, { useState, useEffect } from 'react';
import Home from './pages/Home.jsx';
import Manager from './pages/Manager.jsx';
import Player from './pages/Player.jsx';
import { socket, loadSession, clearSession } from './socket.js';

export default function App() {
  const [view, setView] = useState('loading'); // 'loading' | 'home' | 'manager' | 'player'
  const [roomData, setRoomData] = useState(null);
  const [myInfo, setMyInfo] = useState(null);

  // Au démarrage : vérifie si une session existait
  useEffect(() => {
    const session = loadSession();
    if (!session) {
      setView('home');
      return;
    }

    // Tente de se reconnecter automatiquement
    socket.connect();
    const event = session.isManager ? 'rejoin_as_manager' : 'join_room';
    socket.emit(event, { code: session.code, pseudo: session.pseudo }, (res) => {
      if (res.success) {
        setRoomData(res.room);
        setMyInfo({ pseudo: session.pseudo, isManager: session.isManager });
        setView(session.isManager ? 'manager' : 'player');
      } else {
        // Session expirée ou salon fermé
        clearSession();
        setView('home');
      }
    });
  }, []);

  const handleRoomJoined = ({ room, pseudo, isManager }) => {
    setRoomData(room);
    setMyInfo({ pseudo, isManager });
    setView(isManager ? 'manager' : 'player');
  };

  const handleLeave = () => {
    clearSession();
    setView('home');
    setRoomData(null);
    setMyInfo(null);
  };

  if (view === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: '#fff', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#555' }}>Chargement...</p>
      </div>
    );
  }

  if (view === 'manager') return <Manager initialRoom={roomData} myInfo={myInfo} onLeave={handleLeave} />;
  if (view === 'player') return <Player initialRoom={roomData} myInfo={myInfo} onLeave={handleLeave} />;
  return <Home onRoomJoined={handleRoomJoined} />;
}