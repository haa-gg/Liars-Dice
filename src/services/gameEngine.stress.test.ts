import { beforeEach, describe, expect, it } from 'vitest';
import engine, { GAME_STATES } from './gameEngine';
import { buildRandomEngineState } from './gameEngine.randomState';
import { Player } from '../types';

beforeEach(() => {
    engine.reset();
});

function clonePlayers(players: Player[]): Player[] {
    return players.map((player) => ({
        ...player,
        dice: [...player.dice]
    }));
}

describe('random state generator', () => {
    it('creates deterministic state from seed', () => {
        const stateA = buildRandomEngineState(1234);
        const stateB = buildRandomEngineState(1234);
        expect(stateA).toEqual(stateB);
    });
});

describe('engine randomized stress', () => {
    it('resolves challenge invariants across many random seeds', () => {
        for (let seed = 1; seed <= 300; seed++) {
            const state = buildRandomEngineState(seed);

            engine.reset();
            engine.options = { ...state.options };
            engine.players = clonePlayers(state.players);
            engine.currentTurnIndex = state.currentTurnIndex;
            engine.currentBid = { ...state.currentBid };
            engine.lastBidderId = state.lastBidderId;
            engine.gameState = GAME_STATES.BIDDING;
            engine.currentRoundNumber = 1;

            const challenger = engine.players.find(
                (player) => player.active && player.connected && player.id !== engine.lastBidderId
            );

            if (!challenger || !engine.lastBidderId) {
                continue;
            }

            const result = engine.challenge(challenger.id);
            const loser = engine.players.find((player) => player.id === result.loserId);
            const activeConnectedPlayers = engine.players.filter((player) => player.active && player.connected);

            expect(loser).toBeDefined();
            expect(engine.currentRoundSnapshot).not.toBeNull();
            expect(result.actualCount).toBeGreaterThanOrEqual(0);
            expect([GAME_STATES.ROUND_END, GAME_STATES.GAME_OVER]).toContain(engine.gameState);
            expect(engine.players.every((player) => player.diceCount >= 0)).toBe(true);

            if (engine.gameState === GAME_STATES.GAME_OVER) {
                expect(activeConnectedPlayers.length).toBeLessThanOrEqual(1);
            } else {
                expect(activeConnectedPlayers.length).toBeGreaterThan(1);
            }
        }
    });
});
