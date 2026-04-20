import { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Bid, ChallengeResult } from '../types';

export const useTutorialGame = (onLeaveTutorial: () => void) => {
    const peerId = 'ME_ID';
    const [gameState, setGameState] = useState<GameState>('LOBBY');
    const [players] = useState<Player[]>([
        { id: peerId, name: 'You (Captain)', active: true, diceCount: 5, connected: true, dice: [], cheat: null, cheatUsed: false },
        { id: 'BOT_1', name: 'Botbeard', active: true, diceCount: 5, connected: true, dice: [], cheat: null, cheatUsed: false },
        { id: 'BOT_2', name: 'Marauder Roboto', active: true, diceCount: 5, connected: true, dice: [], cheat: null, cheatUsed: false },
    ]);
    const [currentTurn, setCurrentTurn] = useState<string | null>(null);
    const [currentBid, setCurrentBid] = useState<Bid>({ count: 0, face: 2 });
    const [myDice] = useState<number[]>([3, 3, 4, 5, 2]);
    const [tutorialStep, setTutorialStep] = useState<number>(0);
    const [challengeResult, setChallengeResult] = useState<ChallengeResult | null>(null);

    const resetTutorial = useCallback(() => {
        setGameState('LOBBY');
        setTutorialStep(0);
        setCurrentTurn(null);
        setCurrentBid({ count: 0, face: 2 });
        setChallengeResult(null);
    }, []);

    // Mock functions
    const startRound = () => {
        setGameState('BIDDING');
        setCurrentTurn('BOT_1');
        setTutorialStep(1); // Botbeard's turn
    };

    const placeBid = (count: number, face: number) => {
        setCurrentBid({ count, face });
        setCurrentTurn('BOT_2');
        setTutorialStep(3); // Scallywag's turn to challenge
    };

    const voteNextRound = () => {
        if (tutorialStep === 0) {
            startRound();
        } else {
            resetTutorial();
            onLeaveTutorial();
        }
    };

    // Bot logic
    useEffect(() => {
        if (tutorialStep === 1) {
            // Bot 1 bids after 2 seconds
            const timer = setTimeout(() => {
                setCurrentBid({ count: 1, face: 2 });
                setCurrentTurn(peerId);
                setTutorialStep(2); // My turn
            }, 2500);
            return () => clearTimeout(timer);
        } else if (tutorialStep === 3) {
            // Bot 2 challenges after 6 seconds
            const timer = setTimeout(() => {
                setGameState('REVEALING');
                setChallengeResult({
                    loserId: 'BOT_2',
                    count: 2,
                    actualCount: 4,
                    shieldUsed: false,
                });
                setTutorialStep(4); // Reveal phase
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [tutorialStep, peerId]);

    // Stub other necessary exports
    return {
        gameState, players, currentTurn, currentBid, myDice,
        isHost: true, error: null, peerId, connections: [],
        challengeResult, gameOptions: { startingDice: 5, eliminationThreshold: 0, wildsEnabled: true, honorSystemCheats: false },
        myCheat: null as any, myCheatUsed: false,
        peekInfo: null, peekTargetId: null, loadedDieActive: false, rerolledDieIndex: null, gameLog: [], nextRoundVotes: new Set<string>(),
        spectatingId: null, spectatingDice: [], spectatingName: null,
        isReconnecting: false, reconnect: () => { }, reconnectAsHost: () => { },
        setGameOptions: () => { }, assignCheat: () => { },
        startRoom: () => { }, joinRoom: () => { }, rejoinRoom: () => { }, startRound, placeBid, challenge: () => { },
        usePeek: () => { }, activateLoadedDie: () => { }, rerollDie: () => { }, dismissPeek: () => { }, useSlip: () => { }, useMagicDice: () => { }, selectCheat: () => { },
        downloadTextLog: () => { }, downloadJSONLog: () => { }, voteNextRound, kickPlayer: () => { },
        setPeekTargetId: () => { }, setSpectateTarget: () => { }, leaveRoom: () => { },

        // Extracted variables for overlay & control:
        tutorialStep, resetTutorial
    };
};
