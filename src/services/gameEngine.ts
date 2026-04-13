import { Player, Bid, GameOptions, GameLogEntry, GameState, CheatType, ChallengeResult } from '../types';

export const GAME_STATES: Record<string, GameState> = {
    LOBBY: 'LOBBY',
    ROLLING: 'ROLLING',
    BIDDING: 'BIDDING',
    REVEALING: 'REVEALING',
    ROUND_END: 'ROUND_END',
    GAME_OVER: 'GAME_OVER'
};

export const CHEATS: Record<string, CheatType> = {
    PEEK: 'peek',
    SHIELD: 'shield',
    LOADED_DIE: 'loaded_die',
    SLIP: 'slip',
    MAGIC_DICE: 'magic_dice',
};

export const CHEAT_LABELS: Record<CheatType, string> = {
    peek: 'Peek',
    shield: 'Shield',
    loaded_die: 'Loaded Die',
    slip: 'Slip',
    magic_dice: 'Magic Dice',
};

const DEFAULT_OPTIONS: GameOptions = { startingDice: 5, eliminationThreshold: 0, wildsEnabled: true, honorSystemCheats: false, hostBonusDice: 0 };

class GameEngine {
    options: GameOptions = { ...DEFAULT_OPTIONS };
    gameState: GameState = GAME_STATES.LOBBY;
    players: Player[] = [];
    currentTurnIndex: number = 0;
    currentBid: Bid = { count: 0, face: 0 };
    lastBidderId: string | null = null;
    history: any[] = [];
    currentRoundSnapshot: any[] | null = null;
    gameLog: GameLogEntry[] = [];
    currentRoundNumber: number = 0;
    gameStartTime: string | null = null;
    hostId: string | null = null;

    constructor() {
        this.reset();
    }

    reset() {
        this.options = { ...DEFAULT_OPTIONS };
        this.gameState = GAME_STATES.LOBBY;
        this.players = [];
        this.currentTurnIndex = 0;
        this.currentBid = { count: 0, face: 0 };
        this.lastBidderId = null;
        this.history = [];
        this.currentRoundSnapshot = null;
        this.gameLog = [];  // Full game log for export
        this.currentRoundNumber = 0;
        this.gameStartTime = null;
        this.hostId = null;
    }

    setOptions(opts: Partial<GameOptions>) {
        this.options = { ...this.options, ...opts };
    }

    setHost(id: string) {
        this.hostId = id;
    }

    markPlayerDisconnected(id: string) {
        const playerIndex = this.players.findIndex(p => p.id === id);
        if (playerIndex === -1) return;

        const player = this.players[playerIndex];
        player.connected = false;
        // Turn advancement is now handled more deliberately to avoid skipping 
        // players who might be briefly reconnecting.
    }

    handlePlayerReconnect(id: string): boolean {
        const player = this.players.find(p => p.id === id);
        if (player) {
            player.connected = true;
            return true;
        }
        return false;
    }

    addPlayer(id: string, name: string, forceSpectator = false): boolean {
        // If reconnecting with exact same peerId
        if (this.handlePlayerReconnect(id)) {
            this.gameLog.push({
                timestamp: new Date().toISOString(),
                round: this.currentRoundNumber,
                event: 'PLAYER_RECONNECTED',
                playerId: id,
                playerName: name
            });
            return true;
        }

        // If reconnecting by exact name (hijacking a player slot - useful if disconnect hasn't been detected yet)
        const existingPlayer = this.players.find(p => p.name === name);
        if (existingPlayer) {
            existingPlayer.id = id;
            existingPlayer.connected = true;
            this.gameLog.push({
                timestamp: new Date().toISOString(),
                round: this.currentRoundNumber,
                event: 'PLAYER_RECONNECTED',
                playerId: id,
                playerName: existingPlayer.name
            });
            return true;
        }

        if (this.players.length < 10) {
            let uniqueName = name;
            let counter = 2;
            while (this.players.some(p => p.name === uniqueName)) {
                uniqueName = `${name} (${counter})`;
                counter++;
            }

            const isMidGame = this.gameState !== GAME_STATES.LOBBY;
            const spectator = forceSpectator || isMidGame;

            this.players.push({
                id, name: uniqueName, dice: [], active: !spectator, connected: true,
                diceCount: spectator ? 0 : this.options.startingDice,
                cheat: null, cheatUsed: false,
                isSpectator: spectator,
                permanentSpectator: forceSpectator
            });
            return true;
        }
        return false;
    }

    assignCheat(playerId: string, cheat: CheatType | null) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.cheat = cheat;
            player.cheatUsed = false;
        }
    }

    removePlayer(id: string) {
        const removedIndex = this.players.findIndex(p => p.id === id);
        if (removedIndex === -1) return;

        this.players = this.players.filter(p => p.id !== id);

        // Adjust currentTurnIndex if needed
        if (this.players.length === 0) {
            this.currentTurnIndex = 0;
            return;
        }

        // If we removed a player before current turn, shift index back
        if (removedIndex < this.currentTurnIndex) {
            this.currentTurnIndex--;
        }

        // If current turn index is now out of bounds or pointing to inactive/disconnected player
        if (this.currentTurnIndex >= this.players.length) {
            this.currentTurnIndex = 0;
        }

        // Make sure we're pointing to an active and connected player
        const activePlayers = this.players.filter(p => p.active && p.connected);
        if (activePlayers.length > 0 && !(this.players[this.currentTurnIndex]?.active && this.players[this.currentTurnIndex]?.connected)) {
            // Find next active and connected player
            let attempts = 0;
            while (!(this.players[this.currentTurnIndex]?.active && this.players[this.currentTurnIndex]?.connected) && attempts < this.players.length) {
                this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
                attempts++;
            }
        }
    }

    startRound() {
        // Check if this is a new game (after GAME_OVER) BEFORE changing state
        const isNewGame = this.gameState === GAME_STATES.GAME_OVER;

        this.gameState = GAME_STATES.ROLLING;
        this.currentRoundSnapshot = null;  // Clear previous round snapshot

        if (isNewGame) {
            // Reset all players for new game; permanent spectators stay inactive
            this.players.forEach(p => {
                if (p.permanentSpectator) return; // stays on the sidelines
                p.active = true;
                p.diceCount = p.id === this.hostId
                    ? this.options.startingDice + (this.options.hostBonusDice ?? 0)
                    : this.options.startingDice;
                p.dice = [];
                p.cheat = this.options.honorSystemCheats ? null : p.cheat;
                p.cheatUsed = false;
                p.isSpectator = false;
            });
            this.currentRoundNumber = 0; // Reset round counter for new game
        } else {
            // Activate mid-game joiners who are waiting as spectators (not permanent spectators)
            this.players.forEach(p => {
                if (!p.active && p.connected && p.diceCount === 0 && p.isSpectator && !p.permanentSpectator) {
                    p.active = true;
                    p.diceCount = this.options.startingDice;
                    p.isSpectator = false;
                }
            });

            // First-ever round from LOBBY: host's diceCount was set in addPlayer (= startingDice).
            // Bump it now so the bonus applies from game start.
            if (this.currentRoundNumber === 0 && this.hostId && (this.options.hostBonusDice ?? 0) > 0) {
                const host = this.players.find(p => p.id === this.hostId);
                if (host && host.active && !host.permanentSpectator) {
                    host.diceCount = this.options.startingDice + this.options.hostBonusDice;
                }
            }
        }

        this.currentRoundNumber++;

        if (!this.gameStartTime || isNewGame) {
            this.gameStartTime = new Date().toISOString();
        }

        // Reset cheat usage for new round (honor system allows re-selection)
        if (this.options.honorSystemCheats) {
            this.players.forEach(p => {
                p.cheat = null;
                p.cheatUsed = false;
            });
        } else {
            // Just reset usage flag for assigned cheats
            this.players.forEach(p => {
                p.cheatUsed = false;
            });
        }

        // Log round start
        this.gameLog.push({
            timestamp: new Date().toISOString(),
            round: this.currentRoundNumber,
            event: 'ROUND_START',
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                diceCount: p.diceCount,
                active: p.active
            }))
        });

        this.players.forEach(p => {
            p.dice = []; // Clear previous dice
            if (p.active) {
                p.dice = Array.from({ length: p.diceCount }, () => Math.floor(Math.random() * 6) + 1);
            }
        });
        this.currentBid = { count: 0, face: 0 };

        // Ensure currentTurnIndex points to an active and connected player
        if (!(this.players[this.currentTurnIndex]?.active && this.players[this.currentTurnIndex]?.connected)) {
            // Find the next active and connected player
            const activePlayers = this.players.filter(p => p.active && p.connected);
            if (activePlayers.length > 0) {
                // Start from current index and find next active and connected player
                let attempts = 0;
                while (!(this.players[this.currentTurnIndex]?.active && this.players[this.currentTurnIndex]?.connected) && attempts < this.players.length) {
                    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
                    attempts++;
                }
            }
        }

        this.gameState = GAME_STATES.BIDDING;
    }

    // Slip: secretly add 1 extra die to hand mid-round
    useSlip(playerId: string): number[] | null {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.cheat !== CHEATS.SLIP || player.cheatUsed || this.gameState !== GAME_STATES.BIDDING) return null;
        player.dice.push(Math.floor(Math.random() * 6) + 1);
        player.cheatUsed = true;

        // Log slip use
        this.gameLog.push({
            timestamp: new Date().toISOString(),
            round: this.currentRoundNumber,
            event: 'CHEAT_USED',
            cheatType: 'SLIP',
            playerId: playerId,
            playerName: player.name,
            details: 'Added 1 extra die'
        });

        return [...player.dice];
    }

    // Magic Dice: add 2 extra dice to hand mid-round
    useMagicDice(playerId: string): number[] | null {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.cheat !== CHEATS.MAGIC_DICE || player.cheatUsed || this.gameState !== GAME_STATES.BIDDING) return null;
        player.dice.push(Math.floor(Math.random() * 6) + 1);
        player.dice.push(Math.floor(Math.random() * 6) + 1);
        player.cheatUsed = true;

        // Log magic dice use
        this.gameLog.push({
            timestamp: new Date().toISOString(),
            round: this.currentRoundNumber,
            event: 'CHEAT_USED',
            cheatType: 'MAGIC_DICE',
            playerId: playerId,
            playerName: player.name,
            details: 'Added 2 extra dice'
        });

        return [...player.dice];
    }

    // Loaded Die: re-roll one specific die for a player
    rerollDie(playerId: string, index: number): number[] | null {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.cheat !== CHEATS.LOADED_DIE || player.cheatUsed || index < 0 || index >= player.dice.length) return null;
        const oldValue = player.dice[index];
        player.dice[index] = Math.floor(Math.random() * 6) + 1;
        player.cheatUsed = true;

        // Log loaded die use
        this.gameLog.push({
            timestamp: new Date().toISOString(),
            round: this.currentRoundNumber,
            event: 'CHEAT_USED',
            cheatType: 'LOADED_DIE',
            playerId: playerId,
            playerName: player.name,
            details: `Re-rolled die from ${oldValue} to ${player.dice[index]}`
        });

        return [...player.dice];
    }

    // Peek: reveal one random die from an opponent (or a chosen opponent)
    peekResult(peekingPlayerId: string, targetPlayerId?: string): { playerName: string, dieValue: number } | null {
        const player = this.players.find(p => p.id === peekingPlayerId);
        const others = this.players.filter(p => p.id !== peekingPlayerId && p.active && p.dice.length > 0);
        if (others.length === 0) return null;
        const rp = targetPlayerId
            ? (others.find(p => p.id === targetPlayerId) ?? others[Math.floor(Math.random() * others.length)])
            : others[Math.floor(Math.random() * others.length)];
        const dieValue = rp.dice[Math.floor(Math.random() * rp.dice.length)];

        // Log peek use
        this.gameLog.push({
            timestamp: new Date().toISOString(),
            round: this.currentRoundNumber,
            event: 'CHEAT_USED',
            cheatType: 'PEEK',
            playerId: peekingPlayerId,
            playerName: player?.name || 'Unknown',
            details: `Peeked at ${rp.name}'s die: ${dieValue}`
        });

        return { playerName: rp.name, dieValue };
    }

    logSkillCheck(playerId: string, roll: number, sleightBonus: number, deceptionBonus: number) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        this.gameLog.push({
            timestamp: new Date().toISOString(),
            round: this.currentRoundNumber,
            event: 'SKILL_CHECK',
            playerId: playerId,
            playerName: player.name,
            roll,
            sleightBonus,
            deceptionBonus,
            totalSleight: roll + sleightBonus,
            totalDeception: roll + deceptionBonus
        });
    }

    placeBid(playerId: string, count: number, face: number): boolean {
        if (count > this.currentBid.count || (count === this.currentBid.count && face > this.currentBid.face)) {
            const player = this.players.find(p => p.id === playerId);

            // Log the bid
            this.gameLog.push({
                timestamp: new Date().toISOString(),
                round: this.currentRoundNumber,
                event: 'BID',
                playerId: playerId,
                playerName: player?.name || 'Unknown',
                bid: { count, face }
            });

            this.currentBid = { count, face };
            this.lastBidderId = playerId;
            this.nextTurn();
            return true;
        }
        return false;
    }

    nextTurn() {
        const activePlayers = this.players.filter(p => p.active && p.connected);
        if (activePlayers.length === 0) {
            console.error('No active and connected players for next turn');
            return;
        }

        do {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
        } while (!(this.players[this.currentTurnIndex].active && this.players[this.currentTurnIndex].connected));
    }

    challenge(challengerId: string): ChallengeResult {
        this.gameState = GAME_STATES.REVEALING;

        // Capture snapshot of all dice before resolving (only active and connected players count towards the bid)
        this.currentRoundSnapshot = this.players
            .filter(p => p.active && p.connected)
            .map(p => ({
                id: p.id,
                name: p.name,
                dice: [...p.dice],
                active: p.active
            }));

        const allDice = this.players.filter(p => p.active && p.connected).flatMap(p => p.dice);
        const count = allDice.filter(d =>
            d === this.currentBid.face || (this.options.wildsEnabled && d === 1)
        ).length;

        const loserId = count >= this.currentBid.count ? challengerId : (this.lastBidderId as string);
        const challenger = this.players.find(p => p.id === challengerId);
        const bidder = this.players.find(p => p.id === this.lastBidderId);
        const loser = this.players.find(p => p.id === loserId);

        // Log the challenge with full details
        this.gameLog.push({
            timestamp: new Date().toISOString(),
            round: this.currentRoundNumber,
            event: 'CHALLENGE',
            challengerId: challengerId,
            challengerName: challenger?.name || 'Unknown',
            bidderId: this.lastBidderId,
            bidderName: bidder?.name || 'Unknown',
            bid: { ...this.currentBid },
            actualCount: count,
            loserId: loserId,
            loserName: loser?.name || 'Unknown',
            allDice: this.currentRoundSnapshot.map(p => ({
                playerId: p.id,
                playerName: p.name,
                dice: p.dice
            }))
        });

        const shieldUsed = this.resolveRound(loserId);
        return { loserId, count, actualCount: count, shieldUsed };
    }

    resolveRound(loserId: string): boolean {
        const loser = this.players.find(p => p.id === loserId);
        if (!loser) return false;

        // Shield: absorb this hit
        if (loser.cheat === CHEATS.SHIELD && !loser.cheatUsed) {
            loser.cheatUsed = true;

            // Log shield use
            this.gameLog.push({
                timestamp: new Date().toISOString(),
                round: this.currentRoundNumber,
                event: 'SHIELD_USED',
                playerId: loserId,
                playerName: loser.name
            });

            const activePlayers = this.players.filter(p => p.active && p.connected);
            this.gameState = activePlayers.length <= 1 ? GAME_STATES.GAME_OVER : GAME_STATES.ROUND_END;
            return true; // shieldUsed
        }

        loser.diceCount--;

        // Log dice loss
        this.gameLog.push({
            timestamp: new Date().toISOString(),
            round: this.currentRoundNumber,
            event: 'DICE_LOST',
            playerId: loserId,
            playerName: loser.name,
            remainingDice: loser.diceCount
        });

        if (loser.diceCount <= this.options.eliminationThreshold) {
            loser.active = false;

            // Log elimination
            this.gameLog.push({
                timestamp: new Date().toISOString(),
                round: this.currentRoundNumber,
                event: 'PLAYER_ELIMINATED',
                playerId: loserId,
                playerName: loser.name
            });
        }

        const activePlayers = this.players.filter(p => p.active && p.connected);

        if (activePlayers.length <= 1) {
            this.gameState = GAME_STATES.GAME_OVER;

            // Log game end
            const winner = activePlayers[0];
            this.gameLog.push({
                timestamp: new Date().toISOString(),
                round: this.currentRoundNumber,
                event: 'GAME_END',
                winnerId: winner?.id,
                winnerName: winner?.name || 'None',
                totalRounds: this.currentRoundNumber
            });
        } else {
            this.gameState = GAME_STATES.ROUND_END;
        }

        return false;
    }
}

export default new GameEngine();
