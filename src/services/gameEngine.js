export const GAME_STATES = {
    LOBBY: 'LOBBY',
    ROLLING: 'ROLLING',
    BIDDING: 'BIDDING',
    REVEALING: 'REVEALING',
    ROUND_END: 'ROUND_END',
    GAME_OVER: 'GAME_OVER'
};

export const CHEATS = {
    PEEK: 'peek',
    SHIELD: 'shield',
    LOADED_DIE: 'loaded_die',
    SLIP: 'slip',
    MAGIC_DICE: 'magic_dice',
};

export const CHEAT_LABELS = {
    peek: 'Peek',
    shield: 'Shield',
    loaded_die: 'Loaded Die',
    slip: 'Slip',
    magic_dice: 'Magic Dice',
};

const DEFAULT_OPTIONS = { startingDice: 5, eliminationThreshold: 0, wildsEnabled: true, honorSystemCheats: false };

class GameEngine {
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
    }

    setOptions(opts) {
        this.options = { ...this.options, ...opts };
    }

    addPlayer(id, name) {
        // Check if player already exists
        if (this.players.some(p => p.id === id)) {
            console.warn(`Player with id ${id} already exists`);
            return false;
        }
        
        if (this.players.length < 10) {
            let uniqueName = name;
            let counter = 2;
            while (this.players.some(p => p.name === uniqueName)) {
                uniqueName = `${name} (${counter})`;
                counter++;
            }

            this.players.push({
                id, name: uniqueName, dice: [], active: true,
                diceCount: this.options.startingDice,
                cheat: null, cheatUsed: false
            });
            return true;
        }
        return false;
    }

    assignCheat(playerId, cheat) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.cheat = cheat || null;
            player.cheatUsed = false;
        }
    }

    removePlayer(id) {
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
        
        // If current turn index is now out of bounds or pointing to inactive player
        if (this.currentTurnIndex >= this.players.length) {
            this.currentTurnIndex = 0;
        }
        
        // Make sure we're pointing to an active player
        const activePlayers = this.players.filter(p => p.active);
        if (activePlayers.length > 0 && !this.players[this.currentTurnIndex]?.active) {
            // Find next active player
            let attempts = 0;
            while (!this.players[this.currentTurnIndex]?.active && attempts < this.players.length) {
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
            // Reset all players for new game
            this.players.forEach(p => {
                p.active = true;
                p.diceCount = this.options.startingDice;
                p.dice = [];
                p.cheat = this.options.honorSystemCheats ? null : p.cheat; // Keep assigned cheats unless honor system
                p.cheatUsed = false;
            });
            this.currentRoundNumber = 0; // Reset round counter for new game
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
            if (p.active) {
                p.dice = Array.from({ length: p.diceCount }, () => Math.floor(Math.random() * 6) + 1);
            }
        });
        this.currentBid = { count: 0, face: 0 };
        
        // Ensure currentTurnIndex points to an active player
        if (!this.players[this.currentTurnIndex]?.active) {
            // Find the next active player
            const activePlayers = this.players.filter(p => p.active);
            if (activePlayers.length > 0) {
                // Start from current index and find next active player
                let attempts = 0;
                while (!this.players[this.currentTurnIndex]?.active && attempts < this.players.length) {
                    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
                    attempts++;
                }
            }
        }
        
        this.gameState = GAME_STATES.BIDDING;
    }

    // Slip: secretly add 1 extra die to hand mid-round
    useSlip(playerId) {
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
    useMagicDice(playerId) {
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
    rerollDie(playerId, index) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || index < 0 || index >= player.dice.length) return null;
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

    // Peek: reveal one random die from an opponent
    peekResult(peekingPlayerId) {
        const player = this.players.find(p => p.id === peekingPlayerId);
        const others = this.players.filter(p => p.id !== peekingPlayerId && p.active && p.dice.length > 0);
        if (others.length === 0) return null;
        const rp = others[Math.floor(Math.random() * others.length)];
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

    placeBid(playerId, count, face) {
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
        const activePlayers = this.players.filter(p => p.active);
        if (activePlayers.length === 0) {
            console.error('No active players for next turn');
            return;
        }
        
        do {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
        } while (!this.players[this.currentTurnIndex].active);
    }

    challenge(challengerId) {
        this.gameState = GAME_STATES.REVEALING;
        
        // Capture snapshot of all dice before resolving (only active players)
        this.currentRoundSnapshot = this.players
            .filter(p => p.active)
            .map(p => ({
                id: p.id,
                name: p.name,
                dice: [...p.dice],
                active: p.active
            }));
        
        const allDice = this.players.flatMap(p => p.dice);
        const count = allDice.filter(d =>
            d === this.currentBid.face || (this.options.wildsEnabled && d === 1)
        ).length;

        const loserId = count >= this.currentBid.count ? challengerId : this.lastBidderId;
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

    resolveRound(loserId) {
        const loser = this.players.find(p => p.id === loserId);

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
            
            const activePlayers = this.players.filter(p => p.active);
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

        const activePlayers = this.players.filter(p => p.active);
        
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
