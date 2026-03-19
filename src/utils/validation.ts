import { PeerMessage, CheatType } from '../types';

/**
 * Sanitize player name to prevent XSS and UI issues
 * @param {string} name - Raw player name input
 * @returns {string} - Sanitized name (max 64 chars, no HTML)
 */
export const sanitizeName = (name: string): string => {
    if (typeof name !== 'string') return 'Anonymous';

    return name
        .trim()
        .slice(0, 64)  // Max 64 characters
        .replace(/[<>]/g, '')  // Remove angle brackets to prevent HTML injection
        .replace(/[\x00-\x1F\x7F]/g, '');  // Remove control characters
};

/**
 * Validate incoming peer messages
 * @param {any} msg - Message object from peer
 * @returns {boolean} - Whether message is valid
 */
export const validateMessage = (msg: any): msg is PeerMessage => {
    if (!msg || typeof msg !== 'object') return false;
    if (!msg.type || typeof msg.type !== 'string') return false;
    if (!msg.data || typeof msg.data !== 'object') return false;

    // Validate specific message types
    switch (msg.type) {
        case 'JOIN':
            return typeof msg.data.name === 'string' && msg.data.name.length <= 64;

        case 'PLACE_BID':
            return (
                typeof msg.data.count === 'number' &&
                typeof msg.data.face === 'number' &&
                msg.data.count > 0 &&
                msg.data.count <= 100 &&  // Reasonable max bid
                msg.data.face >= 1 &&
                msg.data.face <= 6
            );

        case 'CHALLENGE':
            return true;  // No data validation needed

        case 'USE_PEEK':
        case 'USE_SLIP':
        case 'USE_MAGIC_DICE':
        case 'VOTE_NEXT_ROUND':
        case 'KICKED':
            return true;  // No data validation needed

        case 'REROLL_DIE':
            return (
                typeof msg.data.index === 'number' &&
                msg.data.index >= 0 &&
                msg.data.index < 10  // Max reasonable dice count
            );

        case 'SELECT_CHEAT':
            return (
                typeof msg.data.cheat === 'string' &&
                ['peek', 'shield', 'loaded_die', 'slip', 'magic_dice'].includes(msg.data.cheat as CheatType)
            );

        case 'STATE_SYNC':
            // Basic validation for state sync from host
            return (
                msg.data.gameState &&
                Array.isArray(msg.data.players)
            );

        default:
            return false;  // Unknown message type
    }
};

/**
 * Sanitize room ID to prevent injection
 * @param {string} roomId - Raw room ID input
 * @returns {string} - Sanitized room ID
 */
export const sanitizeRoomId = (roomId: string): string => {
    if (typeof roomId !== 'string') return '';

    return roomId
        .trim()
        .toUpperCase()
        .slice(0, 100)  // Reasonable max length for peer IDs
        .replace(/[<>'"]/g, '');  // Remove potentially dangerous characters
};
