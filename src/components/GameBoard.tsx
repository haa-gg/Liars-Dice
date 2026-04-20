import React, { useState, useEffect } from 'react';
import Dice from './Dice';
import { formatGameLogAsText } from '../utils/gameLogger';
import { Player, Bid, GameState, ChallengeResult, GameOptions, GameLogEntry, CheatType } from '../types';
import MainMenu from './MainMenu';
import { IconCross, IconUserMinus, IconInfo, IconFlag, IconSkull, IconSpectator } from './Icons';
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
    rerolledDieIndex?: number | null;
    gameLog?: GameLogEntry[];
    gameOptions?: GameOptions;
    nextRoundVotes?: Set<string>;
    onUsePeek: (targetPlayerId: string) => void;
    onActivateLoadedDie: () => void;
    onRerollDie: (index: number) => void;
    onDismissPeek: () => void;
    onUseSlip: () => void;
    onUseMagicDice: () => void;
    onSelectCheat: (cheatType: CheatType) => void;
    onRollSkillCheck?: (roll: number, sleightBonus: number, deceptionBonus: number) => void;
    onDownloadTextLog: () => void;
    onDownloadJSONLog: () => void;
    onKickPlayer: (playerId: string) => void;
    peekTargetId?: string | null;
    onSetPeekTargetId?: (id: string | null) => void;
    spectatingId?: string | null;
    spectatingDice?: number[];
    spectatingName?: string | null;
    onSetSpectateTarget?: (targetId: string) => void;
    onShowRules?: () => void;
    onLeaveGame?: () => void;
    onAddBot?: () => void;
    dmTutorialStep?: number;
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
    rerolledDieIndex = null,
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
    onRollSkillCheck,
    onDownloadTextLog,
    onDownloadJSONLog,
    onKickPlayer,
    peekTargetId = null,
    onSetPeekTargetId,
    spectatingId = null,
    spectatingDice = [],
    spectatingName = null,
    onSetSpectateTarget,
    onShowRules,
    onLeaveGame,
    onAddBot,
    dmTutorialStep,
}) => {
    const [bidCount, setBidCount] = useState<number>(currentBid?.count || 1);
    const [bidFace, setBidFace] = useState<number>(currentBid?.face || 2);
    const [showGameLog, setShowGameLog] = useState<boolean>(false);
    const [showCheatInfo, setShowCheatInfo] = useState<boolean>(false);
    const [showStartConfirmation, setShowStartConfirmation] = useState<boolean>(false);
    const [bidError, setBidError] = useState<string>('');
    const [d20Roll, setD20Roll] = useState<number | null>(null);
    const [d20Roll2, setD20Roll2] = useState<number | null>(null);
    const [rollMode, setRollMode] = useState<'normal' | 'advantage' | 'disadvantage'>('normal');
    const [slightBonus, setSlightBonus] = useState<number | ''>('');
    const [deceptionBonus, setDeceptionBonus] = useState<number | ''>('');
    const [isRolling, setIsRolling] = useState<boolean>(false);
    const [showD20Roller, setShowD20Roller] = useState<boolean>(false);
    const [hasRolledSkillCheck, setHasRolledSkillCheck] = useState<boolean>(false);

    // Generate text preview of game log
    const gameLogText = formatGameLogAsText(gameLog, gameOptions);

    // Keep bid inputs in sync when currentBid updates (new round, etc.)
    useEffect(() => {
        setBidCount(currentBid?.count || 1);
        setBidFace(currentBid?.face || 2);
        setBidError(''); // Clear error on new round
        if (currentBid && currentBid.count === 0) {
            setD20Roll(null);
            setD20Roll2(null);
            setHasRolledSkillCheck(false);
        }
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
            <MainMenu
                onShowRules={onShowRules}
                onShowGameLog={() => setShowGameLog(true)}
                onLeaveGame={onLeaveGame}
                gameLogEmpty={!gameLog || gameLog.length === 0}
            />

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
                    <div
                        className="rules-panel parchment-panel"
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: '400px',
                            '--bg-stain': `url(${BASE_URL}images/stain-distress.png)`
                        } as React.CSSProperties}
                    >
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

            {/* ── START ROUND CONFIRMATION ── */}
            {showStartConfirmation && (
                <div className="result-overlay">
                    <div className="result-panel parchment-panel">
                        <div className="result-icon">
                            <IconInfo size="3rem" />
                        </div>
                        <h3
                            style={{ fontSize: '1.6rem' }}
                        >Ready for Battle?</h3>
                        <p className="result-subtitle" style={{ fontSize: '1.0rem', margin: '1rem 0' }}>
                            Do you have all your players at the table and checked the game settings?
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                            <button
                                className="btn-nautical"
                                style={{ fontSize: '1.0rem' }}
                                onClick={() => {
                                    setShowStartConfirmation(false);
                                    onNextRound();
                                }}
                            >
                                Aye, Let's Begin!
                            </button>
                            <button
                                className="btn-nautical"
                                style={{ fontSize: '1.0rem' }}
                                onClick={() => setShowStartConfirmation(false)}
                            >
                                Wait, Not Yet
                            </button>
                        </div>
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
                                src={challengeResult.loserId === peerId ? `${BASE_URL}images/lose-2.png` : `${BASE_URL}images/win.png`}
                                alt={challengeResult.loserId === peerId ? "You Lost" : "Victory"}
                                style={{ width: '200px', height: '200px' }}
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
                                <div className="player-avatar">
                                    {p.active ? (
                                        <IconFlag size="1.5em" />
                                    ) : p.isSpectator ? (
                                        <IconSpectator size="1.5em" />
                                    ) : (
                                        <IconSkull size="1.5em" />
                                    )}
                                </div>
                                <div className="player-name">{p.name || 'Unknown Pirate'}</div>
                                <div className="player-dice-count">
                                    {p.active ? `Dice: ${p.diceCount || 0}` : p.isSpectator ? 'Spectating' : 'Eliminated'}
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
                    <div className="cheat-badge parchment-panel" style={{ padding: '0.4rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', boxShadow: 'none' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span>
                                <strong>Secret:</strong> {CHEAT_LABELS[myCheat]}
                            </span>
                            <span style={{ fontSize: '0.8rem', opacity: myCheatUsed ? 0.5 : 1 }}>
                                {myCheatUsed ? ' (Used)' : ' (Ready)'}
                            </span>
                            {/* Cheat actions moved to bottom */}

                            {/* Skill Check Toggle (Only show if Honor System is active) */}
                            {gameState === 'BIDDING' && !myCheatUsed && gameOptions.honorSystemCheats && (
                                <button
                                    id="toggle-d20-roller"
                                    onClick={() => setShowD20Roller(v => !v)}
                                    title={showD20Roller ? 'Hide skill check roller' : 'Show skill check roller'}
                                    style={{
                                        background: 'none',
                                        border: '1px solid var(--color-ink )',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer',
                                        padding: '0.15rem 0.4rem',
                                        color: 'var(--color-ink)',
                                        lineHeight: 1.4,
                                        whiteSpace: 'nowrap',
                                        marginLeft: 'auto'
                                    }}
                                >
                                    <img src={`${BASE_URL}images/d20-icon.svg`} alt="D20" style={{ width: '1rem', height: '1rem', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                    {showD20Roller ? 'Skill Check ▾' : 'Skill Check ▸'}
                                </button>
                            )}
                        </div>

                        {/* D20 Skill Check Roller */}
                        {gameState === 'BIDDING' && !myCheatUsed && gameOptions.honorSystemCheats && showD20Roller && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.6rem' }}>
                                {/* Row 1: [inputs+radio col] [roll btn] */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    {/* Left col: bonus inputs stacked above radio group */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        {/* Bonus inputs */}
                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                            <label style={{ fontSize: '0.7rem', opacity: 0.75, whiteSpace: 'nowrap' }}>Sleight</label>
                                            <input
                                                id="slight-of-hand-bonus"
                                                type="number"
                                                value={slightBonus}
                                                onChange={e => setSlightBonus(e.target.value === '' ? '' : Number(e.target.value))}
                                                style={{
                                                    width: '3rem',
                                                    padding: '0.2rem 0.3rem',
                                                    fontSize: '0.8rem',
                                                    background: 'var(--color-wood-dark)',
                                                    color: 'var(--color-parchment)',
                                                    border: '1px solid var(--color-gold)',
                                                    borderRadius: '4px',
                                                    textAlign: 'center',
                                                }}
                                            />
                                            <label style={{ fontSize: '0.7rem', opacity: 0.75, whiteSpace: 'nowrap' }}>Deception</label>
                                            <input
                                                id="deception-bonus"
                                                type="number"
                                                value={deceptionBonus}
                                                onChange={e => setDeceptionBonus(e.target.value === '' ? '' : Number(e.target.value))}
                                                style={{
                                                    width: '3rem',
                                                    padding: '0.2rem 0.3rem',
                                                    fontSize: '0.8rem',
                                                    background: 'var(--color-wood-dark)',
                                                    color: 'var(--color-parchment)',
                                                    border: '1px solid var(--color-gold)',
                                                    borderRadius: '4px',
                                                    textAlign: 'center',
                                                }}
                                            />
                                        </div>
                                        {/* Adv/Disadv selector — stacked below inputs */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {(['normal', 'advantage', 'disadvantage'] as const).map(mode => (
                                                <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', cursor: 'pointer', opacity: 0.85 }}>
                                                    <input
                                                        type="radio"
                                                        name="rollMode"
                                                        value={mode}
                                                        checked={rollMode === mode}
                                                        onChange={() => setRollMode(mode)}
                                                        style={{ accentColor: 'var(--color-gold)', cursor: 'pointer' }}
                                                    />
                                                    {mode === 'normal' ? 'Normal' : mode === 'advantage' ? 'Adv ▲' : 'Disadv ▼'}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Roll button — sits to the right of the left col */}
                                    <button
                                        id="roll-d20-btn"
                                        className="btn-nautical"
                                        disabled={isRolling || hasRolledSkillCheck}
                                        onClick={() => {
                                            setIsRolling(true);
                                            setD20Roll(null);
                                            setD20Roll2(null);
                                            setTimeout(() => {
                                                const r1 = Math.floor(Math.random() * 20) + 1;
                                                const r2 = rollMode !== 'normal' ? Math.floor(Math.random() * 20) + 1 : null;
                                                const effective = r2 === null ? r1 : rollMode === 'advantage' ? Math.max(r1, r2) : Math.min(r1, r2);
                                                setD20Roll(r1);
                                                setD20Roll2(r2);
                                                setIsRolling(false);
                                                setHasRolledSkillCheck(true);
                                                if (onRollSkillCheck) {
                                                    onRollSkillCheck(effective, Number(slightBonus) || 0, Number(deceptionBonus) || 0);
                                                }

                                            }, 400);
                                        }}
                                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', whiteSpace: 'nowrap', alignSelf: 'center' }}
                                    >
                                        {isRolling
                                            ? <><img src={`${BASE_URL}images/d20-icon-red-white-border.svg`} alt="" style={{ width: '0.9rem', height: '0.9rem', verticalAlign: 'middle', marginRight: '0.25rem' }} />Rolling…</>
                                            : <><img src={`${BASE_URL}images/d20-icon-red-white-border.svg`} alt="" style={{ width: '0.9rem', height: '0.9rem', verticalAlign: 'middle', marginRight: '0.25rem' }} />Roll D20</>
                                        }
                                    </button>
                                </div>

                                {/* Row 2: Results */}
                                {d20Roll !== null && (() => {
                                    const effective = d20Roll2 === null ? d20Roll : rollMode === 'advantage' ? Math.max(d20Roll, d20Roll2) : Math.min(d20Roll, d20Roll2);
                                    const sBonus = Number(slightBonus) || 0;
                                    const dBonus = Number(deceptionBonus) || 0;
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                {d20Roll2 !== null && (
                                                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                                        {rollMode === 'advantage' ? 'Adv' : 'Disadv'}:
                                                    </span>
                                                )}
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    color: d20Roll2 !== null && d20Roll !== effective ? 'rgba(200,200,200,0.4)' : (effective === 20 ? 'gold' : effective === 1 ? '#e74c3c' : 'var(--color-parchment)'),
                                                    textDecoration: d20Roll2 !== null && d20Roll !== effective ? 'line-through' : 'none',
                                                }}>
                                                    {d20Roll === 20 && d20Roll === effective ? '✨' : d20Roll === 1 && d20Roll === effective ? '💀' : ''} {d20Roll}
                                                </span>
                                                {d20Roll2 !== null && (
                                                    <>
                                                        <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>/</span>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: 'bold',
                                                            color: d20Roll2 !== effective ? 'rgba(200,200,200,0.4)' : (effective === 20 ? 'gold' : effective === 1 ? '#e74c3c' : 'var(--color-parchment)'),
                                                            textDecoration: d20Roll2 !== effective ? 'line-through' : 'none',
                                                        }}>
                                                            {d20Roll2 === 20 && d20Roll2 === effective ? '✨' : d20Roll2 === 1 && d20Roll2 === effective ? '💀' : ''} {d20Roll2}
                                                        </span>
                                                        <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>→ <strong>{effective}</strong></span>
                                                    </>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.7rem', opacity: 0.8, whiteSpace: 'nowrap' }}>
                                                    Sleight: <strong>{effective + sBonus}</strong>
                                                </span>
                                                <span style={{ fontSize: '0.7rem', opacity: 0.8, whiteSpace: 'nowrap' }}>
                                                    Deception: <strong>{effective + dBonus}</strong>
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* CHEAT ACTIONS NOW ON THE BOTTOM ROW */}
                        {isMyTurn && gameState === 'BIDDING' && !myCheatUsed && (
                            <div className="cheat-actions" style={{ borderTop: showD20Roller ? '1px dashed rgba(0,0,0,0.1)' : 'none', paddingTop: showD20Roller ? '0.5rem' : '0', width: '100%' }}>
                                {myCheat === 'peek' && (
                                    peekTargetId === undefined || peekTargetId === null ? (
                                        // Step 1: show target picker
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Peek at whom?</span>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                {players
                                                    .filter(p => p.id !== peerId && p.active)
                                                    .map(p => (
                                                        <button
                                                            key={p.id}
                                                            className="btn-nautical"
                                                            style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}
                                                            onClick={() => {
                                                                onUsePeek(p.id);
                                                                onSetPeekTargetId?.(null);
                                                            }}
                                                        >
                                                            {p.name}
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    ) : null
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
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>Dare to Cheat?</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <button
                                    onClick={() => setShowD20Roller(v => !v)}
                                    title={showD20Roller ? 'Hide skill check roller' : 'Show skill check roller'}
                                    style={{
                                        background: 'none',
                                        border: '1px solid var(--color-ink )',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer',
                                        padding: '0.15rem 0.4rem',
                                        color: 'var(--color-ink)',
                                        lineHeight: 1.4,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <img src={`${BASE_URL}images/d20-icon.svg`} alt="D20" style={{ width: '1rem', height: '1rem', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                    {showD20Roller ? 'Skill Check ▾' : 'Skill Check ▸'}
                                </button>
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
                        </div>

                        {/* D20 Skill Check Inputs (BEFORE CHEAT SELECTION) */}
                        {showD20Roller && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.6rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.7rem', opacity: 0.75, whiteSpace: 'nowrap' }}>Sleight</label>
                                        <input
                                            type="number"
                                            value={slightBonus}
                                            onChange={e => setSlightBonus(e.target.value === '' ? '' : Number(e.target.value))}
                                            style={{
                                                width: '3rem',
                                                padding: '0.2rem 0.3rem',
                                                fontSize: '0.8rem',
                                                background: 'var(--color-wood-dark)',
                                                color: 'var(--color-parchment)',
                                                border: '1px solid var(--color-gold)',
                                                borderRadius: '4px',
                                                textAlign: 'center',
                                            }}
                                        />
                                        <label style={{ fontSize: '0.7rem', opacity: 0.75, whiteSpace: 'nowrap' }}>Deception</label>
                                        <input
                                            type="number"
                                            value={deceptionBonus}
                                            onChange={e => setDeceptionBonus(e.target.value === '' ? '' : Number(e.target.value))}
                                            style={{
                                                width: '3rem',
                                                padding: '0.2rem 0.3rem',
                                                fontSize: '0.8rem',
                                                background: 'var(--color-wood-dark)',
                                                color: 'var(--color-parchment)',
                                                border: '1px solid var(--color-gold)',
                                                borderRadius: '4px',
                                                textAlign: 'center',
                                            }}
                                        />
                                    </div>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.6, fontStyle: 'italic' }}>
                                        Select a cheat below to roll ▾
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Cheat buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {(['peek', 'shield', 'loaded_die', 'slip', 'magic_dice'] as CheatType[]).map(cheatType => {
                                // During DM tutorial: only allow the target cheat for each step
                                const tutorialTargetCheat: CheatType | null =
                                    dmTutorialStep === 2 ? 'peek' :
                                        dmTutorialStep === 5 ? 'slip' :
                                            null;
                                const isDisabledByTutorial = tutorialTargetCheat !== null && cheatType !== tutorialTargetCheat;
                                return (
                                    <button
                                        key={cheatType}
                                        className="btn-nautical cheat-btn"
                                        disabled={isDisabledByTutorial}
                                        style={{
                                            fontSize: '0.75rem',
                                            padding: '0.4rem 0.7rem',
                                            opacity: isDisabledByTutorial ? 0.35 : 1,
                                            cursor: isDisabledByTutorial ? 'not-allowed' : 'pointer',
                                        }}
                                        onClick={() => !isDisabledByTutorial && onSelectCheat(cheatType)}
                                    >
                                        {cheatType === 'loaded_die' ? 'Loaded Die' : cheatType === 'magic_dice' ? 'Magic Dice' : cheatType.charAt(0).toUpperCase() + cheatType.slice(1)}
                                    </button>
                                );
                            })}
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
                            className={`die-wrapper ${loadedDieActive ? 'clickable' : ''} ${rerolledDieIndex === i ? 'die-wrapper--rerolled' : ''}`}
                            onClick={() => {
                                if (loadedDieActive) {
                                    console.log('Rerolling die at index:', i);
                                    onRerollDie(i);
                                }
                            }}
                        >
                            <Dice value={val} isSlipped={i >= myBaseDiceCount} isMagic={i >= myBaseDiceCount && myCheat === 'magic_dice'} />
                        </div>
                    ))}
                    {myDice.length === 0 && gameState === 'LOBBY' && (
                        <p style={{ opacity: 0.5, fontStyle: 'italic' }}>Your dice will appear here when the round starts.</p>
                    )}
                    {me && !me.active && (
                        <div style={{ textAlign: 'center' }}>
                            {gameState === 'LOBBY' ? (
                                // Game hasn't started yet — no active players to pick from
                                <div className="parchment-panel" style={{ padding: '1rem', marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <IconSpectator size="1.5rem" />
                                        <p style={{ opacity: 0.85, fontStyle: 'italic', fontSize: '1rem', margin: 0 }}>
                                            {spectatingId
                                                ? <>You'll see <strong>{spectatingName}</strong>'s dice here when the game starts.</>
                                                : <>You're spectating. Pick a player to watch once the game begins.</>
                                            }
                                        </p>
                                    </div>
                                </div>
                            ) : !spectatingId ? (
                                // Spectate picker — mid-game
                                <div className="parchment-panel" style={{ padding: '1rem', marginTop: '0.5rem' }}>
                                    <p style={{ opacity: 0.8, fontStyle: 'italic', fontSize: '1rem', marginBottom: '0.8rem' }}>
                                        You've been eliminated!<br />Well... That or you joined a game that's already in progress.<br />Pick a player to spectate:
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        {players
                                            .filter(p => p.id !== peerId && p.active)
                                            .map(p => (
                                                <button
                                                    key={p.id}
                                                    className="btn-nautical"
                                                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                                                    onClick={() => onSetSpectateTarget?.(p.id)}
                                                >
                                                    {p.name}
                                                </button>
                                            ))
                                        }
                                    </div>
                                </div>
                            ) : (
                                // Spectating display — mid-game with dice
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                        <IconSpectator size="2rem" />
                                        <p style={{ opacity: 0.9, fontStyle: 'italic', fontSize: '1.1rem', margin: 0 }}>
                                            Watching <strong>{spectatingName}</strong>'s hand
                                        </p>
                                    </div>
                                    <div className="my-dice">
                                        {spectatingDice.map((val, i) => (
                                            <div key={i} className="die-wrapper">
                                                <Dice value={val} />
                                            </div>
                                        ))}
                                        {spectatingDice.length === 0 && (
                                            <p style={{ opacity: 0.5, fontStyle: 'italic' }}>Waiting for the next round...</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {isMyTurn && (gameState === 'BIDDING') && !loadedDieActive && (
                    <div className="bidding-controls parchment-panel" style={{ '--bg-bidding-controls': `url(${BASE_URL}images/bg-distress-1.png)` } as React.CSSProperties}>
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
                    <div className="bidding-controls parchment-panel" style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', '--bg-bidding-controls': `url(${BASE_URL}images/bg-distress-1.png)` } as React.CSSProperties}>
                        <h3 style={{ marginBottom: '0.5rem' }}>Ready to bet the farm?</h3>
                        {onAddBot && players.length < 10 && (
                            <button className="btn-nautical" style={{ fontSize: '1rem', padding: '0.5rem 2rem', background: 'var(--color-wood-mid)' }} onClick={onAddBot}>
                                + Spawn Bot Player
                            </button>
                        )}
                        <button className="btn-nautical" style={{ fontSize: '1.2rem', padding: '0.8rem 2rem' }} onClick={() => setShowStartConfirmation(true)}>
                            Start Round
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};

export default GameBoard;
