import { describe, expect, it } from 'vitest';
import { validateMessage } from './validation';

describe('validateMessage', () => {
    it('accepts valid ROLL_SKILL_CHECK payloads', () => {
        const valid = validateMessage({
            type: 'ROLL_SKILL_CHECK',
            data: {
                roll: 17,
                sleightBonus: 3,
                deceptionBonus: 2,
            },
        });

        expect(valid).toBe(true);
    });

    it('rejects out-of-range or malformed ROLL_SKILL_CHECK payloads', () => {
        const outOfRange = validateMessage({
            type: 'ROLL_SKILL_CHECK',
            data: {
                roll: 21,
                sleightBonus: 3,
                deceptionBonus: 2,
            },
        });

        const malformed = validateMessage({
            type: 'ROLL_SKILL_CHECK',
            data: {
                roll: 10,
                sleightBonus: '3',
                deceptionBonus: 2,
            },
        });

        expect(outOfRange).toBe(false);
        expect(malformed).toBe(false);
    });
});
