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
    socket.emit('create_room', { pseudo: pseudo.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        saveSession({ code: res.room.code, pseudo: pseudo.trim(), isManager: true });
        onRoomJoined({ room: res.room, pseudo: pseudo.trim(), isManager: true });
      } else {
        setError(res.error || 'Erreur');
      }
    });
  };

  const handleJoin = () => {
    if (!pseudo.trim()) return setError('Entre un pseudo');
    if (!code.trim()) return setError('Entre un code de salon');
    setLoading(true);

    const cleanCode = code.trim().toUpperCase();

    socket.connect();
    socket.emit('join_room', { code: cleanCode, pseudo: pseudo.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        saveSession({ code: cleanCode, pseudo: pseudo.trim(), isManager: false });
        onRoomJoined({ room: res.room, pseudo: pseudo.trim(), isManager: false });
      } else {
        setError(res.error || 'Salon introuvable');
      }
    });
  };

  const resetChoice = () => {
    setMode(null);
    setPseudo('');
    setCode('');
    setError('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundGlow} />

      <main style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.logo}/>
          <h1 style={styles.title}>Buzzer</h1>
          <p style={styles.subtitle}>avec quiz en voc</p>
        </div>

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

        {mode && (
          <div style={styles.form}>
            <input
              style={styles.input}
              placeholder="Pseudo"
              value={pseudo}
              onChange={(e) => {
                setPseudo(e.target.value);
                setError('');
              }}
              autoFocus
            />

            {mode === 'join' && (
              <input
                style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: '0.16em' }}
                placeholder="Code du salon"
                value={code}
                maxLength={5}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError('');
                }}
              />
            )}

            <button
              style={styles.btnPrimary}
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading ? 'Connexion...' : mode === 'create' ? 'Créer le salon' : 'Entrer dans le salon'}
            </button>

            <button style={styles.btnGhost} onClick={resetChoice}>
              Retour
            </button>
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at top, #251827 0%, #0d0d14 45%, #08080d 100%)',
    color: '#fff',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: '1.5rem',
  },
  backgroundGlow: {
    position: 'absolute',
    width: '420px',
    height: '420px',
    borderRadius: '50%',
    background: 'rgba(230, 57, 70, 0.18)',
    filter: 'blur(80px)',
    top: '-120px',
    right: '-100px',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '390px',
    background: 'rgba(24, 24, 38, 0.86)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(16px)',
    borderRadius: '1.4rem',
    padding: '2.2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.6rem',
  },
  brand: {
    textAlign: 'center',
  },
  logo: {
  width: '48px',
  height: '48px',
  margin: '0 auto 1rem',
  borderRadius: '50%',
  background: 'radial-gradient(circle, #ff5b50 0%, #e63946 60%, #7a1c1c 100%)',
  boxShadow: '0 0 25px rgba(230, 57, 70, 0.6)',
},
  title: {
    margin: 0,
    fontSize: '2.8rem',
    letterSpacing: '-0.08em',
    lineHeight: 1,
  },
  subtitle: {
    color: '#a6a6b8',
    margin: '0.65rem 0 0',
    fontSize: '1rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  input: {
    padding: '0.9rem 1rem',
    borderRadius: '0.8rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(10, 10, 18, 0.9)',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  btnPrimary: {
    padding: '0.95rem',
    background: 'linear-gradient(135deg, #e63946, #ff5b50)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.8rem',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '800',
    boxShadow: '0 14px 30px rgba(230, 57, 70, 0.25)',
  },
  btnSecondary: {
    padding: '0.95rem',
    background: 'rgba(255, 255, 255, 0.07)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '0.8rem',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '700',
  },
  btnGhost: {
    padding: '0.85rem',
    background: 'transparent',
    color: '#8d8da3',
    border: 'none',
    borderRadius: '0.8rem',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  error: {
    color: '#ff6b5f',
    margin: 0,
    textAlign: 'center',
    fontSize: '0.9rem',
  },
};