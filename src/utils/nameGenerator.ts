import nameData from '../data/randomNames.json';

/**
 * Generate a random pirate name
 * @returns {string} - Random pirate name
 */
export const generateRandomName = (): string => {
    const { prefixes, names } = nameData as { prefixes: string[], names: string[] };

    // Randomly decide format:
    // 70% chance: Prefix + Name (e.g., "Captain Blackbeard")
    // 30% chance: Just Name (e.g., "Blackbeard")

    const random = Math.random();
    const randomName = names[Math.floor(Math.random() * names.length)];

    if (random < 0.7) {
        // Prefix + Name
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        return `${randomPrefix} ${randomName}`;
    } else {
        // Just Name
        return randomName;
    }
};
