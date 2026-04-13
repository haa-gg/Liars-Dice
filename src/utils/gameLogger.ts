import { GameLogEntry, GameOptions } from '../types';

/**
 * Format game log as human-readable text
 * @param {GameLogEntry[]} gameLog - Array of game events
 * @param {Partial<GameOptions>} gameOptions - Game configuration
 * @returns {string} - Formatted text log
 */
export const formatGameLogAsText = (gameLog: GameLogEntry[], gameOptions: Partial<GameOptions> = {}): string => {
    if (!gameLog || gameLog.length === 0) {
        return 'No game data available.';
    }

    let output: string[] = [];
    output.push('='.repeat(60));
    output.push('LIAR\'S DICE - GAME LOG');
    output.push('='.repeat(60));
    output.push('');

    // Game settings
    output.push('GAME SETTINGS:');
    output.push(`  Starting Dice: ${gameOptions.startingDice || 5}`);
    output.push(`  Wilds Enabled: ${gameOptions.wildsEnabled ? 'Yes' : 'No'}`);
    output.push(`  Elimination Threshold: ${gameOptions.eliminationThreshold || 0}`);
    output.push(`  Honor System Cheats: ${gameOptions.honorSystemCheats ? 'Yes' : 'No'}`);
    output.push('');

    // Game start time
    const startEvent = gameLog.find(e => e.event === 'ROUND_START');
    if (startEvent) {
        output.push(`Game Started: ${new Date(startEvent.timestamp).toLocaleString()}`);
        output.push('');
    }

    output.push('-'.repeat(60));
    output.push('');

    // Process events by round
    let currentRound = 0;

    gameLog.forEach(event => {
        // New round header
        if (event.event === 'ROUND_START' && event.round !== currentRound) {
            currentRound = event.round;
            output.push('');
            output.push(`ROUND ${currentRound}`);
            output.push('-'.repeat(60));

            // Show active players
            const activePlayers = (event.players as any[]).filter(p => p.active);
            output.push(`Active Players: ${activePlayers.length}`);
            activePlayers.forEach(p => {
                output.push(`  - ${p.name}: ${p.diceCount} dice`);
            });
            output.push('');
        }

        // Bid events
        if (event.event === 'BID') {
            const time = new Date(event.timestamp).toLocaleTimeString();
            output.push(`[${time}] ${event.playerName} bids: ${event.bid.count}×${event.bid.face}`);
        }

        // Challenge events
        if (event.event === 'CHALLENGE') {
            const time = new Date(event.timestamp).toLocaleTimeString();
            output.push('');
            output.push(`[${time}] ${event.challengerName} calls LIAR!`);
            output.push(`  Bid was: ${event.bid.count}×${event.bid.face}`);
            output.push(`  Actual count: ${event.actualCount}`);
            output.push('');
            output.push('  All Dice:');
            (event.allDice as any[]).forEach(p => {
                const diceStr = (p.dice as number[]).map(d => `[${d}]`).join(' ');
                output.push(`    ${p.playerName}: ${diceStr}`);
            });
            output.push('');
            output.push(`  Result: ${event.loserName} loses a die`);
        }

        // Shield use
        if (event.event === 'SHIELD_USED') {
            const time = new Date(event.timestamp).toLocaleTimeString();
            output.push(`[${time}] ${event.playerName} used SHIELD - no die lost!`);
        }

        // Cheat usage
        if (event.event === 'CHEAT_USED') {
            const time = new Date(event.timestamp).toLocaleTimeString();
            output.push(`[${time}] ${event.playerName} used ${event.cheatType}: ${event.details}`);
        }

        // Skill checks
        if (event.event === 'SKILL_CHECK') {
            const time = new Date(event.timestamp).toLocaleTimeString();
            output.push(`[${time}] ${event.playerName} rolled a skill check: ${event.roll}`);
            output.push(`  Sleight: ${event.totalSleight} (Bonus: ${event.sleightBonus})`);
            output.push(`  Deception: ${event.totalDeception} (Bonus: ${event.deceptionBonus})`);
        }

        // Dice lost
        if (event.event === 'DICE_LOST') {
            const time = new Date(event.timestamp).toLocaleTimeString();
            output.push(`[${time}] ${event.playerName} now has ${event.remainingDice} dice`);
        }

        // Elimination
        if (event.event === 'PLAYER_ELIMINATED') {
            const time = new Date(event.timestamp).toLocaleTimeString();
            output.push(`[${time}] ${event.playerName} has been ELIMINATED!`);
        }

        // Player disconnection
        if (event.event === 'PLAYER_DISCONNECTED') {
            const time = new Date(event.timestamp).toLocaleTimeString();
            output.push(`[${time}] ${event.playerName} lost connection!`);
        }

        // Player reconnection
        if (event.event === 'PLAYER_RECONNECTED') {
            const time = new Date(event.timestamp).toLocaleTimeString();
            output.push(`[${time}] ${event.playerName} reconnected to the table.`);
        }

        // Game end
        if (event.event === 'GAME_END') {
            output.push('');
            output.push('='.repeat(60));
            output.push('GAME OVER');
            output.push('='.repeat(60));
            output.push(`Winner: ${event.winnerName}`);
            output.push(`Total Rounds: ${event.totalRounds}`);
            const endTime = new Date(event.timestamp).toLocaleString();
            output.push(`Ended: ${endTime}`);
        }
    });

    output.push('');
    output.push('='.repeat(60));
    output.push(`Log generated: ${new Date().toLocaleString()}`);
    output.push('='.repeat(60));

    return output.join('\n');
};

/**
 * Format game log as JSON for database storage
 * @param {GameLogEntry[]} gameLog - Array of game events
 * @param {Partial<GameOptions>} gameOptions - Game configuration
 * @param {string | null} roomId - Room/game ID
 * @returns {string} - JSON string
 */
export const formatGameLogAsJSON = (gameLog: GameLogEntry[], gameOptions: Partial<GameOptions> = {}, roomId: string | null = null): string => {
    const gameData = {
        gameId: roomId,
        startTime: gameLog.find(e => e.event === 'ROUND_START')?.timestamp || null,
        endTime: gameLog.find(e => e.event === 'GAME_END')?.timestamp || null,
        settings: gameOptions,
        events: gameLog,
        summary: {
            totalRounds: gameLog.filter(e => e.event === 'ROUND_START').length,
            totalBids: gameLog.filter(e => e.event === 'BID').length,
            totalChallenges: gameLog.filter(e => e.event === 'CHALLENGE').length,
            winner: gameLog.find(e => e.event === 'GAME_END')?.winnerName || null
        }
    };

    return JSON.stringify(gameData, null, 2);
};

/**
 * Download game log as a file
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 */
export const downloadGameLog = (content: string, filename: string, mimeType: string = 'text/plain'): void => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
