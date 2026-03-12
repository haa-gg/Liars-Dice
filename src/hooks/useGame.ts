import { useState, useEffect, useCallback } from 'react';
import engine, { GAME_STATES, CHEATS } from '../services/gameEngine';
import { usePeer } from './usePeer';
import { validateMessage, sanitizeName } from '../utils/validation';
import { formatGameLogAsText, formatGameLogAsJSON, downloadGameLog } from '../utils/gameLogger';
import { Player, Bid, GameState, GameOptions, ChallengeResult, GameLogEntry, CheatType } from '../types';

const DEFAULT_OPTIONS: GameOptions = { startingDice: 5, eliminationThreshold: 0, wildsEnabled: true, honorSystemCheats: false };

export interface UseGameReturn {
    gameState: GameState;
    players: Player[];
    currentTurn: string | null;
    currentBid: Bid;
    myDice: number[];
    isHost: boolean;
    error: string | null;
    peerId: string | null;
    connections: string[];
    challengeResult: ChallengeResult | null;
    gameOptions: GameOptions;
    myCheat: CheatType | null;
    myCheatUsed: boolean;
    peekInfo: { playerName: string; dieValue: number } | null;
    loadedDieActive: boolean;
    gameLog: GameLogEntry[];
    nextRoundVotes: Set<string>;
    isReconnecting: boolean;
    reconnect: () => Promise<string | null>;
    setGameOptions: (opts: Partial<GameOptions>) => void;
    assignCheat: (playerId: string, cheat: CheatType | null) => void;
    startRoom: (name: string) => Promise<boolean>;
    joinRoom: (hostId: string, name: string) => Promise<boolean>;
    rejoinRoom: (hostId: string, name: string) => Promise<boolean>;
    startRound: () => void;
    placeBid: (count: number, face: number) => void;
    challenge: () => void;
    usePeek: () => void;
    activateLoadedDie: () => void;
    rerollDie: (index: number) => void;
    dismissPeek: () => void;
    useSlip: () => void;
    useMagicDice: () => void;
    selectCheat: (cheatType: CheatType) => void;
    downloadTextLog: () => void;
    downloadJSONLog: () => void;
    voteNextRound: () => void;
    kickPlayer: (playerId: string) => void;
}

export const useGame = (): UseGameReturn => {
    const { peerId, connections, lastMessage, broadcast, initialize, connectToPeer, sendDirect, closeConnection, error, isReconnecting, reconnect } = usePeer();
    const [gameState, setGameState] = useState<GameState>(GAME_STATES.LOBBY);
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentTurn, setCurrentTurn] = useState<string | null>(null);
    const [currentBid, setCurrentBid] = useState<Bid>({ count: 0, face: 0 });
    const [myDice, setMyDice] = useState<number[]>([]);
    const [isHost, setIsHost] = useState<boolean>(false);
    const [challengeResult, setChallengeResult] = useState<ChallengeResult | null>(null);
    const [gameOptions, setGameOptionsState] = useState<GameOptions>({ ...DEFAULT_OPTIONS });
    const [peekInfo, setPeekInfo] = useState<{ playerName: string; dieValue: number } | null>(null);
    const [loadedDieActive, setLoadedDieActive] = useState<boolean>(false);
    const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
    const [nextRoundVotes, setNextRoundVotes] = useState<Set<string>>(new Set());

    // Derived: this player's cheat info
    const myPlayer = players.find(p => p.id === peerId);
    const myCheat = myPlayer?.cheat ?? null;
    const myCheatUsed = myPlayer?.cheatUsed ?? false;

    // Sync engine state to React + broadcast to clients
    const syncState = useCallback((extraData: any = {}, personalDataMap: Record<string, any> = {}) => {
        setGameState(engine.gameState);
        setPlayers([...engine.players]);
        setCurrentTurn(engine.players[engine.currentTurnIndex]?.id || null);
        setCurrentBid(engine.currentBid);
        setGameLog([...engine.gameLog]);

        const baseState = {
            gameState: engine.gameState,
            players: engine.players.map(p => ({ ...p, dice: [] })),
            currentTurnIndex: engine.currentTurnIndex,
            currentBid: engine.currentBid,
            gameOptions: engine.options,
            gameLog: engine.gameLog,
            ...extraData
        };

        if (Object.keys(personalDataMap).length === 0) {
            broadcast({ type: 'STATE_SYNC', data: baseState });
        } else {
            const allTargets = new Set([...connections, ...Object.keys(personalDataMap)]);
            allTargets.forEach(connId => {
                const pData = personalDataMap[connId] || {};
                sendDirect(connId, { type: 'STATE_SYNC', data: { ...baseState, ...pData } });
            });
        }
    }, [broadcast, connections, sendDirect]);

    // Handle incoming messages
    useEffect(() => {
        if (!lastMessage) return;

        // Validate message structure
        if (!validateMessage(lastMessage.data)) {
            console.warn('Invalid message received:', lastMessage);
            return;
        }

        const { type, data } = lastMessage.data;

        if (isHost) {
            if (type === 'JOIN') {
                const sanitizedName = sanitizeName(data.name);
                const added = engine.addPlayer(lastMessage.from, sanitizedName);
                if (added) {
                    const player = engine.players.find(p => p.id === lastMessage.from);
                    if (player && player.dice.length > 0) {
                        syncState({}, { [lastMessage.from]: { myDice: player.dice } });
                    } else {
                        syncState({}, { [lastMessage.from]: {} });
                    }
                }
            }
            if (type === 'PLACE_BID') {
                if (engine.placeBid(lastMessage.from, data.count, data.face)) syncState();
            }
            if (type === 'CHALLENGE') {
                const result = engine.challenge(lastMessage.from);
                setChallengeResult(result);
                syncState({ challengeResult: result });
            }
            if (type === 'USE_PEEK') {
                const result = engine.peekResult(lastMessage.from);
                const p = engine.players.find(pl => pl.id === lastMessage.from);
                if (p) p.cheatUsed = true;
                syncState({}, { [lastMessage.from]: { peekInfo: result } });
            }
            if (type === 'USE_SLIP') {
                const newDice = engine.useSlip(lastMessage.from);
                if (newDice) {
                    syncState({}, { [lastMessage.from]: { myDice: newDice } });
                }
            }
            if (type === 'USE_MAGIC_DICE') {
                const newDice = engine.useMagicDice(lastMessage.from);
                if (newDice) {
                    syncState({}, { [lastMessage.from]: { myDice: newDice } });
                }
            }
            if (type === 'REROLL_DIE') {
                const newDice = engine.rerollDie(lastMessage.from, data.index);
                if (newDice) {
                    syncState({}, { [lastMessage.from]: { myDice: newDice, loadedDieHandled: true } });
                }
            }
            if (type === 'SELECT_CHEAT') {
                engine.assignCheat(lastMessage.from, data.cheat);
                syncState();
            }
            if (type === 'VOTE_NEXT_ROUND') {
                setNextRoundVotes(prev => {
                    const newVotes = new Set(prev);
                    newVotes.add(lastMessage.from);

                    const totalPlayers = engine.players.length;
                    const votesNeeded = Math.floor(totalPlayers / 2) + 1;

                    if (newVotes.size >= votesNeeded) {
                        startRound();
                        return new Set<string>();
                    }

                    syncState({ nextRoundVotes: Array.from(newVotes) });
                    return newVotes;
                });
            }
        } else {
            if (type === 'STATE_SYNC') {
                setGameState(data.gameState);
                setPlayers(data.players);
                setCurrentTurn(data.players[data.currentTurnIndex]?.id || null);
                setCurrentBid(data.currentBid);
                if (data.myDice) setMyDice(data.myDice);
                if (data.challengeResult !== undefined) setChallengeResult(data.challengeResult);
                if (data.gameOptions) setGameOptionsState(data.gameOptions);
                if (data.peekInfo) setPeekInfo(data.peekInfo);
                if (data.loadedDieHandled) setLoadedDieActive(false);
                if (data.gameLog) setGameLog(data.gameLog);
                if (data.nextRoundVotes !== undefined) setNextRoundVotes(new Set(data.nextRoundVotes));

                if (data.roundReset) {
                    setChallengeResult(null);
                    setPeekInfo(null);
                    setLoadedDieActive(false);
                    setNextRoundVotes(new Set());
                }
            }

            if (type === 'KICKED') {
                alert("You have been kicked from the table by the host.");
                window.location.reload();
            }
        }
    }, [lastMessage, isHost, syncState, sendDirect]);

    useEffect(() => {
        if (!isHost) return;

        const connectedIds = new Set([peerId as string, ...connections]);
        const disconnectedPlayers = engine.players.filter(p => !connectedIds.has(p.id));

        if (disconnectedPlayers.length > 0) {
            disconnectedPlayers.forEach(p => {
                console.log(`Player ${p.name} disconnected`);
                engine.gameLog.push({
                    timestamp: new Date().toISOString(),
                    round: engine.currentRoundNumber,
                    event: 'PLAYER_DISCONNECTED',
                    playerId: p.id,
                    playerName: p.name
                });
                engine.removePlayer(p.id);
            });

            const activePlayers = engine.players.filter(p => p.active);
            if (activePlayers.length <= 1) {
                engine.gameState = GAME_STATES.GAME_OVER;
                if (activePlayers.length === 1) {
                    engine.gameLog.push({
                        timestamp: new Date().toISOString(),
                        round: engine.currentRoundNumber,
                        event: 'GAME_END',
                        winnerId: activePlayers[0].id,
                        winnerName: activePlayers[0].name,
                        reason: 'Other players disconnected'
                    });
                }
            }
            syncState();
        }
    }, [connections, isHost, peerId, syncState]);

    const startRoom = async (name: string) => {
        try {
            engine.reset();
            const id = await initialize();
            if (!id) throw new Error('Failed to get Peer ID');
            setIsHost(true);
            const sanitizedName = sanitizeName(name);
            engine.addPlayer(id, sanitizedName);

            setChallengeResult(null);
            setPeekInfo(null);
            setLoadedDieActive(false);
            setMyDice([]);

            syncState();
            return true;
        } catch (err) {
            return false;
        }
    };

    const joinRoom = async (hostId: string, name: string): Promise<boolean> => {
        await initialize();
        const sanitizedName = sanitizeName(name);

        return new Promise((resolve, reject) => {
            const conn = connectToPeer(hostId, { name: sanitizedName }, () => {
                sendDirect(hostId, { type: 'JOIN', data: { name: sanitizedName } });
                resolve(true);
            });

            const timeout = setTimeout(() => {
                reject(new Error("Connection to host timed out. Check the Room ID or your VPN settings."));
            }, 8000);

            if (conn) {
                conn.on('open', () => clearTimeout(timeout));
                conn.on('error', (err: any) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            } else {
                clearTimeout(timeout);
                reject(new Error("Failed to initialize connection."));
            }
        });
    };

    const rejoinRoom = (hostId: string, name: string): Promise<boolean> => {
        const sanitizedName = sanitizeName(name);
        return new Promise((resolve, reject) => {
            const conn = connectToPeer(hostId, { name: sanitizedName }, () => {
                sendDirect(hostId, { type: 'JOIN', data: { name: sanitizedName } });
                resolve(true);
            });

            const timeout = setTimeout(() => {
                reject(new Error("Connection to host timed out during reconnect."));
            }, 8000);

            if (conn) {
                conn.on('open', () => clearTimeout(timeout));
                conn.on('error', (err: any) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            } else {
                clearTimeout(timeout);
                reject(new Error("Failed to initialize connection."));
            }
        });
    };

    const setGameOptions = (opts: Partial<GameOptions>) => {
        if (!isHost) return;
        const newOptions = { ...gameOptions, ...opts };
        setGameOptionsState(newOptions);
        engine.setOptions(newOptions);
        syncState();
    };

    const assignCheat = (playerId: string, cheat: CheatType | null) => {
        if (!isHost) return;
        engine.assignCheat(playerId, cheat);
        syncState();
    };

    const placeBid = (count: number, face: number) => {
        if (isHost) {
            if (engine.placeBid(peerId as string, count, face)) syncState();
        } else {
            broadcast({ type: 'PLACE_BID', data: { count, face } });
        }
    };

    const challenge = () => {
        if (isHost) {
            const result = engine.challenge(peerId as string);
            setChallengeResult(result);
            syncState({ challengeResult: result });
        } else {
            broadcast({ type: 'CHALLENGE', data: {} });
        }
    };

    const usePeek = () => {
        if (myCheat !== CHEATS.PEEK || myCheatUsed) return;
        if (isHost) {
            const result = engine.peekResult(peerId as string);
            const p = engine.players.find(pl => pl.id === peerId);
            if (p) p.cheatUsed = true;
            setPeekInfo(result);
            syncState();
        } else {
            broadcast({ type: 'USE_PEEK', data: {} });
        }
    };

    const useSlip = () => {
        if (myCheat !== CHEATS.SLIP || myCheatUsed) return;
        if (isHost) {
            const newDice = engine.useSlip(peerId as string);
            if (newDice) { setMyDice([...newDice]); syncState(); }
        } else {
            broadcast({ type: 'USE_SLIP', data: {} });
        }
    };

    const useMagicDice = () => {
        if (myCheat !== CHEATS.MAGIC_DICE || myCheatUsed) return;
        if (isHost) {
            const newDice = engine.useMagicDice(peerId as string);
            if (newDice) { setMyDice([...newDice]); syncState(); }
        } else {
            broadcast({ type: 'USE_MAGIC_DICE', data: {} });
        }
    };

    const activateLoadedDie = () => {
        if (myCheat !== CHEATS.LOADED_DIE || myCheatUsed) return;
        setLoadedDieActive(true);
    };

    const rerollDie = (index: number) => {
        if (!loadedDieActive) return;
        setLoadedDieActive(false);
        if (isHost) {
            const newDice = engine.rerollDie(peerId as string, index);
            if (newDice) { setMyDice([...newDice]); syncState(); }
        } else {
            broadcast({ type: 'REROLL_DIE', data: { index } });
        }
    };

    const dismissPeek = () => setPeekInfo(null);

    const selectCheat = (cheatType: CheatType) => {
        if (!gameOptions.honorSystemCheats) return;
        if (isHost) {
            engine.assignCheat(peerId as string, cheatType);
            syncState();
        } else {
            broadcast({ type: 'SELECT_CHEAT', data: { cheat: cheatType } });
        }
    };

    const downloadTextLog = () => {
        const textLog = formatGameLogAsText(engine.gameLog, engine.options);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        downloadGameLog(textLog, `liars-dice-log-${timestamp}.txt`, 'text/plain');
    };

    const downloadJSONLog = () => {
        const jsonLog = formatGameLogAsJSON(engine.gameLog, engine.options, peerId);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        downloadGameLog(jsonLog, `liars-dice-log-${timestamp}.json`, 'application/json');
    };

    const startRound = () => {
        if (!isHost) return;
        engine.setOptions(gameOptions);
        engine.startRound();
        setChallengeResult(null);
        setPeekInfo(null);
        setLoadedDieActive(false);
        setNextRoundVotes(new Set<string>());

        const hostPlayer = engine.players.find(p => p.id === peerId);
        if (hostPlayer) setMyDice([...hostPlayer.dice]);

        const personalMap: Record<string, any> = {};
        engine.players.forEach(p => {
            if (p.id !== peerId) personalMap[p.id] = { myDice: [...p.dice] };
        });

        syncState({ roundReset: true, challengeResult: null }, personalMap);
    };

    const voteNextRound = () => {
        if (isHost) {
            startRound();
        } else {
            broadcast({ type: 'VOTE_NEXT_ROUND', data: {} });
            setNextRoundVotes(prev => new Set([...prev, peerId as string]));
        }
    };

    const kickPlayer = (playerId: string) => {
        if (!isHost || playerId === peerId) return;

        // 1. Notify the player they are being kicked
        sendDirect(playerId, { type: 'KICKED', data: {} });

        // 2. Short delay to ensure message is sent before closing connection
        setTimeout(() => {
            // 3. Log the kick
            const player = engine.players.find(p => p.id === playerId);
            engine.gameLog.push({
                timestamp: new Date().toISOString(),
                round: engine.currentRoundNumber,
                event: 'PLAYER_KICKED' as any,
                playerId: playerId,
                playerName: player?.name || 'Unknown'
            });

            // 4. Remove from engine and peer connections
            engine.removePlayer(playerId);
            closeConnection(playerId);

            // 5. Sync to remaining
            syncState();
        }, 500);
    };

    return {
        gameState, players, currentTurn, currentBid, myDice,
        isHost, error, peerId, connections,
        challengeResult, gameOptions, myCheat, myCheatUsed,
        peekInfo, loadedDieActive, gameLog, nextRoundVotes,
        isReconnecting, reconnect,
        setGameOptions, assignCheat,
        startRoom, joinRoom, rejoinRoom, startRound, placeBid, challenge,
        usePeek, activateLoadedDie, rerollDie, dismissPeek, useSlip, useMagicDice, selectCheat,
        downloadTextLog, downloadJSONLog, voteNextRound, kickPlayer,
    };
};
