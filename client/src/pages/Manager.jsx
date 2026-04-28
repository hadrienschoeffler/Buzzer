import React, { useState, useEffect } from 'react';
import { socket } from '../socket.js';

export default function Manager({ initialRoom, myInfo, onLeave }) {
  const [room, setRoom] = useState(initialRoom);
  const buzzed = room?.buzzer || null;
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState([]);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    socket.on('room_updated', (updatedRoom) => setRoom(updatedRoom));
    socket.on('game_over', ({ scores }) => {
      setGameOver(true);
      setFinalScores(scores);
    });

    // Reconnexion automatique gérant
    socket.on('disconnect', () => setReconnecting(true));
    socket.on('connect', () => {
      if (reconnecting) {
        socket.emit('rejoin_as_manager', { code: room.code, pseudo: myInfo.pseudo }, (res) => {
          if (res.success) {
            setRoom(res.room);
            setReconnecting(false);
          }
        });
      }
    });

    return () => {
      socket.off('room_updated');
      socket.off('buzzed');
      socket.off('buzz_reset');
      socket.off('game_over');
      socket.off('disconnect');
      socket.off('connect');
    };
  }, [reconnecting, room?.code, myInfo?.pseudo]);

  const resetBuzz = () => socket.emit('reset_buzz', { code: room.code });
  const validatePoint = () => socket.emit('validate_point', { code: room.code });
  const endGame = () => socket.emit('end_game', { code: room.code });

  if (reconnecting) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={{ textAlign: 'center', color: '#e67e22' }}>🔄 Reconnexion en cours...</p>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>🏆 Classement final</h2>
          {finalScores.map((p, i) => (
            <div key={p.pseudo} style={styles.scoreRow}>
              <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
              <span style={{ flex: 1, marginLeft: '0.5rem' }}>{p.pseudo}</span>
              <span style={{ fontWeight: 'bold' }}>{p.score} pt{p.score > 1 ? 's' : ''}</span>
            </div>
          ))}
          <button style={styles.btnGhost} onClick={onLeave}>Quitter</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Salon <span style={styles.code}>{room?.code}</span></h2>
          <p style={styles.role}>👑 Gérant</p>
        </div>

        {/* Zone buzzer */}
        <div style={{ ...styles.buzzerZone, background: buzzed ? '#e6394622' : '#0f0f1a', borderColor: buzzed ? '#e63946' : '#333' }}>
          {buzzed
            ? <><span style={styles.buzzLabel}>⚡ A buzzé !</span><span style={styles.buzzName}>{buzzed}</span></>
            : <span style={styles.waiting}>En attente d'un buzz...</span>
          }
        </div>

        {buzzed && (
          <div style={styles.actionGroup}>
            <button style={styles.btnSuccess} onClick={validatePoint}>✅ +1 point</button>
            <button style={styles.btnDanger} onClick={resetBuzz}>🔄 Reset</button>
          </div>
        )}

        {/* Participants */}
        <div>
          <h3 style={styles.sectionTitle}>Participants ({room?.participants?.filter(p => p.online).length || 0} / {room?.participants?.length || 0})</h3>
          {room?.participants?.length === 0
            ? <p style={styles.empty}>Aucun participant pour l'instant...</p>
            : room?.participants?.map(p => (
              <div key={p.pseudo} style={{ ...styles.playerRow, opacity: p.online ? 1 : 0.4 }}>
                <span style={{ flex: 1 }}>
                  {p.pseudo}
                  {!p.online && <span style={{ fontSize: '0.75rem', color: '#e67e22', marginLeft: '0.4rem' }}>• absent</span>}
                </span>
                <span style={styles.score}>{p.score} pt{p.score > 1 ? 's' : ''}</span>
              </div>
            ))
          }
        </div>

        <button style={styles.btnEnd} onClick={endGame}>🏁 Terminer la partie</button>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: '#fff', fontFamily: 'sans-serif' },
  card: { background: '#1a1a2e', padding: '2rem', borderRadius: '1rem', width: '360px', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '1.4rem' },
  code: { background: '#e63946', padding: '0.1rem 0.5rem', borderRadius: '0.3rem', fontSize: '1.1rem', letterSpacing: '0.1em' },
  role: { margin: 0, color: '#ffd700', fontWeight: 'bold' },
  buzzerZone: { border: '2px solid', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center', transition: 'all 0.3s' },
  buzzLabel: { display: 'block', color: '#e63946', fontWeight: 'bold', marginBottom: '0.5rem' },
  buzzName: { display: 'block', fontSize: '1.5rem', fontWeight: 'bold' },
  waiting: { color: '#555' },
  actionGroup: { display: 'flex', gap: '0.75rem' },
  btnSuccess: { flex: 1, padding: '0.75rem', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' },
  btnDanger: { flex: 1, padding: '0.75rem', background: '#e67e22', color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' },
  btnEnd: { padding: '0.75rem', background: '#2a2a4a', color: '#aaa', border: '1px solid #444', borderRadius: '0.5rem', fontSize: '0.95rem', cursor: 'pointer' },
  btnGhost: { padding: '0.75rem', background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' },
  sectionTitle: { margin: '0 0 0.5rem', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em' },
  playerRow: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #222' },
  scoreRow: { display: 'flex', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #222' },
  score: { color: '#e63946', fontWeight: 'bold' },
  empty: { color: '#555', fontSize: '0.9rem', margin: 0 },
};