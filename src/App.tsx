import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useGame, UseGameReturn } from './hooks/useGame';
import peerService from './services/peerService';
import GameBoard from './components/GameBoard';
import { sanitizeRoomId } from './utils/validation';
import { generateRandomName } from './utils/nameGenerator';
import { CheatType } from './types';
import './index.css';
import './components/GameBoard.css';
import './components/LobbySettings.css';
import { IconScroll, IconGear, IconUsers, IconCheck, IconCross, IconCopy } from './components/Icons';
import MainMenu from './components/MainMenu';
import TutorialOverlay from './components/TutorialOverlay';
import { useTutorialGame } from './hooks/useTutorialGame';
import DmTutorialOverlay from './components/DmTutorialOverlay';
import { useDmTutorial } from './hooks/useDmTutorial';
import { SettingsProvider } from './hooks/SettingsContext';
import PrivacyPolicy from './components/PrivacyPolicy';

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

// @ts-ignore
const BASE_URL = import.meta.env.BASE_URL;

interface Rule {
    icon: React.ReactNode;
    text: string;
}

const iconStyle = { width: '1.2em', height: '1.2em', verticalAlign: 'middle' };

const RULES: Rule[] = [
    { icon: <img src={`${BASE_URL}images/dice-hero-v2.png`} alt="dice" style={iconStyle} />, text: 'Each player holds 5 dice, kept secret from others.' },
    { icon: <img src={`${BASE_URL}images/megaphone.png`} alt="megaphone" style={iconStyle} />, text: 'On your turn, bid how many dice of a face value exist across ALL hands (e.g. "three 4s").' },
    { icon: <img src={`${BASE_URL}images/ace-of-spades.png`} alt="ace" style={iconStyle} />, text: 'Each bid must raise the count — or same count with a higher face.' },
    { icon: <img src={`${BASE_URL}images/cards.png`} alt="cards" style={iconStyle} />, text: '1s are wild — they count as any face.' },
    { icon: <img src={`${BASE_URL}images/bell-2.png`} alt="bell" style={iconStyle} />, text: 'Call "Liar!" to challenge the last bid.' },
    { icon: <img src={`${BASE_URL}images/scales.png`} alt="scales" style={iconStyle} />, text: 'If the actual count ≥ the bid → challenger loses a die. Otherwise the bidder loses.' },
    { icon: <img src={`${BASE_URL}images/skull.png`} alt="skull" style={iconStyle} />, text: 'Lose all your dice and you\'re out. Last crew standing wins!' },
];

interface SessionData {
    isHost: boolean;
    playerName: string;
    roomId: string;
    timestamp: number;
}

export interface AppConfig {
    isAdFree?: boolean;
    hideDonation?: boolean;
    onLobbyStateChange?: (inLobby: boolean) => void;
    extraLobbyContent?: React.ReactNode;
    onClearAllData?: () => Promise<void> | void;
}

export default function App({ config }: { config?: AppConfig } = {}) {
    const [inLobby, setInLobby] = useState<boolean>(true);
    const [inTutorial, setInTutorial] = useState<boolean>(false);
    const [inDmTutorial, setInDmTutorial] = useState<boolean>(false);

    const realGame = useGame();
    const tutorialGame = useTutorialGame(() => {
        setInTutorial(false);
        setInLobby(true);
    });
    const dmTutorialGame = useDmTutorial(() => {
        setInDmTutorial(false);
        setInLobby(true);
    });

    const game = (inDmTutorial ? dmTutorialGame : inTutorial ? tutorialGame : realGame) as UseGameReturn;

    const {
        gameState, players, currentTurn, currentBid, myDice,
        isHost, error, peerId, challengeResult,
        gameOptions, myCheat, myCheatUsed, peekInfo, peekTargetId, loadedDieActive, rerolledDieIndex, gameLog, nextRoundVotes,
        spectatingId, spectatingDice, spectatingName,
        isReconnecting, reconnect, reconnectAsHost,
        setGameOptions, assignCheat,
        startRoom, joinRoom, rejoinRoom, placeBid, challenge,
        usePeek, activateLoadedDie, rerollDie, dismissPeek, useSlip, useMagicDice, selectCheat,
        downloadTextLog, downloadJSONLog, voteNextRound, kickPlayer, setPeekTargetId, setSpectateTarget, addBot, leaveRoom, rollSkillCheck,
    } = game;

    const [playerName, setPlayerName] = useState<string>(() => {
        return localStorage.getItem('liarsDicePlayerName') || '';
    });
    const [roomId, setRoomId] = useState<string>(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('join') ?? '';
    });
    const [copied, setCopied] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [showRules, setShowRules] = useState<boolean>(false);
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [canReconnect, setCanReconnect] = useState(false);
    const [reconnectPingActive, setReconnectPingActive] = useState(false);
    const [joinAsSpectator, setJoinAsSpectator] = useState(false);
    const pingIntervalRef = useRef<number | null>(null);
    const pingAttemptsRef = useRef<number>(0);

    // Notify wrapper of lobby state
    useEffect(() => {
        if (config?.onLobbyStateChange) {
            config.onLobbyStateChange(inLobby);
        }
    }, [inLobby, config?.onLobbyStateChange]);

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

    // Persist player name
    useEffect(() => {
        if (playerName) {
            localStorage.setItem('liarsDicePlayerName', playerName);
        }
    }, [playerName]);

    // Session expiration and renewal logic
    useEffect(() => {
        const checkOrRenewSession = async () => {
            const sessionStr = localStorage.getItem('liarsDiceSession');
            const peerIdStr = localStorage.getItem('liarsDicePeerId');

            if (!sessionStr || !peerIdStr) {
                setCanReconnect(false);
                setReconnectPingActive(false);
                return;
            }

            try {
                const session: SessionData = JSON.parse(sessionStr);

                if (!inLobby) {
                    // If active in a game, keep renewing the timestamp to prevent expiration
                    session.timestamp = Date.now();
                    localStorage.setItem('liarsDiceSession', JSON.stringify(session));
                    setCanReconnect(false);
                    setReconnectPingActive(false);
                    return;
                }

                // Expire session after 1 hour (3600000ms) of inactivity, or if no timestamp exists (legacy session)
                if (!session.timestamp || (Date.now() - session.timestamp > 3600000)) {
                    localStorage.removeItem('liarsDiceSession');
                    localStorage.removeItem('liarsDicePeerId');
                    setCanReconnect(false);
                    setReconnectPingActive(false);
                    return;
                }

                // If we get here, valid session exists in lobby
                if (session.isHost) {
                    // Hosts can always potentially revive their room
                    setCanReconnect(true);
                    setReconnectPingActive(false);
                    return;
                }

                // If client, temporarily connect to host just to verify they exist
                if (!peerService.peer || peerService.peer.destroyed) {
                    await peerService.init(peerIdStr);
                }

                const isFirstPing = pingAttemptsRef.current === 0;
                if (isFirstPing) {
                    setReconnectPingActive(true);
                }

                pingAttemptsRef.current += 1;

                const pingTimer = setTimeout(() => {
                    // If ping times out, hide reconnect
                    setCanReconnect(false);
                    setReconnectPingActive(false);

                    if (pingAttemptsRef.current >= 12 && pingIntervalRef.current) {
                        clearInterval(pingIntervalRef.current);
                    }
                }, 3000);

                const conn = peerService.connect(session.roomId, { name: session.playerName });
                conn.on('open', () => {
                    clearTimeout(pingTimer);
                    setCanReconnect(true);
                    setReconnectPingActive(false);
                    pingAttemptsRef.current = 0; // Reset consecutive failures
                    // Disconnect after ping success to avoid phantom player spots
                    setTimeout(() => conn.close(), 500);
                });

                conn.on('error', () => {
                    clearTimeout(pingTimer);
                    setCanReconnect(false);
                    setReconnectPingActive(false);

                    if (pingAttemptsRef.current >= 12 && pingIntervalRef.current) {
                        clearInterval(pingIntervalRef.current);
                    }
                });

            } catch (e) {
                setCanReconnect(false);
                setReconnectPingActive(false);
            }
        };

        // Fire immediately on mount
        checkOrRenewSession();

        // Check every 5 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = window.setInterval(checkOrRenewSession, 5000);

        return () => {
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        };
    }, [inLobby]);

    const copyRoomId = () => {
        const codeToCopy = (isHost ? peerId : roomId) || '';
        navigator.clipboard.writeText(codeToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const copyInviteLink = () => {
        const code = (isHost ? peerId : roomId) || '';
        let baseUrl = `${window.location.origin}${window.location.pathname}`;
        // If we're inside the Android wrapper (via Capacitor) or otherwise serving on localhost, use the public URL
        // @ts-ignore - Window.Capacitor is injected by the native runtime
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.Capacitor) {
            baseUrl = 'https://haa-gg.github.io/Liars-Dice/';
        }
        const url = `${baseUrl}?join=${code}`;
        navigator.clipboard.writeText(url);
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
            await joinRoom(sanitizedRoomId, playerName, joinAsSpectator);
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
            let id;
            if (session.isHost) {
                id = await reconnectAsHost(session.playerName);
            } else {
                id = await reconnect();
                if (id && session.roomId) {
                    await rejoinRoom(session.roomId, session.playerName);
                    setRoomId(session.roomId);
                }
            }
            if (id) {
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

    const handleLeaveGame = () => {
        if (isHost) {
            if (window.confirm("Are you sure you want to permanently close the table? This will clear your session and end the game for everyone.")) {
                localStorage.removeItem('liarsDiceSession');
                localStorage.removeItem('liarsDicePeerId');
                window.location.href = window.location.pathname;
            }
        } else {
            if (window.confirm("Are you sure you want to permanently leave the game? Your spot at the table will be lost.")) {
                leaveRoom();
                localStorage.removeItem('liarsDiceSession');
                localStorage.removeItem('liarsDicePeerId');
                setTimeout(() => {
                    window.location.href = window.location.pathname;
                }, 100);
            }
        }
    };

    // Human-readable summary of current rules
    const rulesSummary = [
        `${gameOptions.startingDice} dice`,
        gameOptions.wildsEnabled ? 'Wild 1s' : 'No wilds',
        gameOptions.eliminationThreshold > 0
            ? `Elim. at ${gameOptions.eliminationThreshold}`
            : 'Standard elim.',
    ].join(' · ');

    const navigate = useNavigate();

    const gameLayout = (
        <SettingsProvider>
            <div className="game-container">
                {inLobby ? (
                    <div className="lobby-overlay">
                        <MainMenu
                            onShowRules={() => setShowRules(true)}
                            onPlayTutorial={() => {
                                tutorialGame.resetTutorial();
                                setInTutorial(true);
                                setInLobby(false);
                            }}
                            onPlayDmTutorial={() => {
                                realGame.setGameOptions({ ...realGame.gameOptions, honorSystemCheats: false });
                                dmTutorialGame.resetDmTutorial();
                                setInDmTutorial(true);
                                setInLobby(false);
                            }}
                            hideDonation={config?.hideDonation}
                        />
                        <div className="logo-container">
                            <div className="scanlines-1">
                                <img src={`${BASE_URL}images/logo-clear.png`} alt="Liar's Dice Logo" style={{ display: 'block', width: '90%', height: 'auto', margin: '40px auto 0px auto', flexShrink: 0 }} />
                            </div>
                            <div style={{ textAlign: 'center' }}>

                                <h1 className="sr-only" style={{ margin: 0, paddingBottom: '0.2rem', borderBottom: 'none' }}>Liar&apos;s Dice</h1>
                                <div style={{ margin: 0, fontStyle: 'italic', opacity: 0.8 }}>
                                    A multiplayer pirate-themed bluffing game
                                </div>
                            </div>
                        </div>
                        <div
                            className="parchment-panel main-lobby-panel"
                            style={{ '--bg-stain': `url(${BASE_URL}images/bg-distress-2.png)` } as React.CSSProperties}
                        >
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
                                        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                        style={{ width: '100%', marginBottom: '1rem', textTransform: 'uppercase' }}
                                    />                            <button className="btn-nautical join-btn" onClick={handleJoinRoom} disabled={isConnecting || !roomId || reconnectPingActive} style={{ width: '100%' }}>
                                        {isConnecting ? 'Joining...' : reconnectPingActive ? 'Searching...' : 'Join Table'}
                                    </button>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.85rem', opacity: 0.75, cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={joinAsSpectator}
                                            onChange={e => setJoinAsSpectator(e.target.checked)}
                                            style={{ accentColor: 'var(--color-gold)', width: '1rem', height: '1rem', cursor: 'pointer' }}
                                        />
                                        Join as spectator
                                    </label>
                                </div>

                                {(canReconnect || reconnectPingActive) && (
                                    <button
                                        className="btn-nautical"
                                        onClick={handleReconnect}
                                        disabled={isConnecting || reconnectPingActive}
                                        style={{ width: '100%', marginTop: '0.5rem', backgroundColor: 'var(--color-ink)', opacity: reconnectPingActive ? 0.7 : 1 }}
                                    >
                                        {reconnectPingActive ? 'Checking connection...' : 'Reconnect to Last Game'}
                                    </button>
                                )}
                            </div>

                            {config?.extraLobbyContent}

                            {error && <p style={{ color: 'var(--color-blood)', marginTop: '1rem' }}>{error}</p>}
                        </div>

                        <div className="lobby-footer">
                            &copy; {new Date().getFullYear()} Liar&apos;s Dice. Licensed under Apache 2.0. · <button 
                                onClick={() => navigate('/privacy')}
                                style={{ background: 'none', border: 'none', color: 'var(--color-gold)', cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' }}
                            >
                                Privacy Policy
                            </button>
                            <br />
                            Check out the <a style={{ color: 'var(--color-gold)', marginTop: '1rem' }} href="https://github.com/haa-gg/liars-dice" target="_blank">github repo</a>
                            <br />
                            {!config?.hideDonation && !config?.isAdFree && (
                                <a style={{ color: 'var(--color-gold)', marginTop: '1rem' }} href="https://buy.stripe.com/bJe3cu35NaEt8LO5Hq9bO00" target="_blank">Buy me an ale!</a>
                            )}
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
                            <button className="room-id-badge" onClick={copyInviteLink} style={{ color: 'var(--color-parchment)', opacity: '0.6' }} title="Copy invite link">
                                {copied ? <><IconCheck /> Copied!</> : <>🔗 Invite Link</>}
                            </button>
                            <span className="room-player-count">
                                <IconUsers style={{ marginRight: '0.3rem' }} /> {players.length} player{players.length !== 1 ? 's' : ''}
                            </span>

                            {isHost && (
                                <button
                                    className={`settings-toggle-btn ${showSettings ? 'active' : ''} ${inDmTutorial && dmTutorialGame.dmTutorialStep === 0 && !showSettings ? 'tutorial-highlight' : ''}`}
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
                            <>
                                <div className="menu-backdrop" onClick={() => setShowSettings(false)} style={{ zIndex: 99, background: 'transparent', backdropFilter: 'none' }} />
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
                                            alignItems: 'center',
                                            position: 'absolute',
                                            right: 0,
                                            top: '5px'
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
                                        <label style={{ opacity: inDmTutorial && dmTutorialGame.dmTutorialStep === 0 ? 0.35 : 1 }}>Starting Dice</label>
                                        <select
                                            className="input-nautical settings-select"
                                            value={gameOptions.startingDice}
                                            onChange={e => setGameOptions({ startingDice: Number(e.target.value) })}
                                            disabled={gameState !== 'LOBBY' || (inDmTutorial && dmTutorialGame.dmTutorialStep === 0)}
                                            style={{ opacity: gameState !== 'LOBBY' || (inDmTutorial && dmTutorialGame.dmTutorialStep === 0) ? 0.35 : 1 }}
                                        >
                                            {[3, 4, 5, 6, 7].map(n => (
                                                <option key={n} value={n}>{n} dice</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="settings-row">
                                        <label style={{ opacity: inDmTutorial && dmTutorialGame.dmTutorialStep === 0 ? 0.35 : 1 }}>Eliminate At</label>
                                        <select
                                            className="input-nautical settings-select"
                                            value={gameOptions.eliminationThreshold}
                                            onChange={e => setGameOptions({ eliminationThreshold: Number(e.target.value) })}
                                            disabled={gameState !== 'LOBBY' || (inDmTutorial && dmTutorialGame.dmTutorialStep === 0)}
                                            style={{ opacity: gameState !== 'LOBBY' || (inDmTutorial && dmTutorialGame.dmTutorialStep === 0) ? 0.35 : 1 }}
                                        >
                                            <option value={0}>0 dice (standard)</option>
                                            <option value={1}>1 die left</option>
                                            <option value={2}>2 dice left</option>
                                            <option value={3}>3 dice left (quick)</option>
                                            <option value={4}>4 dice left (blitz)</option>
                                        </select>
                                    </div>

                                    <div className="settings-row">
                                        <label style={{ opacity: inDmTutorial && dmTutorialGame.dmTutorialStep === 0 ? 0.35 : 1 }}>1s Are Wild</label>
                                        <button
                                            className={`toggle-btn ${gameOptions.wildsEnabled ? 'on' : 'off'}`}
                                            onClick={() => setGameOptions({ wildsEnabled: !gameOptions.wildsEnabled })}
                                            disabled={gameState !== 'LOBBY' || (inDmTutorial && dmTutorialGame.dmTutorialStep === 0)}
                                            style={{ opacity: gameState !== 'LOBBY' || (inDmTutorial && dmTutorialGame.dmTutorialStep === 0) ? 0.35 : 1, cursor: gameState !== 'LOBBY' || (inDmTutorial && dmTutorialGame.dmTutorialStep === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                        >
                                            {gameOptions.wildsEnabled ? <><IconCheck /> On</> : <><IconCross /> Off</>}
                                        </button>
                                    </div>

                                    <div className="settings-row" style={{ position: 'relative' }}>
                                        <label>Honor System Cheats</label>
                                        <button
                                            className={`toggle-btn ${gameOptions.honorSystemCheats ? 'on' : 'off'} ${inDmTutorial && dmTutorialGame.dmTutorialStep === 0 && showSettings && !gameOptions.honorSystemCheats ? 'tutorial-highlight' : ''}`}
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

                                <div className="settings-section">
                                    <h4>Host Handicap</h4>
                                    <div className="settings-row">
                                        <label>Your Bonus Dice</label>
                                        <select
                                            className="input-nautical settings-select"
                                            value={gameOptions.hostBonusDice ?? 0}
                                            onChange={e => setGameOptions({ hostBonusDice: Number(e.target.value) })}
                                            disabled={gameState !== 'LOBBY'}
                                            style={{ opacity: gameState !== 'LOBBY' ? 0.5 : 1 }}
                                        >
                                            <option value={0}>None (fair game)</option>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                <option key={n} value={n}>+{n} dice</option>
                                            ))}
                                        </select>
                                    </div>
                                    {(gameOptions.hostBonusDice ?? 0) > 0 && (
                                        <p className="settings-sub" style={{ marginTop: '-0.5rem', fontSize: '0.75rem', opacity: 0.7 }}>
                                            You'll start with {(gameOptions.startingDice) + (gameOptions.hostBonusDice ?? 0)} dice vs. {gameOptions.startingDice} for everyone else
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
                            </>
                        )}

                        {inTutorial && <TutorialOverlay tutorialStep={tutorialGame.tutorialStep} />}
                        {inDmTutorial && <DmTutorialOverlay dmTutorialStep={dmTutorialGame.dmTutorialStep} onContinue={dmTutorialGame.advanceDmTutorial} showSettings={showSettings} />}

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
                            hideDonation={config?.hideDonation}
                            isHost={isHost}
                            onNextRound={voteNextRound}
                            peerId={peerId}
                            myCheat={myCheat}
                            myCheatUsed={myCheatUsed}
                            peekInfo={peekInfo}
                            peekTargetId={peekTargetId}
                            loadedDieActive={loadedDieActive}
                            rerolledDieIndex={rerolledDieIndex}
                            gameLog={gameLog}
                            gameOptions={gameOptions}
                            nextRoundVotes={nextRoundVotes}
                            onUsePeek={usePeek}
                            onSetPeekTargetId={setPeekTargetId}
                            onActivateLoadedDie={activateLoadedDie}
                            onRerollDie={rerollDie}
                            onDismissPeek={dismissPeek}
                            onUseSlip={useSlip}
                            onUseMagicDice={useMagicDice}
                            onSelectCheat={selectCheat}
                            onRollSkillCheck={rollSkillCheck}
                            onDownloadTextLog={downloadTextLog}
                            onDownloadJSONLog={downloadJSONLog}
                            onKickPlayer={kickPlayer}
                            spectatingId={spectatingId}
                            spectatingDice={spectatingDice}
                            spectatingName={spectatingName}
                            onSetSpectateTarget={setSpectateTarget}
                            onShowRules={() => setShowRules(v => !v)}
                            onLeaveGame={handleLeaveGame}
                            onAddBot={addBot}
                            dmTutorialStep={inDmTutorial ? dmTutorialGame.dmTutorialStep : undefined}
                        />
                    </div>
                )}



                {/* ── RULES POPOVER ── */}
                {showRules && (
                    <div className="rules-overlay" onClick={() => setShowRules(false)}>
                        <div
                            className="rules-panel parchment-panel"
                            onClick={e => e.stopPropagation()}
                            style={{ '--bg-stain': `url(${BASE_URL}images/stain-distress.png)` } as React.CSSProperties}
                        >
                            <button className="rules-close" onClick={() => setShowRules(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCross size="0.8em" /></button>
                            <h2>How to Play</h2>
                            <ul className="rules-list">
                                {RULES.map((r, i) => (
                                    <li key={i}><span className="rules-icon">{r.icon}</span>{r.text}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </SettingsProvider>
    );

    return (
        <Routes>
            <Route path="/privacy" element={<PrivacyPolicy onClearAllData={config?.onClearAllData} />} />
            <Route path="*" element={gameLayout} />
        </Routes>
    );
}
