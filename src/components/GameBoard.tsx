import React, { useState, useEffect } from 'react';
import Dice from './Dice';
import { formatGameLogAsText } from '../utils/gameLogger';
import { Player, Bid, GameState, ChallengeResult, GameOptions, GameLogEntry, CheatType } from '../types';
import { IconScroll, IconCross, IconUserMinus, IconInfo, IconFlag, IconSkull } from './Icons';
import './GameBoard.css';

// @ts-ignore
const BASE_URL = import.meta.env.BASE_URL;

const CHEAT_LABELS: Record<CheatType, string> = {
    peek: 'Peek',
    shield: 'Shield',
    loaded_die: 'Loaded Die',
    slip: 'Slip',
    magic_dice: 'Magic Dice',
};

interface GameBoardProps {
    players: Player[];
    myDice: number[];
    currentTurn: string | null;
    currentBid: Bid;
    onBid: (count: number, face: number) => void;
    onChallenge: () => void;
    isMyTurn: boolean;
    gameState: GameState;
    challengeResult: ChallengeResult | null;
    isHost: boolean;
    onNextRound: () => void;
    peerId: string | null;
    myCheat?: CheatType | null;
    myCheatUsed?: boolean;
    peekInfo?: { playerName: string; dieValue: number } | null;
    loadedDieActive?: boolean;
    gameLog?: GameLogEntry[];
    gameOptions?: GameOptions;
    nextRoundVotes?: Set<string>;
    onUsePeek: () => void;
    onActivateLoadedDie: () => void;
    onRerollDie: (index: number) => void;
    onDismissPeek: () => void;
    onUseSlip: () => void;
    onUseMagicDice: () => void;
    onSelectCheat: (cheatType: CheatType) => void;
    onDownloadTextLog: () => void;
    onDownloadJSONLog: () => void;
    onKickPlayer: (playerId: string) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
    players = [],
    myDice = [],
    currentTurn,
    currentBid,
    onBid,
    onChallenge,
    isMyTurn,
    gameState,
    challengeResult,
    isHost,
    onNextRound,
    peerId,
    myCheat = null,
    myCheatUsed = false,
    peekInfo = null,
    loadedDieActive = false,
    gameLog = [],
    gameOptions = { startingDice: 5, eliminationThreshold: 0, wildsEnabled: true, honorSystemCheats: false },
    nextRoundVotes = new Set(),
    onUsePeek,
    onActivateLoadedDie,
    onRerollDie,
    onDismissPeek,
    onUseSlip,
    onUseMagicDice,
    onSelectCheat,
    onDownloadTextLog,
    onDownloadJSONLog,
    onKickPlayer,
}) => {
    const [bidCount, setBidCount] = useState<number>(currentBid?.count || 1);
    const [bidFace, setBidFace] = useState<number>(currentBid?.face || 2);
    const [showGameLog, setShowGameLog] = useState<boolean>(false);
    const [showCheatInfo, setShowCheatInfo] = useState<boolean>(false);
    const [bidError, setBidError] = useState<string>('');

    // Generate text preview of game log
    const gameLogText = formatGameLogAsText(gameLog, gameOptions);

    // Keep bid inputs in sync when currentBid updates (new round, etc.)
    useEffect(() => {
        setBidCount(currentBid?.count || 1);
        setBidFace(currentBid?.face || 2);
        setBidError(''); // Clear error on new round
    }, [currentBid]);

    // Handle bid with validation
    const handleRaiseBid = () => {
        // Check if bid is actually higher
        const isValidBid = bidCount > currentBid.count || (bidCount === currentBid.count && bidFace > currentBid.face);

        if (!isValidBid) {
            setBidError('You must raise the bid! Increase the count or choose a higher face value.');
            return;
        }

        setBidError('');
        onBid(bidCount, bidFace);
    };

    if (!players || players.length === 0) {
        return <div className="parchment-panel">Gathering the crew...</div>;
    }

    // Resolve loser name for challenge result display
    const loserName = challengeResult
        ? players.find(p => p.id === challengeResult.loserId)?.name ?? 'Someone'
        : null;

    const me = players.find(p => p.id === peerId);

    // Calculate base dice count (non-slipped dice)
    // During REVEALING/ROUND_END, always use actual dice length to prevent
    // dice from incorrectly showing as red when player loses a die
    let myBaseDiceCount: number;
    if (gameState === 'REVEALING' || gameState === 'ROUND_END') {
        // Use actual dice on screen - they shouldn't change until next round
        myBaseDiceCount = myDice.length;
    } else {
        // During normal play, use player's diceCount
        myBaseDiceCount = me ? me.diceCount : 0;
    }

    const isGameOver = gameState === 'GAME_OVER';
    const isRoundOver = gameState === 'ROUND_END' || gameState === 'REVEALING';

    // Find winner for GAME_OVER
    const winner = isGameOver
        ? players.find(p => p.active)
        : null;

    return (
        <div className="game-board-layout">
            {/* ── GAME LOG BUTTON ── */}
            {gameLog && gameLog.length > 0 && (
                <button
                    className="log-btn"
                    onClick={() => setShowGameLog(v => !v)}
                    title="View Game Log"
                    aria-label="Toggle game log"
                >
                    <IconScroll />
                </button>
            )}

            {/* ── GAME LOG PANEL ── */}
            {showGameLog && (
                <div className="rules-overlay" onClick={() => setShowGameLog(false)}>
                    <div className="history-panel parchment-panel" onClick={e => e.stopPropagation()}>
                        <button className="rules-close" onClick={() => setShowGameLog(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCross size="0.8em" /></button>
                        <h2>Game Log</h2>
                        <p className="history-subtitle">Complete game history</p>

                        <div className="log-actions" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <button className="btn-nautical" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={onDownloadTextLog}>
                                Download as Text
                            </button>
                            <button className="btn-nautical" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={onDownloadJSONLog}>
                                Download as JSON
                            </button>
                        </div>

                        <div className="game-log-content" style={{
                            maxHeight: '400px',
                            overflowY: 'auto',
                            background: 'rgba(0,0,0,0.05)',
                            padding: '1rem',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.5'
                        }}>
                            {gameLogText}
                        </div>
                    </div>
                </div>
            )}

            {/* ── CHEAT INFO POPUP ── */}
            {showCheatInfo && (
                <div className="rules-overlay" onClick={() => setShowCheatInfo(false)}>
                    <div className="rules-panel parchment-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <button className="rules-close" onClick={() => setShowCheatInfo(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCross size="0.8em" /></button>
                        <h2>Cheat Abilities</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <div>
                                <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: 'var(--color-ink)' }}>Peek</h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                                    See one random die from an opponent's hand. Use this to gather information before making your bid.
                                </p>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: 'var(--color-ink)' }}>Shield</h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                                    Absorb one hit when you lose a challenge. You won't lose a die this round. Use it to stay in the game longer.
                                </p>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: 'var(--color-ink)' }}>Loaded Die</h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                                    Re-roll one of your dice to get a better value. Click the die you want to re-roll after activating this cheat.
                                </p>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: 'var(--color-ink)' }}>Slip</h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                                    Secretly gain 1 extra die in your hand. Other players won't know you have more dice than expected.
                                </p>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: 'var(--color-ink)' }}>Magic Dice</h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                                    Secretly gain 2 extra dice in your hand. A more powerful version of Slip for aggressive plays.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PEEK MODAL ── */}
            {peekInfo && (
                <div className="result-overlay">
                    <div className="result-panel parchment-panel">
                        <h3>You Peeked!</h3>
                        <p>You sneak a glance at <strong>{peekInfo.playerName}</strong>'s hand...</p>
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
                            <div style={{ transform: 'scale(1.5)' }}><Dice value={peekInfo.dieValue} /></div>
                        </div>
                        <button className="btn-nautical" onClick={onDismissPeek}>Keep it secret</button>
                    </div>
                </div>
            )}

            {isGameOver && (
                <div className="result-overlay">
                    <div className="result-panel parchment-panel">
                        <div className="result-icon">
                            <img src={`${BASE_URL}images/win.png`} alt="Victory" style={{ width: '80px', height: '80px' }} />
                        </div>
                        <h2>Game Over!</h2>
                        <p className="result-subtitle">
                            {winner
                                ? `${winner.name} wins!`
                                : 'The seas have claimed the rest of ye!'}
                        </p>
                        {isHost && (
                            <button className="btn-nautical" style={{ marginTop: '1.5rem' }} onClick={onNextRound}>
                                Play Again
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── ROUND END / REVEAL OVERLAY ── */}
            {isRoundOver && challengeResult && (
                <div className="result-overlay">
                    <div className="result-panel parchment-panel">
                        <div className="result-icon">
                            <img
                                src={challengeResult.loserId === peerId ? `${BASE_URL}images/lose.png` : `${BASE_URL}images/win.png`}
                                alt={challengeResult.loserId === peerId ? "You Lost" : "Victory"}
                                style={{ width: '120px', height: '120px' }}
                            />
                        </div>
                        <h2>
                            {challengeResult.loserId === peerId ? 'Ye Lost a Die!' : 'Round Winner!'}
                        </h2>
                        <p className="result-detail">
                            <strong>{loserName}</strong> loses a die.
                        </p>
                        <p className="result-detail result-count">
                            The bid was <strong>{currentBid.count}×{currentBid.face}</strong>.
                            <br />
                            Actual count on the table: <strong>{challengeResult.count}</strong>
                        </p>

                        <button
                            className="btn-nautical"
                            style={{ marginTop: '1.5rem' }}
                            onClick={onNextRound}
                            disabled={nextRoundVotes.has(peerId as string)}
                        >
                            {isHost ? 'Next Round' : nextRoundVotes.has(peerId as string) ? 'Vote Recorded' : 'Vote: Next Round'}
                        </button>

                        {!isHost && (
                            <p style={{ marginTop: '0.5rem', opacity: 0.7, fontSize: '0.85rem' }}>
                                {nextRoundVotes.size} / {Math.floor(players.length / 2) + 1} votes needed
                                {nextRoundVotes.has(peerId as string) && ' (you voted)'}
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="table-container">
                {/* Render other players in a circle */}
                <div className="players-circle">
                    {players.map((p) => {
                        if (!p || !p.id) return null;
                        return (
                            <div key={p.id} className={`player-node ${currentTurn === p.id ? 'active-turn' : ''} ${!p.active ? 'eliminated' : ''}`}>
                                <div className="player-avatar">{p.active ? <IconFlag size="1.5em" /> : <IconSkull size="1.5em" />}</div>
                                <div className="player-name">{p.name || 'Unknown Pirate'}</div>
                                <div className="player-dice-count">
                                    {p.active ? `Dice: ${p.diceCount || 0}` : 'Eliminated'}
                                </div>
                                {isHost && p.id !== peerId && (
                                    <button 
                                        className="kick-player-btn" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Kick ${p.name} from the table?`)) {
                                                onKickPlayer(p.id);
                                            }
                                        }}
                                        title={`Kick ${p.name}`}
                                    >
                                        <IconUserMinus />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="center-board">
                    <div className="current-bid-display parchment-panel">
                        <h3>Current Bid</h3>
                        {currentBid && currentBid.count > 0 ? (
                            <div className="bid-info">
                                <span className="bid-count">{currentBid.count}</span>
                                <span className="bid-x">×</span>
                                <Dice value={currentBid.face} />
                            </div>
                        ) : (
                            <p>Waiting for first bid...</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="my-hand-area">
                {myCheat && gameState !== 'GAME_OVER' && (
                    <div className="cheat-badge parchment-panel" style={{ padding: '0.4rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center', boxShadow: 'none' }}>
                        <span>
                            <strong>Secret:</strong> {CHEAT_LABELS[myCheat]}
                        </span>
                        <span style={{ fontSize: '0.8rem', opacity: myCheatUsed ? 0.5 : 1 }}>
                            {myCheatUsed ? ' (Used)' : ' (Ready)'}
                        </span>
                        {isMyTurn && gameState === 'BIDDING' && !myCheatUsed && (
                            <div className="cheat-actions">
                                {myCheat === 'peek' && (
                                    <button className="btn-nautical" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }} onClick={onUsePeek}>Use Peek</button>
                                )}
                                {myCheat === 'loaded_die' && !loadedDieActive && (
                                    <button className="btn-nautical" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }} onClick={onActivateLoadedDie}>Use Loaded Die</button>
                                )}
                                {myCheat === 'slip' && (
                                    <button className="btn-nautical" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }} onClick={onUseSlip}>Use Slip</button>
                                )}
                                {myCheat === 'magic_dice' && (
                                    <button className="btn-nautical" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }} onClick={onUseMagicDice}>Use Magic Dice</button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Honor System Cheat Selection */}
                {!myCheat && gameState === 'BIDDING' && gameOptions.honorSystemCheats && !myCheatUsed && (
                    <div className="cheat-selection parchment-panel" style={{ padding: '0.8rem 1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>Choose Your Cheat:</p>
                            <button
                                onClick={() => setShowCheatInfo(true)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    padding: '0.2rem',
                                    color: 'var(--color-ink)',
                                    opacity: 0.7,
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="Cheat descriptions"
                                aria-label="Show cheat information"
                            >
                                <IconInfo />
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {(['peek', 'shield', 'loaded_die', 'slip', 'magic_dice'] as CheatType[]).map(cheatType => (
                                <button
                                    key={cheatType}
                                    className="btn-nautical cheat-btn"
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.7rem' }}
                                    onClick={() => onSelectCheat(cheatType)}
                                >
                                    {cheatType === 'loaded_die' ? 'Loaded Die' : cheatType === 'magic_dice' ? 'Magic Dice' : cheatType.charAt(0).toUpperCase() + cheatType.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loadedDieActive && (
                    <div style={{ color: 'var(--color-gold)', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
                        Pick a die to re-roll!
                    </div>
                )}

                <div className={`my-dice ${loadedDieActive ? 'loaded-die-active' : ''}`}>
                    {me && me.active && myDice.map((val, i) => (
                        <div
                            key={i}
                            className={`die-wrapper ${loadedDieActive ? 'clickable' : ''}`}
                            onClick={() => {
                                if (loadedDieActive) {
                                    console.log('Rerolling die at index:', i);
                                    onRerollDie(i);
                                }
                            }}
                        >
                            <Dice value={val} isSlipped={i >= myBaseDiceCount} />
                        </div>
                    ))}
                    {myDice.length === 0 && gameState === 'LOBBY' && (
                        <p style={{ opacity: 0.5, fontStyle: 'italic' }}>Your dice will appear here when the round starts.</p>
                    )}
                    {me && !me.active && (
                        <p style={{ opacity: 0.7, fontStyle: 'italic', fontSize: '1.1rem' }}>You've been eliminated. Watch the remaining players battle it out!</p>
                    )}
                </div>

                {isMyTurn && (gameState === 'BIDDING') && !loadedDieActive && (
                    <div className="bidding-controls parchment-panel">
                        <h3>Your Turn, Good Luck!</h3>
                        <div className="bid-inputs">
                            <div className="custom-stepper">
                                <button
                                    className="stepper-btn"
                                    onClick={() => setBidCount(Math.max((currentBid.count || 1), bidCount - 1))}
                                >
                                    −
                                </button>
                                <div className="stepper-value">{bidCount}</div>
                                <button
                                    className="stepper-btn"
                                    onClick={() => setBidCount(bidCount + 1)}
                                >
                                    +
                                </button>
                            </div>
                            <select
                                value={bidFace}
                                onChange={(e) => setBidFace(parseInt(e.target.value))}
                                className="input-nautical"
                            >
                                {[2, 3, 4, 5, 6].map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </div>
                        <div className="bid-btns">
                            <button className="btn-nautical" onClick={handleRaiseBid}>Raise Bid</button>
                            {currentBid.count > 0 && (
                                <button className="btn-nautical danger" onClick={onChallenge}>Liar!</button>
                            )}
                        </div>
                        {bidError && (
                            <p style={{ color: 'var(--color-blood)', marginTop: '0.5rem', fontSize: '0.9rem', textAlign: 'center', margin: '0.5rem 0 0 0', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                {bidError}
                            </p>
                        )}
                    </div>
                )}

                {isHost && gameState === 'LOBBY' && players.length > 0 && (
                    <div className="bidding-controls parchment-panel" style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Ready to bet the farm?</h3>
                        <button className="btn-nautical" style={{ fontSize: '1.2rem', padding: '0.8rem 2rem' }} onClick={onNextRound}>
                            Start Round
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};

export default GameBoard;
