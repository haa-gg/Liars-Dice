import { Bid, Player } from '../types';

export function getBotAction(engine: any): { type: 'BID', count: number, face: number } | { type: 'CHALLENGE' } {
    const botId = engine.players[engine.currentTurnIndex].id;
    const bot = engine.players.find((p: Player) => p.id === botId);
    
    // Count total active dice
    const totalDice = engine.players.reduce((sum: number, p: Player) => p.active ? sum + p.diceCount : sum, 0);
    
    const currentBid = engine.currentBid as Bid;
    
    // If it's the very first bid of the round
    if (currentBid.count === 0) {
        // Just bid 1 or 2 of whatever we have most of (excluding 1s if possible)
        const counts = [0,0,0,0,0,0,0]; // 1-6
        bot.dice.forEach((d: number) => counts[d]++);
        let bestFace = 2;
        let maxCount = 0;
        for (let i = 2; i <= 6; i++) {
            if (counts[i] > maxCount) {
                maxCount = counts[i];
                bestFace = i;
            }
        }
        return { type: 'BID', count: Math.max(1, maxCount), face: bestFace };
    }
    
    // We need to evaluate the current bid
    // A LOUSY bot assumes exactly 1/6 of unknown dice are the bid face (ignoring wilds properly!)
    const unknownDice = totalDice - bot.diceCount;
    // We floor it so the bot chronically underestimates the table.
    const expectedUnknowns = Math.floor(unknownDice / 6); 
    
    const ourMatchingDice = bot.dice.filter((d: number) => d === currentBid.face || (engine.options.wildsEnabled && d === 1)).length;
    
    // The lousy bot also adds a random panic factor.
    // It might arbitrarily think the table has 1 more or 0 more than expected.
    const panicThreshold = expectedUnknowns + ourMatchingDice + (Math.random() > 0.5 ? 1 : 0);
    
    // If the bid count > what we loosely expect, CHALLENGE!
    // Or if the bid count is insanely high compared to total dice
    if (currentBid.count > panicThreshold || currentBid.count >= totalDice - 1) {
        return { type: 'CHALLENGE' };
    }
    
    // Otherwise, we raise. 
    // Lousy raise: Just increase the count by 1 and keep the same face, or switch to a higher face if we have it.
    const counts = [0,0,0,0,0,0,0];
    bot.dice.forEach((d: number) => counts[d]++);
    let bestFace = currentBid.face;
    let maxCount = counts[currentBid.face] + (engine.options.wildsEnabled ? counts[1] : 0);
    
    for (let i = 2; i <= 6; i++) {
        const faceTotal = counts[i] + (engine.options.wildsEnabled ? counts[1] : 0);
        // Frequently changes face just because it feels like it (70% chance to switch if face > current)
        if (i > currentBid.face && (faceTotal > maxCount || Math.random() > 0.7)) {
            bestFace = i;
            maxCount = faceTotal;
        }
    }
    
    if (bestFace > currentBid.face) {
        return { type: 'BID', count: currentBid.count, face: bestFace };
    } else {
        // Cap the max bid physically possible just in case
        if (currentBid.count >= totalDice) return { type: 'CHALLENGE' };
        return { type: 'BID', count: currentBid.count + 1, face: currentBid.face };
    }
}
