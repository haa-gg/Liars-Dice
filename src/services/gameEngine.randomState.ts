import { Bid, GameOptions, Player } from '../types';

export interface RandomEngineState {
    options: GameOptions;
    players: Player[];
    currentTurnIndex: number;
    currentBid: Bid;
    lastBidderId: string | null;
}

type Rng = () => number;

function createSeededRng(seed: number): Rng {
    let state = seed >>> 0;
    return () => {
        state = (1664525 * state + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function randomInt(rng: Rng, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
}

function randomBool(rng: Rng, probability = 0.5): boolean {
    return rng() < probability;
}

function randomDie(rng: Rng): number {
    return randomInt(rng, 1, 6);
}

function pickCheat(rng: Rng): Player['cheat'] {
    const cheats: Array<Player['cheat']> = [null, 'peek', 'shield', 'loaded_die', 'slip', 'magic_dice'];
    return cheats[randomInt(rng, 0, cheats.length - 1)];
}

export function buildRandomEngineState(seed: number): RandomEngineState {
    const rng = createSeededRng(seed);
    const playerCount = randomInt(rng, 2, 6);
    const startingDice = randomInt(rng, 3, 6);
    const eliminationThreshold = randomInt(rng, 0, 1);
    const hostBonusDice = randomInt(rng, 0, 2);

    const options: GameOptions = {
        startingDice,
        eliminationThreshold,
        wildsEnabled: randomBool(rng),
        honorSystemCheats: randomBool(rng, 0.25),
        hostBonusDice
    };

    const players: Player[] = [];

    for (let i = 0; i < playerCount; i++) {
        const id = `p${i + 1}`;
        const connected = randomBool(rng, 0.9);
        const active = randomBool(rng, 0.85);
        const baseDice = i === 0 ? startingDice + hostBonusDice : startingDice;
        const minDice = eliminationThreshold + 1;
        const diceCount = active ? randomInt(rng, minDice, Math.max(minDice, baseDice)) : 0;

        players.push({
            id,
            name: `Player ${i + 1}`,
            connected,
            active,
            isSpectator: !active,
            permanentSpectator: false,
            cheat: pickCheat(rng),
            cheatUsed: randomBool(rng, 0.2),
            diceCount,
            dice: active ? Array.from({ length: diceCount }, () => randomDie(rng)) : []
        });
    }

    let activeConnectedIndices = players
        .map((p, index) => ({ p, index }))
        .filter(({ p }) => p.active && p.connected && p.dice.length > 0)
        .map(({ index }) => index);

    if (activeConnectedIndices.length < 2) {
        players[0].active = true;
        players[0].connected = true;
        players[0].isSpectator = false;
        if (players[0].diceCount <= eliminationThreshold) {
            players[0].diceCount = eliminationThreshold + 1;
        }
        players[0].dice = Array.from({ length: players[0].diceCount }, () => randomDie(rng));

        players[1].active = true;
        players[1].connected = true;
        players[1].isSpectator = false;
        if (players[1].diceCount <= eliminationThreshold) {
            players[1].diceCount = eliminationThreshold + 1;
        }
        players[1].dice = Array.from({ length: players[1].diceCount }, () => randomDie(rng));

        activeConnectedIndices = [0, 1];
    }

    const bidderIndex = activeConnectedIndices[randomInt(rng, 0, activeConnectedIndices.length - 1)];
    const bidder = players[bidderIndex];
    const currentBid: Bid = { count: randomInt(rng, 1, 3), face: randomInt(rng, 1, 6) };

    return {
        options,
        players,
        currentTurnIndex: bidderIndex,
        currentBid,
        lastBidderId: bidder.id
    };
}
