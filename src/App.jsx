import React, { useState } from 'react';
import { useGame } from './hooks/useGame';
import GameBoard from './components/GameBoard';
import { sanitizeRoomId } from './utils/validation';
import { generateRandomName } from './utils/nameGenerator';
import './index.css';
import './components/GameBoard.css';
import './components/LobbySettings.css';

const CHEAT_OPTIONS = [
  { value: '', label: 'None', description: 'No cheat assigned' },
  { value: 'peek', label: 'Peek', description: 'See one opponent die' },
  { value: 'shield', label: 'Shield', description: 'Absorb one hit' },
  { value: 'loaded_die', label: 'Loaded Die', description: 'Re-roll one die' },
  { value: 'slip', label: 'Slip', description: 'Gain 1 extra die' },
  { value: 'magic_dice', label: 'Magic Dice', description: 'Gain 2 extra dice' },
];

function App() {
  const game = useGame();
  const {
    gameState, players, currentTurn, currentBid, myDice,
    isHost, error, peerId, connections, challengeResult,
    gameOptions, myCheat, myCheatUsed, peekInfo, loadedDieActive, gameLog,
    setGameOptions, assignCheat,
    startRoom, joinRoom, startRound, placeBid, challenge,
    usePeek, activateLoadedDie, rerollDie, dismissPeek, useSlip, useMagicDice, selectCheat,
    downloadTextLog, downloadJSONLog,
  } = game;

  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [inLobby, setInLobby] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Prevent accidental refresh
  React.useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!inLobby) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [inLobby]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateRoom = async () => {
    if (!playerName) return alert('Enter a name!');
    const success = await startRoom(playerName);
    if (success) {
      setInLobby(false);
    } else {
      alert('Failed to connect to the signaling server. Try again, ya scallywag!');
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName || !roomId) return alert('Name and Room ID required!');
    const sanitizedRoomId = sanitizeRoomId(roomId);
    if (!sanitizedRoomId) return alert('Invalid Room ID!');
    await joinRoom(sanitizedRoomId, playerName);
    setInLobby(false);
  };

  const handleRandomName = () => {
    setPlayerName(generateRandomName());
  };

  // Human-readable summary of current rules
  const rulesSummary = [
    `${gameOptions.startingDice} dice`,
    gameOptions.wildsEnabled ? 'Wild 1s' : 'No wilds',
    gameOptions.eliminationThreshold > 0
      ? `Elim. at ${gameOptions.eliminationThreshold}`
      : 'Standard elim.',
  ].join(' · ');

  return (
    <div className="game-container">
      {inLobby ? (
        <div className="lobby-overlay">
          <div className="parchment-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'left', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <img src={`${import.meta.env.BASE_URL}images/dice-hero-v2.png`} alt="Hero Dice" style={{ width: '120px', height: 'auto', flexShrink: 0 }} />
              <div style={{ textAlign: 'left' }}>
                <h1 style={{ margin: 0, paddingBottom: '0.2rem', borderBottom: 'none' }}>Liar&apos;s Dice</h1>
                <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.8 }}>
                  Need a gambling system in your D&D game?<br />
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-ink)' }}>
                    Here you go! Minimal BS.
                  </span>
                </p>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Player Name</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                <input
                  className="input-nautical"
                  type="text"
                  placeholder="Captain Redbeard"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button 
                  className="btn-nautical" 
                  onClick={handleRandomName}
                  style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                  title="Generate random pirate name"
                >
                  Randomize
                </button>
              </div>
            </div>

            <div className="form-divider" style={{ borderTop: '1px solid rgba(0,0,0,0.1)', margin: '1.5rem 0' }}></div>

            <div className="lobby-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button className="btn-nautical" onClick={handleCreateRoom}>
                New Table
              </button>

              <div style={{ textAlign: 'center', opacity: 0.6 }}>— OR —</div>

              <div className="join-fields">
                <input
                  className="input-nautical"
                  type="text"
                  placeholder="Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  style={{ width: '100%', marginBottom: '1rem' }}
                />
                <button className="btn-nautical" onClick={handleJoinRoom} style={{ width: '100%' }}>
                  Join Table
                </button>
              </div>
            </div>

            {error && <p style={{ color: 'var(--color-blood)', marginTop: '1rem' }}>{error}</p>}
          </div>

          <div className="lobby-footer">
            &copy; {new Date().getFullYear()} Liar&apos;s Dice. Licensed under GPLv3.<br />
            Check out the <a style={{ color: 'var(--color-gold)', marginTop: '1rem' }} href="https://github.com/haa-gg/liars-dice" target="_blank">github repo</a>
          </div>
        </div>
      ) : (
        <div className="game-screen" style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div className="room-info">
            <div className="room-id-badge" onClick={copyRoomId} title="Click to copy Room ID">
              <span className="room-id-label">Room ID</span>
              <span className="room-id-value">{peerId}</span>
              <span className={`room-id-copy ${copied ? 'copied' : ''}`}>
                {copied ? '✓ Copied!' : '⎘ Copy'}
              </span>
            </div>
            <span className="room-player-count">👥 {players.length} player{players.length !== 1 ? 's' : ''}</span>

            {isHost && (
              <button
                className={`settings-toggle-btn ${showSettings ? 'active' : ''}`}
                onClick={() => setShowSettings(v => !v)}
                title="Game Settings"
              >
                ⚙ Settings
              </button>
            )}
            {!isHost && (
              <span className="rules-badge">📜 {rulesSummary}</span>
            )}
          </div>

          {/* ── HOST SETTINGS PANEL ── */}
          {isHost && showSettings && (
            <div className="settings-panel parchment-panel">
              <h3>⚙ Game Settings</h3>

              <div className="settings-section">
                <h4>Global Rules</h4>

                <div className="settings-row">
                  <label>Starting Dice</label>
                  <select
                    className="input-nautical settings-select"
                    value={gameOptions.startingDice}
                    onChange={e => setGameOptions({ startingDice: Number(e.target.value) })}
                    disabled={gameState !== 'LOBBY'}
                    style={{ opacity: gameState !== 'LOBBY' ? 0.5 : 1 }}
                  >
                    {[3, 4, 5, 6, 7].map(n => (
                      <option key={n} value={n}>{n} dice</option>
                    ))}
                  </select>
                </div>

                <div className="settings-row">
                  <label>Eliminate At</label>
                  <select
                    className="input-nautical settings-select"
                    value={gameOptions.eliminationThreshold}
                    onChange={e => setGameOptions({ eliminationThreshold: Number(e.target.value) })}
                    disabled={gameState !== 'LOBBY'}
                    style={{ opacity: gameState !== 'LOBBY' ? 0.5 : 1 }}
                  >
                    <option value={0}>0 dice (standard)</option>
                    <option value={1}>1 die left</option>
                    <option value={2}>2 dice left</option>
                    <option value={3}>3 dice left (quick)</option>
                    <option value={4}>4 dice left (blitz)</option>
                  </select>
                </div>

                <div className="settings-row">
                  <label>1s Are Wild</label>
                  <button
                    className={`toggle-btn ${gameOptions.wildsEnabled ? 'on' : 'off'}`}
                    onClick={() => setGameOptions({ wildsEnabled: !gameOptions.wildsEnabled })}
                    disabled={gameState !== 'LOBBY'}
                    style={{ opacity: gameState !== 'LOBBY' ? 0.5 : 1, cursor: gameState !== 'LOBBY' ? 'not-allowed' : 'pointer' }}
                  >
                    {gameOptions.wildsEnabled ? '✓ On' : '✗ Off'}
                  </button>
                </div>

                <div className="settings-row">
                  <label>Honor System Cheats</label>
                  <button
                    className={`toggle-btn ${gameOptions.honorSystemCheats ? 'on' : 'off'}`}
                    onClick={() => setGameOptions({ honorSystemCheats: !gameOptions.honorSystemCheats })}
                    disabled={gameState !== 'LOBBY'}
                    style={{ opacity: gameState !== 'LOBBY' ? 0.5 : 1, cursor: gameState !== 'LOBBY' ? 'not-allowed' : 'pointer' }}
                  >
                    {gameOptions.honorSystemCheats ? '✓ On' : '✗ Off'}
                  </button>
                </div>
                {gameOptions.honorSystemCheats && (
                  <p className="settings-sub" style={{ marginTop: '-0.5rem', fontSize: '0.75rem', opacity: 0.7 }}>
                    Players choose their own cheat each round
                  </p>
                )}
              </div>

              {players.length > 0 && !gameOptions.honorSystemCheats && (
                <div className="settings-section">
                  <h4>Cheats</h4>
                  <p className="settings-sub">Assign one secret cheat to any player.</p>
                  {players.map(p => (
                    <div key={p.id} className="settings-row">
                      <label>{p.name}{p.id === peerId ? ' (you)' : ''}</label>
                      <select
                        className="input-nautical settings-select"
                        value={p.cheat || ''}
                        onChange={e => assignCheat(p.id, e.target.value)}
                        disabled={gameState !== 'LOBBY'}
                        style={{ opacity: gameState !== 'LOBBY' ? 0.5 : 1 }}
                        title={p.cheat ? CHEAT_OPTIONS.find(opt => opt.value === p.cheat)?.description : 'Select a cheat'}
                      >
                        {CHEAT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <GameBoard
            players={players}
            myDice={myDice}
            currentTurn={currentTurn}
            currentBid={currentBid}
            isMyTurn={currentTurn === peerId}
            onBid={placeBid}
            onChallenge={challenge}
            gameState={gameState}
            challengeResult={challengeResult}
            isHost={isHost}
            onNextRound={startRound}
            peerId={peerId}
            myCheat={myCheat}
            myCheatUsed={myCheatUsed}
            peekInfo={peekInfo}
            loadedDieActive={loadedDieActive}
            gameLog={gameLog}
            gameOptions={gameOptions}
            onUsePeek={usePeek}
            onActivateLoadedDie={activateLoadedDie}
            onRerollDie={rerollDie}
            onDismissPeek={dismissPeek}
            onUseSlip={useSlip}
            onUseMagicDice={useMagicDice}
            onSelectCheat={selectCheat}
            onDownloadTextLog={downloadTextLog}
            onDownloadJSONLog={downloadJSONLog}
          />
        </div>
      )}
    </div>
  );
}

export default App;
