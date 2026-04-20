import { describe, it, expect, beforeEach } from 'vitest';
import engine from './gameEngine';
import { GAME_STATES } from './gameEngine';

// The engine is a singleton — reset before every test for a clean slate.
beforeEach(() => {
    engine.reset();
});

// ─── addPlayer ────────────────────────────────────────────────────────────────

describe('addPlayer', () => {
    it('adds a new player in LOBBY', () => {
        const ok = engine.addPlayer('p1', 'Alice');
        expect(ok).toBe(true);
        expect(engine.players).toHaveLength(1);
        expect(engine.players[0]).toMatchObject({
            id: 'p1', name: 'Alice', active: true, connected: true,
            isSpectator: false, permanentSpectator: false,
        });
    });

    it('reconnects an existing player by peer id', () => {
        engine.addPlayer('p1', 'Alice');
        engine.markPlayerDisconnected('p1');
        expect(engine.players[0].connected).toBe(false);

        const ok = engine.addPlayer('p1', 'Alice');
        expect(ok).toBe(true);
        expect(engine.players).toHaveLength(1); // no duplicate
        expect(engine.players[0].connected).toBe(true);
    });

    it('reconnects by name when peer id changes', () => {
        engine.addPlayer('p1', 'Alice');
        engine.markPlayerDisconnected('p1');

        const ok = engine.addPlayer('p2-new', 'Alice');
        expect(ok).toBe(true);
        expect(engine.players).toHaveLength(1);
        expect(engine.players[0].id).toBe('p2-new');
        expect(engine.players[0].connected).toBe(true);
    });

    it('joining with a taken name reconnects the existing slot', () => {
        // The engine treats same-name as a reconnect — dedup is a safety net for
        // edge cases where someone has a unique id AND a unique name.
        engine.addPlayer('p1', 'Alice');
        const ok = engine.addPlayer('p2', 'Alice'); // same name → reconnects p1 slot
        expect(ok).toBe(true);
        expect(engine.players).toHaveLength(1);      // no new player added
        expect(engine.players[0].id).toBe('p2');     // id updated to new peer
    });

    it('auto-spectates mid-game joiners', () => {
        engine.addPlayer('p1', 'Alice');
        engine.addPlayer('p2', 'Bob');
        engine.startRound(); // moves to BIDDING

        engine.addPlayer('p3', 'Charlie');
        const charlie = engine.players.find(p => p.id === 'p3')!;
        expect(charlie.active).toBe(false);
        expect(charlie.isSpectator).toBe(true);
        expect(charlie.permanentSpectator).toBe(false);
    });

    it('applies forceSpectator even in LOBBY', () => {
        engine.addPlayer('p1', 'Alice', true);
        expect(engine.players[0]).toMatchObject({
            active: false, isSpectator: true, permanentSpectator: true, diceCount: 0,
        });
    });

    it('returns false when the room is full (10 players)', () => {
        for (let i = 0; i < 10; i++) engine.addPlayer(`p${i}`, `Player${i}`);
        const ok = engine.addPlayer('p10', 'Overflow');
        expect(ok).toBe(false);
    });
});

// ─── startRound ───────────────────────────────────────────────────────────────

describe('startRound', () => {
    it('rolls dice for all active players', () => {
        engine.addPlayer('p1', 'Alice');
        engine.addPlayer('p2', 'Bob');
        engine.startRound();

        engine.players.forEach(p => {
            expect(p.dice).toHaveLength(engine.options.startingDice);
            p.dice.forEach(d => expect(d).toBeGreaterThanOrEqual(1));
            p.dice.forEach(d => expect(d).toBeLessThanOrEqual(6));
        });
    });

    it('activates mid-game spectators on next round', () => {
        engine.addPlayer('p1', 'Alice');
        engine.addPlayer('p2', 'Bob');
        engine.startRound();

        engine.addPlayer('p3', 'Charlie'); // mid-game spectator
        engine.startRound(); // new round (not GAME_OVER → just next round)

        const charlie = engine.players.find(p => p.id === 'p3')!;
        expect(charlie.active).toBe(true);
        expect(charlie.isSpectator).toBe(false);
    });

    it('does NOT activate permanent spectators', () => {
        engine.addPlayer('p1', 'Alice');
        engine.addPlayer('p2', 'Bob');
        engine.startRound();

        engine.addPlayer('p3', 'Watcher', true); // permanent spectator
        engine.startRound();

        const watcher = engine.players.find(p => p.id === 'p3')!;
        expect(watcher.active).toBe(false);
        expect(watcher.permanentSpectator).toBe(true);
    });

    it('resets permanent spectators on new game (GAME_OVER → startRound) — they stay inactive', () => {
        engine.addPlayer('p1', 'Alice');
        engine.addPlayer('p2', 'Bob');
        engine.addPlayer('p3', 'Watcher', true);
        engine.startRound();

        // Force game over
        engine.gameState = GAME_STATES.GAME_OVER;
        engine.startRound();

        const watcher = engine.players.find(p => p.id === 'p3')!;
        expect(watcher.active).toBe(false);
        expect(watcher.permanentSpectator).toBe(true);
    });

    it('increments the round counter', () => {
        engine.addPlayer('p1', 'Alice');
        engine.addPlayer('p2', 'Bob');
        engine.startRound();
        expect(engine.currentRoundNumber).toBe(1);
        engine.startRound();
        expect(engine.currentRoundNumber).toBe(2);
    });
});

// ─── placeBid ─────────────────────────────────────────────────────────────────

describe('placeBid', () => {
    beforeEach(() => {
        engine.addPlayer('p1', 'Alice');
        engine.addPlayer('p2', 'Bob');
        engine.startRound();
    });

    it('accepts a valid bid with higher count', () => {
        const ok = engine.placeBid('p1', 3, 4);
        expect(ok).toBe(true);
        expect(engine.currentBid).toEqual({ count: 3, face: 4 });
    });

    it('accepts same count with higher face', () => {
        engine.placeBid('p1', 2, 3);
        const ok = engine.placeBid('p2', 2, 5);
        expect(ok).toBe(true);
        expect(engine.currentBid).toEqual({ count: 2, face: 5 });
    });

    it('rejects a bid that does not raise', () => {
        engine.placeBid('p1', 3, 4);
        const ok = engine.placeBid('p2', 2, 4);
        expect(ok).toBe(false);
        expect(engine.currentBid).toEqual({ count: 3, face: 4 }); // unchanged
    });

    it('rejects same count same face', () => {
        engine.placeBid('p1', 3, 4);
        const ok = engine.placeBid('p2', 3, 4);
        expect(ok).toBe(false);
    });
});

// ─── challenge ────────────────────────────────────────────────────────────────

describe('challenge', () => {
    beforeEach(() => {
        engine.addPlayer('p1', 'Alice');
        engine.addPlayer('p2', 'Bob');
        engine.startRound();
    });

    it('challenger loses when actual count >= bid count', () => {
        // Force known dice
        engine.players[0].dice = [4, 4, 4];
        engine.players[1].dice = [4, 2, 1]; // 1 is wild — counts as 4 if wilds enabled
        engine.placeBid('p1', 3, 4); // bid: 3× face-4
        // wild: p2 has one 1 → actual count of 4s = 3 + 1 = 4 >= 3 → challenge fails
        const result = engine.challenge('p2');
        expect(result.loserId).toBe('p2'); // challenger loses
    });

    it('bidder loses when actual count < bid count', () => {
        engine.players[0].dice = [3, 3, 3];
        engine.players[1].dice = [2, 2, 2];
        engine.placeBid('p1', 5, 4); // bid: 5× face-4 (none exist)
        const result = engine.challenge('p2');
        expect(result.loserId).toBe('p1'); // bidder loses
    });

    it('counts wild 1s when wildsEnabled', () => {
        engine.options.wildsEnabled = true;
        engine.players[0].dice = [1, 1, 1]; // all wilds
        engine.players[1].dice = [2, 2, 2];
        engine.placeBid('p1', 3, 5); // 3× 5s — wilds count, actual = 3
        const result = engine.challenge('p2');
        expect(result.loserId).toBe('p2'); // bid was valid, challenger loses
    });

    it('does not count wild 1s when wildsEnabled is false', () => {
        engine.options.wildsEnabled = false;
        engine.players[0].dice = [1, 1, 1]; // NOT wilds
        engine.players[1].dice = [2, 2, 2];
        engine.placeBid('p1', 1, 5); // 1× 5 — none exist
        const result = engine.challenge('p2');
        expect(result.loserId).toBe('p1'); // no 5s at all, bidder loses
    });

    it('shield absorbs the hit', () => {
        engine.players[0].dice = [3, 3, 3];
        engine.players[1].dice = [2, 2, 2];
        engine.players[1].cheat = 'shield';
        engine.players[1].cheatUsed = false;
        engine.placeBid('p1', 5, 4); // bidder (p1) loses
        const result = engine.challenge('p2');
        // p1 bid and loses — p1 has no shield, loses a die
        expect(result.loserId).toBe('p1');
        expect(result.shieldUsed).toBe(false);
    });

    it('shield absorbs hit when loser has shield', () => {
        engine.players[0].dice = [3, 3, 3];
        engine.players[1].dice = [2, 2, 2];
        engine.players[0].cheat = 'shield';  // bidder has shield
        engine.players[0].cheatUsed = false;
        engine.placeBid('p1', 5, 4); // p1 bid, p1 loses
        const result = engine.challenge('p2');
        expect(result.loserId).toBe('p1');
        expect(result.shieldUsed).toBe(true);
    });
});

// ─── resolveRound ─────────────────────────────────────────────────────────────

describe('resolveRound', () => {
    beforeEach(() => {
        engine.addPlayer('p1', 'Alice');
        engine.addPlayer('p2', 'Bob');
        engine.startRound();
    });

    it('decrements dice count of the loser', () => {
        const before = engine.players[0].diceCount;
        engine.resolveRound('p1');
        expect(engine.players[0].diceCount).toBe(before - 1);
    });

    it('eliminates a player when diceCount hits eliminationThreshold', () => {
        engine.options.eliminationThreshold = 0;
        engine.players[0].diceCount = 1;
        engine.resolveRound('p1');
        expect(engine.players[0].active).toBe(false);
        expect(engine.gameState).toBe(GAME_STATES.GAME_OVER); // only Bob left
    });

    it('respects custom eliminationThreshold', () => {
        engine.options.eliminationThreshold = 2;
        engine.players[0].diceCount = 3;
        engine.resolveRound('p1');
        // 3 - 1 = 2 === threshold → eliminated
        expect(engine.players[0].active).toBe(false);
    });

    it('transitions to GAME_OVER when one active player remains', () => {
        engine.players[0].diceCount = 1;
        engine.resolveRound('p1');
        expect(engine.gameState).toBe(GAME_STATES.GAME_OVER);
    });

    it('transitions to ROUND_END when multiple active players remain', () => {
        engine.players[0].diceCount = 3; // won't be eliminated
        engine.resolveRound('p1');
        expect(engine.gameState).toBe(GAME_STATES.ROUND_END);
    });
});

// ─── nextTurn ─────────────────────────────────────────────────────────────────

describe('nextTurn', () => {
    it('skips inactive players', () => {
        engine.addPlayer('p1', 'Alice');
        engine.addPlayer('p2', 'Bob'); // will be inactive
        engine.addPlayer('p3', 'Carol');
        engine.startRound();

        engine.players[1].active = false; // eliminate Bob
        engine.currentTurnIndex = 0; // Alice's turn
        engine.nextTurn();
        // Should skip p2 and land on p3
        expect(engine.players[engine.currentTurnIndex].id).toBe('p3');
    });

    it('skips disconnected players', () => {
        engine.addPlayer('p1', 'Alice');
        engine.addPlayer('p2', 'Bob');
        engine.addPlayer('p3', 'Carol');
        engine.startRound();

        engine.players[1].connected = false; // Bob disconnected
        engine.currentTurnIndex = 0;
        engine.nextTurn();
        expect(engine.players[engine.currentTurnIndex].id).toBe('p3');
    });
});

// ─── logSkillCheck ────────────────────────────────────────────────────────────

describe('logSkillCheck', () => {
    beforeEach(() => {
        engine.addPlayer('p1', 'Alice');
        engine.addPlayer('p2', 'Bob');
        engine.startRound();
    });

    it('appends a SKILL_CHECK entry to the game log', () => {
        engine.logSkillCheck('p1', 14, 2, 0);

        const entry = engine.gameLog.find(e => e.event === 'SKILL_CHECK');
        expect(entry).toBeDefined();
        expect(entry?.playerId).toBe('p1');
        expect(entry?.playerName).toBe('Alice');
        expect(entry?.roll).toBe(14);
        expect(entry?.sleightBonus).toBe(2);
        expect(entry?.deceptionBonus).toBe(0);
        expect(entry?.totalSleight).toBe(16);   // 14 + 2
        expect(entry?.totalDeception).toBe(14);  // 14 + 0
    });

    it('logs skill checks from multiple different players', () => {
        engine.logSkillCheck('p1', 10, 1, 0);
        engine.logSkillCheck('p2', 18, 0, 3);

        const checks = engine.gameLog.filter(e => e.event === 'SKILL_CHECK');
        expect(checks).toHaveLength(2);
        expect(checks[0].playerName).toBe('Alice');
        expect(checks[1].playerName).toBe('Bob');
    });

    it('does NOT log if the player ID is unknown', () => {
        const beforeLength = engine.gameLog.length;
        engine.logSkillCheck('ghost-id', 12, 0, 0);
        // Log should not have grown
        expect(engine.gameLog).toHaveLength(beforeLength);
    });

    it('correctly sets round number on the entry', () => {
        engine.logSkillCheck('p1', 8, 0, 0);
        const entry = engine.gameLog.find(e => e.event === 'SKILL_CHECK');
        expect(entry?.round).toBe(engine.currentRoundNumber);
    });
});
