import { useState, useEffect, useCallback, useRef } from 'react';
import engine, { GAME_STATES, CHEATS } from '../services/gameEngine';
import { usePeer } from './usePeer';
import { validateMessage, sanitizeName } from '../utils/validation';
import { formatGameLogAsText, formatGameLogAsJSON, downloadGameLog } from '../utils/gameLogger';
import { getBotAction } from '../utils/botLogic';
import randomNames from '../data/randomNames.json';
import { Player, Bid, GameState, GameOptions, ChallengeResult, GameLogEntry, CheatType, ClientMessage, StateSyncPayload } from '../types';

const DEFAULT_OPTIONS: GameOptions = { startingDice: 5, eliminationThreshold: 0, wildsEnabled: true, honorSystemCheats: false, hostBonusDice: 0 };

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
    peekTargetId: string | null;
    loadedDieActive: boolean;
    rerolledDieIndex: number | null;
    gameLog: GameLogEntry[];
    nextRoundVotes: Set<string>;
    spectatingId: string | null;
    spectatingDice: number[];
    spectatingName: string | null;
    isReconnecting: boolean;
    reconnect: () => Promise<string | null>;
    reconnectAsHost: (name: string) => Promise<string | null>;
    setGameOptions: (opts: Partial<GameOptions>) => void;
    assignCheat: (playerId: string, cheat: CheatType | null) => void;
    startRoom: (name: string) => Promise<boolean>;
    joinRoom: (hostId: string, name: string, asSpectator?: boolean) => Promise<boolean>;
    rejoinRoom: (hostId: string, name: string) => Promise<boolean>;
    startRound: () => void;
    addBot: () => void;
    placeBid: (count: number, face: number) => void;
    challenge: () => void;
    usePeek: (targetPlayerId: string) => void;
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
    setPeekTargetId: (id: string | null) => void;
    setSpectateTarget: (targetId: string) => void;
    leaveRoom: () => void;
    rollSkillCheck: (roll: number, sleightBonus: number, deceptionBonus: number) => void;
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
    const [peekTargetId, setPeekTargetId] = useState<string | null>(null);
    const [loadedDieActive, setLoadedDieActive] = useState<boolean>(false);
    const [rerolledDieIndex, setRerolledDieIndex] = useState<number | null>(null);
    const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
    const [nextRoundVotes, setNextRoundVotes] = useState<Set<string>>(new Set());
    const [spectatingId, setSpectatingId] = useState<string | null>(null);
    const [spectatingDice, setSpectatingDice] = useState<number[]>([]);
    const [spectatingName, setSpectatingName] = useState<string | null>(null);

    // Host-side: track which eliminated players are spectating whom
    const spectatorMapRef = useRef<Record<string, string>>({});

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

        const baseState: StateSyncPayload = {
            gameState: engine.gameState,
            players: engine.players.map(p => ({ ...p, dice: [] })),
            currentTurnIndex: engine.currentTurnIndex,
            currentBid: engine.currentBid,
            gameOptions: engine.options,
            gameLog: engine.gameLog,
            ...extraData
        };

        // Inject spectated dice into personalDataMap for each spectator
        const specMap = spectatorMapRef.current;
        for (const [spectatorId, targetId] of Object.entries(specMap)) {
            const target = engine.players.find(p => p.id === targetId);
            if (target && target.active) {
                console.log(`[Host] Syncing spectated dice for ${spectatorId}: target=${target.name}, dice=${target.dice.length}`);
                // If it's for the host (local state), update host state directly
                if (spectatorId === peerId) {
                    setSpectatingDice([...target.dice]);
                    setSpectatingName(target.name);
                } else {
                    if (!personalDataMap[spectatorId]) personalDataMap[spectatorId] = {};
                    personalDataMap[spectatorId].spectatingDice = [...target.dice];
                    personalDataMap[spectatorId].spectatingName = target.name;
                }
            }
        }

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

    /** Type-safe helper for client → host messages. */
    const sendToHost = (msg: ClientMessage) => broadcast(msg);

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
                const added = engine.addPlayer(lastMessage.from, sanitizedName, data.asSpectator === true);
                if (added) {
                    const player = engine.players.find(p => p.id === lastMessage.from);
                    if (player && player.dice.length > 0) {
                        // For rejoining players during a round, send their dice specifically
                        syncState({}, { [lastMessage.from]: { myDice: player.dice } });
                    } else {
                        // For new players or those without dice, send a clean state
                        syncState({ roundReset: true }, { [lastMessage.from]: {} });
                    }
                    syncState();
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
                const result = engine.peekResult(lastMessage.from, data.targetPlayerId);
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
            if (type === 'PING') {
                sendDirect(lastMessage.from, { type: 'PONG', data: {} });
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
            if (type === 'ROLL_SKILL_CHECK') {
                engine.logSkillCheck(lastMessage.from, data.roll, data.sleightBonus, data.deceptionBonus);
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
            if (type === 'SPECTATE') {
                const sPlayer = engine.players.find(p => p.id === lastMessage.from);
                const tPlayer = engine.players.find(p => p.id === data.targetId);
                console.log(`[Host] SPECTATE msg from ${lastMessage.from}: target=${data.targetId}, foundS=${!!sPlayer}, foundT=${!!tPlayer}`);
                if (sPlayer && !sPlayer.active && tPlayer && tPlayer.active) {
                    console.log(`[Host] spectated target dice length: ${tPlayer.dice.length}`);
                    spectatorMapRef.current[lastMessage.from] = data.targetId;
                    // Send spectated dice immediately
                    sendDirect(lastMessage.from, {
                        type: 'STATE_SYNC',
                        data: {
                            ...{
                                gameState: engine.gameState,
                                players: engine.players.map(p => ({ ...p, dice: [] })),
                                currentTurnIndex: engine.currentTurnIndex,
                                currentBid: engine.currentBid,
                                gameOptions: engine.options,
                                gameLog: engine.gameLog,
                            },
                            spectatingDice: [...tPlayer.dice],
                            spectatingName: tPlayer.name,
                        }
                    });
                }
            }
            if (type === 'LEAVE') {
                engine.removePlayer(lastMessage.from);
                closeConnection(lastMessage.from);
                syncState();
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
                if (data.spectatingDice) {
                    console.log(`[Client] Received spectatingDice: ${data.spectatingDice.length}`);
                    setSpectatingDice(data.spectatingDice);
                }
                if (data.spectatingName) {
                    console.log(`[Client] Received spectatingName: ${data.spectatingName}`);
                    setSpectatingName(data.spectatingName);
                }

                if (data.roundReset) {
                    setChallengeResult(null);
                    setPeekInfo(null);
                    setLoadedDieActive(false);
                    setNextRoundVotes(new Set());
                    // Keep spectatingId — spectated dice will refresh via syncState
                }

                // Clear spectating on new game
                if (data.gameState === 'LOBBY') {
                    setSpectatingId(null);
                    setSpectatingDice([]);
                    setSpectatingName(null);
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
        const disconnectedPlayers = engine.players.filter(p => p.connected && !p.id.startsWith('BOT_') && !connectedIds.has(p.id));

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
                engine.markPlayerDisconnected(p.id);
            });

            const activePlayers = engine.players.filter(p => p.active && p.connected);
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
            engine.setHost(id);

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

    const reconnectAsHost = async (name: string) => {
        try {
            engine.reset();
            const id = await reconnect();
            if (!id) throw new Error('Failed to get Peer ID');
            setIsHost(true);
            const sanitizedName = sanitizeName(name);
            engine.addPlayer(id, sanitizedName);
            engine.setHost(id);

            setChallengeResult(null);
            setPeekInfo(null);
            setLoadedDieActive(false);
            setMyDice([]);

            syncState();
            return id;
        } catch (err) {
            throw err;
        }
    };

    const joinRoom = async (hostId: string, name: string, asSpectator = false): Promise<boolean> => {
        await initialize();
        const sanitizedName = sanitizeName(name);

        return new Promise((resolve, reject) => {
            const conn = connectToPeer(hostId, { name: sanitizedName }, () => {
                sendDirect(hostId, { type: 'JOIN', data: { name: sanitizedName, asSpectator } });
                resolve(true);
            });

            const timeout = setTimeout(() => {
                reject(new Error("Connection to host timed out. If you're using a VPN, it might be taking longer to establish a secure link."));
            }, 15000);

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
                reject(new Error("Connection to host timed out during reconnect. Still trying to find a path..."));
            }, 15000);

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

    const leaveRoom = () => {
        if (!isHost) {
            sendToHost({ type: 'LEAVE', data: {} as Record<string, never> });
        }
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
            sendToHost({ type: 'PLACE_BID', data: { count, face } });
        }
    };

    const challenge = () => {
        if (isHost) {
            const result = engine.challenge(peerId as string);
            setChallengeResult(result);
            syncState({ challengeResult: result });
        } else {
            sendToHost({ type: 'CHALLENGE', data: {} as Record<string, never> });
        }
    };

    const usePeek = (targetPlayerId: string) => {
        if (myCheat !== CHEATS.PEEK || myCheatUsed) return;
        if (isHost) {
            const result = engine.peekResult(peerId as string, targetPlayerId);
            const p = engine.players.find(pl => pl.id === peerId);
            if (p) p.cheatUsed = true;
            setPeekInfo(result);
            syncState();
        } else {
            sendToHost({ type: 'USE_PEEK', data: { targetPlayerId } });
        }
    };

    const useSlip = () => {
        if (myCheat !== CHEATS.SLIP || myCheatUsed) return;
        if (isHost) {
            const newDice = engine.useSlip(peerId as string);
            if (newDice) { setMyDice([...newDice]); syncState(); }
        } else {
            sendToHost({ type: 'USE_SLIP', data: {} as Record<string, never> });
        }
    };

    const useMagicDice = () => {
        if (myCheat !== CHEATS.MAGIC_DICE || myCheatUsed) return;
        if (isHost) {
            const newDice = engine.useMagicDice(peerId as string);
            if (newDice) { setMyDice([...newDice]); syncState(); }
        } else {
            sendToHost({ type: 'USE_MAGIC_DICE', data: {} as Record<string, never> });
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
            if (newDice) {
                setMyDice([...newDice]);
                setRerolledDieIndex(index);
                setTimeout(() => setRerolledDieIndex(null), 2500);
                syncState();
            }
        } else {
            sendToHost({ type: 'REROLL_DIE', data: { index } });
        }
    };

    const dismissPeek = () => setPeekInfo(null);

    const selectCheat = (cheatType: CheatType) => {
        if (!gameOptions.honorSystemCheats) return;
        if (isHost) {
            engine.assignCheat(peerId as string, cheatType);
            syncState();
        } else {
            sendToHost({ type: 'SELECT_CHEAT', data: { cheat: cheatType } });
        }
    };

    const rollSkillCheck = (roll: number, sleightBonus: number, deceptionBonus: number) => {
        if (isHost) {
            engine.logSkillCheck(peerId as string, roll, sleightBonus, deceptionBonus);
            syncState();
        } else {
            sendToHost({ type: 'ROLL_SKILL_CHECK', data: { roll, sleightBonus, deceptionBonus } });
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

    const setSpectateTarget = (targetId: string) => {
        // Only eliminated players can spectate, and only once (locked in)
        if (!myPlayer || myPlayer.active || spectatingId) return;
        
        const target = players.find(p => p.id === targetId);
        if (!target) return;

        setSpectatingId(targetId);
        setSpectatingName(target.name); // Set name immediately for UI

        if (isHost) {
            // Host is eliminated and spectating — set locally
            spectatorMapRef.current[peerId as string] = targetId;
            const engineTarget = engine.players.find(p => p.id === targetId);
            if (engineTarget) {
                setSpectatingDice([...engineTarget.dice]);
            }
        } else {
            sendToHost({ type: 'SPECTATE', data: { targetId } });
        }
    };

    const startRound = () => {
        if (!isHost) return;
        engine.setOptions(gameOptions);

        // Clear spectating on new game
        if (engine.gameState === GAME_STATES.GAME_OVER) {
            spectatorMapRef.current = {};
            setSpectatingId(null);
            setSpectatingDice([]);
            setSpectatingName(null);
        }

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
            sendToHost({ type: 'VOTE_NEXT_ROUND', data: {} as Record<string, never> });
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

    const addBot = () => {
        if (!isHost) return;
        const botId = `BOT_${Date.now()}`;
        const validNames = (randomNames as any).names || randomNames;
        const name = validNames[Math.floor(Math.random() * validNames.length)] + " (Bot)";
        
        if (engine.addPlayer(botId, name, false)) {
            syncState();
        }
    };

    // Bot turn logic
    useEffect(() => {
        if (!isHost || gameState !== 'BIDDING' || !currentTurn) return;

        if (currentTurn.startsWith('BOT_')) {
            const timer = setTimeout(() => {
                const action = getBotAction(engine);
                if (action.type === 'BID') {
                    if (engine.placeBid(currentTurn, action.count, action.face)) syncState();
                } else if (action.type === 'CHALLENGE') {
                    const result = engine.challenge(currentTurn);
                    if (result) {
                        setChallengeResult(result);
                        syncState({ challengeResult: result });
                    }
                }
            }, 3000); // 3 second thought delay
            return () => clearTimeout(timer);
        }
    }, [gameState, currentTurn, isHost, syncState]);

    return {
        gameState, players, currentTurn, currentBid, myDice,
        isHost, error, peerId, connections,
        challengeResult, gameOptions, myCheat, myCheatUsed,
        peekInfo, peekTargetId, loadedDieActive, rerolledDieIndex, gameLog, nextRoundVotes,
        spectatingId, spectatingDice, spectatingName,
        isReconnecting, reconnect, reconnectAsHost,
        setGameOptions, assignCheat,
        startRoom, joinRoom, rejoinRoom, startRound, placeBid, challenge,
        usePeek, activateLoadedDie, rerollDie, dismissPeek, useSlip, useMagicDice, selectCheat,
        downloadTextLog, downloadJSONLog, voteNextRound, kickPlayer,
        setPeekTargetId, setSpectateTarget, addBot, leaveRoom, rollSkillCheck,
    };
};
