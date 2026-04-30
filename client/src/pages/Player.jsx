import React, { useState, useEffect } from 'react';
import { socket } from '../socket.js';

export default function Player({ initialRoom, myInfo, onLeave }) {
  const [room, setRoom] = useState(initialRoom);
  const buzzed = room?.buzzer || null;
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState([]);
  const [managerOnline, setManagerOnline] = useState(initialRoom?.managerOnline ?? true);
  const [reconnecting, setReconnecting] = useState(false);
  const [notification, setNotification] = useState(null);

  const alreadyBuzzed = room?.alreadyBuzzedThisQuestion?.includes(myInfo.pseudo);
  const oneBuzzPerQuestion = room?.settings?.oneBuzzPerQuestion;
  const noOneCanBuzz =
    oneBuzzPerQuestion &&
    !buzzed &&
    room?.participants?.some((p) => p.online) &&
    room?.remainingCanBuzzCount === 0;

  const canBuzz =
    !buzzed &&
    !gameOver &&
    managerOnline &&
    (!oneBuzzPerQuestion || !alreadyBuzzed) &&
    !noOneCanBuzz;

  useEffect(() => {
    socket.on('room_updated', (updatedRoom) => {
      setRoom(updatedRoom);
      setManagerOnline(updatedRoom.managerOnline);
    });
    socket.on('notification', ({ message }) => {
      setNotification(message);
      setTimeout(() => setNotification(null), 2500);
    });

    socket.on('manager_left', () => setManagerOnline(false));
    socket.on('manager_back', () => setManagerOnline(true));

    socket.on('game_over', ({ scores }) => {
      setGameOver(true);
      setFinalScores(scores);
    });

    // Reconnexion automatique si coupure réseau
    socket.on('disconnect', () => setReconnecting(true));
    socket.on('connect', () => {
      if (reconnecting) {
        socket.emit('join_room', { code: room.code, pseudo: myInfo.pseudo }, (res) => {
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
      socket.off('manager_left');
      socket.off('manager_back');
      socket.off('game_over');
      socket.off('disconnect');
      socket.off('connect');
      socket.off('notification');
    };
  }, [reconnecting, room?.code, myInfo?.pseudo]);

  const handleBuzz = () => {
    if (!canBuzz) return;
    socket.emit('buzz', { code: room.code, pseudo: myInfo.pseudo });
  };

  const myScore = room?.participants?.find(p => p.pseudo === myInfo.pseudo)?.score ?? 0;
  const isBuzzer = buzzed === myInfo.pseudo;

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
    const myRank = finalScores.findIndex(p => p.pseudo === myInfo.pseudo) + 1;
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>🏆 Classement final</h2>
          {finalScores.map((p, i) => (
            <div key={p.pseudo} style={{ ...styles.scoreRow, background: p.pseudo === myInfo.pseudo ? '#e6394611' : 'transparent' }}>
              <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
              <span style={{ flex: 1, marginLeft: '0.5rem', fontWeight: p.pseudo === myInfo.pseudo ? 'bold' : 'normal' }}>{p.pseudo}</span>
              <span style={{ fontWeight: 'bold' }}>{p.score} pt{p.score > 1 ? 's' : ''}</span>
            </div>
          ))}
          <p style={{ color: '#888', textAlign: 'center' }}>Tu termines {myRank === 1 ? '🥇 1er' : `${myRank}ème`} !</p>
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
            <span style={styles.myScore}>{myScore} pt{myScore > 1 ? 's' : ''}</span>
        </div>

        {/* Bannière gérant absent */}
        {!managerOnline && (
          <div style={styles.warningBanner}>
            ⏸️ Le gérant est déconnecté, la partie est en pause...
          </div>
        )}
        {notification && (
          <div style={styles.notification}>
            {notification}
          </div>
        )}

        {/* Buzzer */}
        <div style={styles.buzzerContainer}>
          <button
            style={{
              ...styles.buzzer,
              ...(isBuzzer ? styles.buzzerWinner : canBuzz ? styles.buzzerActive : styles.buzzerDisabled),
            }}
            onClick={handleBuzz}
            disabled={!canBuzz}
          >
            {isBuzzer
              ? 'À toi'
              : canBuzz
                ? 'BUZZ'
                : noOneCanBuzz
                  ? 'Terminé'
                  : alreadyBuzzed
                    ? 'Déjà répondu'
                    : buzzed
                      ? buzzed
                      : '...'}
           </button>
        </div>

        <div style={styles.status}>
          {isBuzzer && <p style={styles.statusWin}>À toi de répondre.</p>}
          {buzzed && !isBuzzer && <p style={styles.statusLost}>{buzzed} a la main.</p>}
          {!buzzed && canBuzz && <p style={styles.statusWaiting}>Prêt à buzzer.</p>}
          {!buzzed && alreadyBuzzed && !noOneCanBuzz && (
            <p style={styles.statusLost}>Tu as déjà répondu à cette question.</p>
          )}
          {noOneCanBuzz && <p style={styles.statusWaiting}>En attente de la prochaine question.</p>}
          {!managerOnline && <p style={styles.statusWaiting}>La partie est en pause.</p>}
        </div>

        {/* Classement */}
        {/* <div>
          <h3 style={styles.sectionTitle}>Classement</h3>
          {room?.participants
            ?.slice()
            .sort((a, b) => b.score - a.score)
            .map((p, i) => (
              <div key={p.pseudo} style={{ ...styles.playerRow, background: p.pseudo === myInfo.pseudo ? '#e6394611' : 'transparent', opacity: p.online ? 1 : 0.4 }}>
                <span style={{ color: '#888', width: '1.5rem' }}>{i + 1}.</span>
                <span style={{ flex: 1 }}>{p.pseudo} {!p.online && <span style={{ fontSize: '0.75rem', color: '#e67e22' }}>• absent</span>}</span>
                <span style={styles.score}>{p.score}</span>
              </div>
            ))
          }
        </div> */}
      </div>
    </div>
  );
}

const styles = {
  container: {
  minHeight: '100dvh',
  width: '100%',
  overflowX: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0f0f1a',
  color: '#fff',
  fontFamily: 'sans-serif',
  padding: '1rem',
},
  card: { width: '100%',
  maxWidth: '390px', background: '#1a1a2e', padding: '2rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '1.3rem' },
  code: { background: '#e63946', padding: '0.1rem 0.5rem', borderRadius: '0.3rem', letterSpacing: '0.1em' },
  myScore: { color: '#ffd700', fontWeight: 'bold' },
  warningBanner: { background: '#e67e2222', border: '1px solid #e67e22', borderRadius: '0.5rem', padding: '0.75rem', color: '#e67e22', fontSize: '0.9rem', textAlign: 'center' },
  notification: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#ddd', borderRadius: '0.6rem', padding: '0.65rem 0.8rem', fontSize: '0.9rem', textAlign: 'center' },
  buzzerContainer: { display: 'flex', justifyContent: 'center', padding: '1rem 0' },
  buzzer: { width: '160px', height: '160px', borderRadius: '50%', border: 'none', fontSize: '1.8rem', fontWeight: '900', cursor: 'pointer', transition: 'all 0.15s' },
  buzzerActive: { background: '#e63946', color: '#fff', boxShadow: '0 0 40px #e6394688' },
  buzzerDisabled: { background: '#2a2a4a', color: '#555', cursor: 'not-allowed' },
  buzzerWinner: { background: '#2ecc71', color: '#fff', boxShadow: '0 0 40px #2ecc7188' },
  status: { textAlign: 'center', minHeight: '2rem' },
  statusWin: { color: '#2ecc71', fontWeight: 'bold', margin: 0 },
  statusLost: { color: '#e67e22', margin: 0 },
  statusWaiting: { color: '#555', margin: 0 },
  sectionTitle: { margin: '0 0 0.5rem', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em' },
  playerRow: { display: 'flex', alignItems: 'center', padding: '0.4rem 0.5rem', borderRadius: '0.3rem' },
  scoreRow: { display: 'flex', alignItems: 'center', padding: '0.6rem 0.5rem', borderRadius: '0.3rem', borderBottom: '1px solid #222' },
  score: { color: '#e63946', fontWeight: 'bold', minWidth: '2rem', textAlign: 'right' },
  btnGhost: { padding: '0.75rem', background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' },
};