import React, { useState } from 'react';
import { socket, saveSession } from '../socket.js';

export default function Home({ onRoomJoined }) {
  const [pseudo, setPseudo] = useState('');
  const [mode, setMode] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    if (!pseudo.trim()) return setError('Entre un pseudo');
    setLoading(true);
    socket.connect();
    socket.emit('create_room', { pseudo }, (res) => {
      setLoading(false);
      if (res.success) {
        saveSession({ code: res.room.code, pseudo, isManager: true });
        onRoomJoined({ room: res.room, pseudo, isManager: true });
      } else {
        setError(res.error || 'Erreur');
      }
    });
  };

  const handleJoin = () => {
    if (!pseudo.trim()) return setError('Entre un pseudo');
    if (!code.trim()) return setError('Entre un code de salon');
    setLoading(true);
    socket.connect();
    socket.emit('join_room', { code: code.toUpperCase(), pseudo }, (res) => {
      setLoading(false);
      if (res.success) {
        saveSession({ code: code.toUpperCase(), pseudo, isManager: false });
        onRoomJoined({ room: res.room, pseudo, isManager: false });
      } else {
        setError(res.error || 'Salon introuvable');
      }
    });
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🎯 Buzzer</h1>
      <p style={styles.subtitle}>Quiz en temps réel</p>

      <div style={styles.card}>
        <input
          style={styles.input}
          placeholder="Ton pseudo"
          value={pseudo}
          onChange={e => { setPseudo(e.target.value); setError(''); }}
        />

        {!mode && (
          <div style={styles.buttonGroup}>
            <button style={styles.btnPrimary} onClick={() => setMode('create')}>
              Créer un salon
            </button>
            <button style={styles.btnSecondary} onClick={() => setMode('join')}>
              Rejoindre un salon
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div>
            <input
              style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: '0.2em' }}
              placeholder="Code du salon"
              value={code}
              maxLength={5}
              onChange={e => { setCode(e.target.value); setError(''); }}
            />
          </div>
        )}

        {mode && (
          <div style={styles.buttonGroup}>
            <button
              style={styles.btnPrimary}
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading ? '...' : mode === 'create' ? 'Créer' : 'Rejoindre'}
            </button>
            <button style={styles.btnGhost} onClick={() => { setMode(null); setError(''); }}>
              Retour
            </button>
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f0f1a',
    color: '#fff',
    fontFamily: 'sans-serif',
  },
  title: { fontSize: '3rem', margin: 0 },
  subtitle: { color: '#888', marginBottom: '2rem' },
  card: {
    background: '#1a1a2e',
    padding: '2rem',
    borderRadius: '1rem',
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid #333',
    background: '#0f0f1a',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  buttonGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  btnPrimary: {
    padding: '0.75rem',
    background: '#e63946',
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  btnSecondary: {
    padding: '0.75rem',
    background: '#2a2a4a',
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  btnGhost: {
    padding: '0.75rem',
    background: 'transparent',
    color: '#888',
    border: '1px solid #333',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  error: { color: '#e63946', margin: 0, fontSize: '0.9rem' },
};