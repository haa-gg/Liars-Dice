export type GameState = 'LOBBY' | 'ROLLING' | 'BIDDING' | 'REVEALING' | 'ROUND_END' | 'GAME_OVER';

export type CheatType = 'peek' | 'shield' | 'loaded_die' | 'slip' | 'magic_dice';

export interface Player {
    id: string;
    name: string;
    dice: number[];
    active: boolean;
    connected: boolean;
    diceCount: number;
    cheat: CheatType | null;
    cheatUsed: boolean;
    isSpectator?: boolean;
    permanentSpectator?: boolean;
}

export interface Bid {
    count: number;
    face: number;
}

export interface ChallengeResult {
    loserId: string;
    count: number;
    actualCount: number;
    shieldUsed: boolean;
}

export interface GameOptions {
    startingDice: number;
    eliminationThreshold: number;
    wildsEnabled: boolean;
    honorSystemCheats: boolean;
    hostBonusDice: number;
}

export interface GameLogEntry {
    timestamp: string;
    round: number;
    event: string;
    [key: string]: any;
}

// ── Typed peer messages ────────────────────────────────────────────────────────

/** Payload carried on every STATE_SYNC message from host → clients. */
export interface StateSyncPayload {
    gameState: GameState;
    players: Player[];
    currentTurnIndex: number;
    currentBid: Bid;
    gameOptions: GameOptions;
    gameLog: GameLogEntry[];
    // Optional personal / per-client fields
    myDice?: number[];
    challengeResult?: ChallengeResult | null;
    peekInfo?: { playerName: string; dieValue: number } | null;
    loadedDieHandled?: boolean;
    nextRoundVotes?: string[];
    roundReset?: boolean;
    spectatingDice?: number[];
    spectatingName?: string;
}

/** Messages sent from a client → host. */
export type ClientMessage =
    | { type: 'JOIN'; data: { name: string; asSpectator: boolean } }
    | { type: 'PLACE_BID'; data: { count: number; face: number } }
    | { type: 'CHALLENGE'; data: Record<string, never> }
    | { type: 'USE_PEEK'; data: { targetPlayerId: string } }
    | { type: 'USE_SLIP'; data: Record<string, never> }
    | { type: 'USE_MAGIC_DICE'; data: Record<string, never> }
    | { type: 'REROLL_DIE'; data: { index: number } }
    | { type: 'ROLL_SKILL_CHECK'; data: { roll: number; sleightBonus: number; deceptionBonus: number } }
    | { type: 'SELECT_CHEAT'; data: { cheat: CheatType } }
    | { type: 'VOTE_NEXT_ROUND'; data: Record<string, never> }
    | { type: 'SPECTATE'; data: { targetId: string } }
    | { type: 'LEAVE'; data: Record<string, never> }
    | { type: 'PING'; data: Record<string, never> };

/** Messages sent from host → clients. */
export type HostMessage =
    | { type: 'STATE_SYNC'; data: StateSyncPayload }
    | { type: 'KICKED'; data: Record<string, never> }
    | { type: 'PONG'; data: Record<string, never> };

/** Union of all peer messages (convenience alias). */
export type PeerMessage = ClientMessage | HostMessage;
