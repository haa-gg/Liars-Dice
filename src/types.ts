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
}

export interface Bid {
    count: number;
    face: number;
}

export interface ChallengeResult {
    loserId: string;
    count: number; // actual count of the bid face
    actualCount: number; // same as count, used for clarity
    shieldUsed: boolean;
}

export interface GameOptions {
    startingDice: number;
    eliminationThreshold: number;
    wildsEnabled: boolean;
    honorSystemCheats: boolean;
}

export interface GameLogEntry {
    timestamp: string;
    round: number;
    event: string;
    [key: string]: any;
}

export interface PeerMessage {
    type: string;
    data: any;
}
