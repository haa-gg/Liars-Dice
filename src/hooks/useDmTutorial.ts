import { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Bid, ChallengeResult, CheatType } from '../types';

/**
 * Mock game hook that drives the DM Honor System Cheats tutorial.
 *
 * State machine (dmTutorialStep):
 *  0  – LOBBY State; prompt user to open settings and enable toggle
 *  1  – LOBBY State; prompt user to close settings and start round
 *  2  – Cheat panel visible; "tap any option"       (user taps a cheat → step 3)
 *  3  – Peek target picker visible                  (user picks a target → step 4)
 *  4  – Peek result modal                           (Continue →)
 *  5  – Slip info; an extra die is dropped in       (Continue →)
 *  6  – Panel reset; explain Loaded Die/Shield/Magic(Continue →)
 *  7  – Tabletop Tips                               (Continue →)
 *  8  – Wrap-up / "End Tutorial"                    (Continue → exit)
 *  9  – (internal sentinel) triggers exit effect
 */
export const useDmTutorial = (onLeaveTutorial: () => void) => {
    const peerId = 'DM_ID';

    // ── Core game state (mostly fixed for this tutorial) ──────────────────────
    const [gameState, setGameState] = useState<GameState>('LOBBY');
    const [currentTurn]  = useState<string | null>(peerId);
    const [currentBid]   = useState<Bid>({ count: 1, face: 3 });

    // Fixed player list – gives the target-picker real names to show
    const players: Player[] = [
        { id: peerId,   name: 'You (DM)',     active: true, diceCount: 5, connected: true, dice: [], cheat: null, cheatUsed: false },
        { id: 'NPC_1',  name: 'Rook Ashveil', active: true, diceCount: 5, connected: true, dice: [], cheat: null, cheatUsed: false },
        { id: 'NPC_2',  name: 'Lady Vesper',  active: true, diceCount: 4, connected: true, dice: [], cheat: null, cheatUsed: false },
    ];

    const [myDice, setMyDice] = useState<number[]>([2, 3, 3, 5, 1]);

    // ── Tutorial-specific state ────────────────────────────────────────────────
    const [dmTutorialStep, setDmTutorialStep] = useState<number>(0);
    const [myCheat,        setMyCheat]        = useState<CheatType | null>(null);
    const [myCheatUsed,    setMyCheatUsed]    = useState<boolean>(false);
    const [peekInfo,       setPeekInfo]       = useState<{ playerName: string; dieValue: number } | null>(null);
    // undefined = not in peek-picker mode, null = show picker (GameBoard convention)
    const [peekTargetId,   setPeekTargetIdState] = useState<string | null | undefined>(undefined);

    const [gameOptions, setGameOptionsState] = useState({
        startingDice: 5,
        eliminationThreshold: 0,
        wildsEnabled: true,
        honorSystemCheats: false,
        hostBonusDice: 0,
    });

    // ── Reset ─────────────────────────────────────────────────────────────────
    const resetDmTutorial = useCallback(() => {
        setGameState('LOBBY');
        setGameOptionsState({
            startingDice: 5,
            eliminationThreshold: 0,
            wildsEnabled: true,
            honorSystemCheats: false,
            hostBonusDice: 0,
        });
        setDmTutorialStep(0);
        setMyCheat(null);
        setMyCheatUsed(false);
        setPeekInfo(null);
        setPeekTargetIdState(undefined);
        setMyDice([2, 3, 3, 5, 1]);
    }, []);

    // ── Side-effects keyed on step ────────────────────────────────────────────

    // Step 0 → Step 1: when the user flips the settings toggle
    useEffect(() => {
        if (dmTutorialStep === 0 && gameOptions.honorSystemCheats) {
            setDmTutorialStep(1);
        }
    }, [dmTutorialStep, gameOptions.honorSystemCheats]);

    // Step 5 → dismiss peek modal; re-show cheat panel so DM can pick Slip
    useEffect(() => {
        if (dmTutorialStep === 5) {
            setPeekInfo(null);
            setMyCheat(null);
            setMyCheatUsed(false);
        }
    }, [dmTutorialStep]);

    // Step 7 → reset cheat so the cheat-selection panel reappears
    useEffect(() => {
        if (dmTutorialStep === 7) {
            setMyCheat(null);
            setMyCheatUsed(false);
            setMyDice([2, 3, 3, 5, 1]);
        }
    }, [dmTutorialStep]);

    // Step 10 (sentinel) → exit
    useEffect(() => {
        if (dmTutorialStep === 10) {
            resetDmTutorial();
            onLeaveTutorial();
        }
    }, [dmTutorialStep, resetDmTutorial, onLeaveTutorial]);

    // ── Manual advance (Continue button) ─────────────────────────────────────
    const advanceDmTutorial = useCallback(() => {
        setDmTutorialStep(prev => {
            if (prev === 0) setGameOptionsState(o => ({ ...o, honorSystemCheats: true }));
            return prev + 1;
        });
    }, []);

    // ── Mocked game actions ───────────────────────────────────────────────────

    const handleSetGameOptions = useCallback((newOpts: Partial<typeof gameOptions>) => {
        setGameOptionsState(prev => ({ ...prev, ...newOpts }));
    }, []);

    const voteNextRound = useCallback(() => {
        if (dmTutorialStep === 1) {
            setGameState('BIDDING');
            setDmTutorialStep(2);
        }
    }, [dmTutorialStep]);

    // Step 2 → 3: only Peek is enabled here; any tap advances through Peek
    // Step 5 → 6: only Slip is enabled; clicking Slip applies it and advances
    const selectCheat = useCallback((_cheatType: CheatType) => {
        if (dmTutorialStep === 2) {
            setMyCheat('peek');
            setPeekTargetIdState(null);
            setDmTutorialStep(3);
        } else if (dmTutorialStep === 5 && _cheatType === 'slip') {
            setMyCheat('slip');
            setMyCheatUsed(true);
            setMyDice(prev => prev.length === 5 ? [...prev, 6] : prev);
            setDmTutorialStep(6);
        }
    }, [dmTutorialStep]);

    // Step 3 → 4: a target is picked; show the peek result
    const usePeek = useCallback((_targetPlayerId: string) => {
        if (dmTutorialStep === 3) {
            setPeekInfo({ playerName: 'Rook Ashveil', dieValue: 4 });
            setMyCheatUsed(true);
            setPeekTargetIdState(undefined);
            setDmTutorialStep(4);
        }
    }, [dmTutorialStep]);

    const dismissPeek = useCallback(() => {
        // Allow manual dismiss; the step-3 timer will still fire and advance step
        setPeekInfo(null);
    }, []);

    // ── Return shape (mirrors UseGameReturn via cast in App.tsx) ──────────────
    return {
        // State
        gameState,
        players,
        currentTurn,
        currentBid,
        myDice,

        // Identity
        isHost: true,
        error: null,
        peerId,

        // Round
        challengeResult: null as ChallengeResult | null,

        // Options
        gameOptions,

        // Cheat state
        myCheat,
        myCheatUsed,
        peekInfo,
        peekTargetId,
        loadedDieActive: false,
        rerolledDieIndex: null,

        // Misc
        gameLog: [],
        nextRoundVotes: new Set<string>(),
        spectatingId: null,
        spectatingDice: [],
        spectatingName: null,
        isReconnecting: false,

        // No-op stubs for every action the app destructures
        reconnect: () => {},
        reconnectAsHost: () => {},
        setGameOptions: handleSetGameOptions,
        assignCheat: () => {},
        startRoom: () => {},
        joinRoom: () => {},
        rejoinRoom: () => {},
        voteNextRound,
        placeBid: () => {},
        challenge: () => {},
        usePeek,
        activateLoadedDie: () => {},
        rerollDie: () => {},
        dismissPeek,
        useSlip: () => {},
        useMagicDice: () => {},
        selectCheat,
        downloadTextLog: () => {},
        downloadJSONLog: () => {},
        kickPlayer: () => {},
        setPeekTargetId: () => {},   // GameBoard calls this; no-op is fine
        setSpectateTarget: () => {},
        addBot: () => {},
        leaveRoom: () => {},
        rollSkillCheck: () => {},
        startRound: () => {},

        // Tutorial controls (consumed by App.tsx + DmTutorialOverlay)
        dmTutorialStep,
        resetDmTutorial,
        advanceDmTutorial,
    };
};
