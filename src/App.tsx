import { useState, useEffect } from 'react';
import { useGame, UseGameReturn } from './hooks/useGame';
import GameBoard from './components/GameBoard';
import { sanitizeRoomId } from './utils/validation';
import { generateRandomName } from './utils/nameGenerator';
import { CheatType } from './types';
import './index.css';
import './components/GameBoard.css';
import './components/LobbySettings.css';
import { IconScroll, IconGear, IconUsers, IconCheck, IconCross, IconCopy } from './components/Icons';

interface CheatOption {
    value: CheatType | '';
    label: string;
    description: string;
}

const CHEAT_OPTIONS: CheatOption[] = [
    { value: '', label: 'None', description: 'No cheat assigned' },
    { value: 'peek', label: 'Peek', description: 'See one opponent die' },
    { value: 'shield', label: 'Shield', description: 'Absorb one hit' },
    { value: 'loaded_die', label: 'Loaded Die', description: 'Re-roll one die' },
    { value: 'slip', label: 'Slip', description: 'Gain 1 extra die' },
    { value: 'magic_dice', label: 'Magic Dice', description: 'Gain 2 extra dice' },
];

interface SessionData {
    isHost: boolean;
    playerName: string;
    roomId: string;
    timestamp: number;
}

function App() {
    const game: UseGameReturn = useGame();
    const {
        gameState, players, currentTurn, currentBid, myDice,
        isHost, error, peerId, challengeResult,
        gameOptions, myCheat, myCheatUsed, peekInfo, loadedDieActive, gameLog, nextRoundVotes,
        isReconnecting, reconnect,
        setGameOptions, assignCheat,
        startRoom, joinRoom, rejoinRoom, placeBid, challenge,
        usePeek, activateLoadedDie, rerollDie, dismissPeek, useSlip, useMagicDice, selectCheat,
        downloadTextLog, downloadJSONLog, voteNextRound, kickPlayer,
    } = game;

    const [playerName, setPlayerName] = useState<string>('');
    const [roomId, setRoomId] = useState<string>('');
    const [inLobby, setInLobby] = useState<boolean>(true);
    const [copied, setCopied] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [canReconnect, setCanReconnect] = useState<boolean>(false);

    // Prevent accidental refresh
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!inLobby) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [inLobby]);

    // Session expiration and renewal logic
    useEffect(() => {
        const checkOrRenewSession = () => {
            const sessionStr = localStorage.getItem('liarsDiceSession');
            const peerIdStr = localStorage.getItem('liarsDicePeerId');

            if (!sessionStr || !peerIdStr) {
                setCanReconnect(false);
                return;
            }

            try {
                const session: SessionData = JSON.parse(sessionStr);

                if (!inLobby) {
                    // If active in a game, keep renewing the timestamp to prevent expiration
                    session.timestamp = Date.now();
                    localStorage.setItem('liarsDiceSession', JSON.stringify(session));
                }

                // Expire session after 1 hour (3600000ms) of inactivity, or if no timestamp exists (legacy session)
                if (!session.timestamp || (Date.now() - session.timestamp > 3600000)) {
                    localStorage.removeItem('liarsDiceSession');
                    localStorage.removeItem('liarsDicePeerId');
                    setCanReconnect(false);
                } else {
                    setCanReconnect(true);
                }
            } catch (e) {
                setCanReconnect(false);
            }
        };

        checkOrRenewSession();
        // Check every 10 seconds
        const interval = setInterval(checkOrRenewSession, 10000);
        return () => clearInterval(interval);
    }, [inLobby]);

    const copyRoomId = () => {
        const codeToCopy = (isHost ? peerId : roomId) || '';
        navigator.clipboard.writeText(codeToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCreateRoom = async () => {
        if (!playerName) return alert('Enter a name!');
        if (isConnecting) return;
        setIsConnecting(true);
        const success = await startRoom(playerName);
        setIsConnecting(false);
        if (success) {
            localStorage.setItem('liarsDiceSession', JSON.stringify({ isHost: true, playerName, roomId: peerId, timestamp: Date.now() }));
            setInLobby(false);
        } else {
            alert('Failed to connect to the signaling server. Try again, ya scallywag!');
        }
    };

    const handleJoinRoom = async () => {
        if (!playerName || !roomId) return alert('Name and Room ID required!');
        const sanitizedRoomId = sanitizeRoomId(roomId);
        if (!sanitizedRoomId) return alert('Invalid Room ID!');

        if (isConnecting) return;
        setIsConnecting(true);

        try {
            await joinRoom(sanitizedRoomId, playerName);
            localStorage.setItem('liarsDiceSession', JSON.stringify({ isHost: false, playerName, roomId: sanitizedRoomId, timestamp: Date.now() }));
            setInLobby(false);
        } catch (err: any) {
            alert(`Failed to join room: ${err.message}`);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleReconnect = async () => {
        const sessionStr = localStorage.getItem('liarsDiceSession');
        if (!sessionStr) return alert('No previous session found!');
        const session: SessionData = JSON.parse(sessionStr);

        if (isConnecting || isReconnecting) return;
        setIsConnecting(true);

        try {
            const id = await reconnect();
            if (id) {
                // If we were a client, we need to rejoin the host
                if (!session.isHost && session.roomId) {
                    await rejoinRoom(session.roomId, session.playerName);
                    setRoomId(session.roomId);
                }
                setPlayerName(session.playerName);
                setInLobby(false);
            }
        } catch (err: any) {
            if (err.message && err.message.includes('is taken')) {
                // If the ID is taken on the server, this session is unrecoverable. Clear it.
                localStorage.removeItem('liarsDiceSession');
                localStorage.removeItem('liarsDicePeerId');
                setCanReconnect(false);
                alert(`Failed to reconnect: the session ID is currently active or captured by another player.`);
            } else {
                alert(`Reconnection failed: ${err.message}`);
            }
        } finally {
            setIsConnecting(false);
        }
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
                                <div style={{ margin: 0, fontStyle: 'italic', opacity: 0.8 }}>
                                    A multiplayer pirate-themed bluffing game<br />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-ink)' }}>
                                        "But I have no idea how to play this :("<br />
                                        Fear not! Tap the (?) button in the bottom right once you're in a lobby for rules.
                                    </span>
                                </div>
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
                            <button className="btn-nautical" onClick={handleCreateRoom} disabled={isConnecting}>
                                {isConnecting ? 'Starting...' : 'New Table'}
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
                                <button className="btn-nautical" onClick={handleJoinRoom} disabled={isConnecting} style={{ width: '100%' }}>
                                    {isConnecting ? 'Joining...' : 'Join Table'}
                                </button>
                            </div>

                            {canReconnect && (
                                <button
                                    className="btn-nautical"
                                    onClick={handleReconnect}
                                    disabled={isReconnecting}
                                    style={{ width: '100%', marginTop: '0.5rem', backgroundColor: 'var(--color-ink)' }}
                                >
                                    {isReconnecting ? 'Reconnecting...' : 'Reconnect to Last Game'}
                                </button>
                            )}
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
                            <span className="room-id-value">{isHost ? peerId : roomId}</span>
                            <span className={`room-id-copy ${copied ? 'copied' : ''}`}>
                                {copied ? <><IconCheck style={{ marginRight: '0.2rem' }} /> Copied!</> : <><IconCopy style={{ marginRight: '0.2rem' }} /> Copy</>}
                            </span>
                        </div>
                        <span className="room-player-count">
                            <IconUsers style={{ marginRight: '0.3rem' }} /> {players.length} player{players.length !== 1 ? 's' : ''}
                        </span>

                        {isHost && (
                            <button
                                className={`settings-toggle-btn ${showSettings ? 'active' : ''}`}
                                onClick={() => setShowSettings(v => !v)}
                                title="Game Settings"
                            >
                                <IconGear style={{ marginRight: '0.3rem' }} /> Settings
                            </button>
                        )}
                        {!isHost && (
                            <span className="rules-badge">
                                <IconScroll style={{ marginRight: '0.3rem' }} /> {rulesSummary}
                            </span>
                        )}
                    </div>

                    {/* ── HOST SETTINGS PANEL ── */}
                    {isHost && showSettings && (
                        <div className="settings-panel parchment-panel">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>⚙ Game Settings</h3>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer',
                                        padding: '0.2rem 0.5rem',
                                        color: 'var(--color-ink)',
                                        opacity: 0.7,
                                        lineHeight: 1,
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Close settings"
                                    aria-label="Close settings"
                                >
                                    <IconCross />
                                </button>
                            </div>

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
                                        style={{ opacity: gameState !== 'LOBBY' ? 0.5 : 1, cursor: gameState !== 'LOBBY' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                    >
                                        {gameOptions.wildsEnabled ? <><IconCheck /> On</> : <><IconCross /> Off</>}
                                    </button>
                                </div>

                                <div className="settings-row">
                                    <label>Honor System Cheats</label>
                                    <button
                                        className={`toggle-btn ${gameOptions.honorSystemCheats ? 'on' : 'off'}`}
                                        onClick={() => setGameOptions({ honorSystemCheats: !gameOptions.honorSystemCheats })}
                                        disabled={gameState !== 'LOBBY'}
                                        style={{ opacity: gameState !== 'LOBBY' ? 0.5 : 1, cursor: gameState !== 'LOBBY' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                    >
                                        {gameOptions.honorSystemCheats ? <><IconCheck /> On</> : <><IconCross /> Off</>}
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
                                                onChange={e => assignCheat(p.id, e.target.value as CheatType)}
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
                        onNextRound={voteNextRound}
                        peerId={peerId}
                        myCheat={myCheat}
                        myCheatUsed={myCheatUsed}
                        peekInfo={peekInfo}
                        loadedDieActive={loadedDieActive}
                        gameLog={gameLog}
                        gameOptions={gameOptions}
                        nextRoundVotes={nextRoundVotes}
                        onUsePeek={usePeek}
                        onActivateLoadedDie={activateLoadedDie}
                        onRerollDie={rerollDie}
                        onDismissPeek={dismissPeek}
                        onUseSlip={useSlip}
                        onUseMagicDice={useMagicDice}
                        onSelectCheat={selectCheat}
                        onDownloadTextLog={downloadTextLog}
                        onDownloadJSONLog={downloadJSONLog}
                        onKickPlayer={kickPlayer}
                    />
                </div>
            )}
        </div>
    );
}

export default App;
