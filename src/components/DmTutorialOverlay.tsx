import React from 'react';

interface DmTutorialOverlayProps {
    dmTutorialStep: number;
    onContinue: () => void;
}

interface StepDef {
    title: string;
    message: string;
    showContinue: boolean;
    continueLabel?: string;
}

const STEPS: StepDef[] = [
    // 0 - Welcome
    {
        title: 'Full Game Tutorial: Honor System Cheats',
        message: (
            <>
                {"Let's set the scene, your party is in a dodgy seaside tavern and they've just found the local Liar's Dice table. This walkthrough shows how Honor System Cheats lets your rogues and scoundrels rig the game in their favor."}
                <br /><br />
                {'Before starting the game, open ⚙ Settings (top bar) and flip "Honor System Cheats" to On.'}
            </>
        ),
        showContinue: true,
        continueLabel: 'Got it',
    },
    // 1 - Start the match
    {
        title: 'Start the match',
        message: (
            <>
                {"Hit Start Round at the bottom to begin the match"}
            </>
        ),
        showContinue: false,
    },
    // 2 - Cheat panel intro
    {
        title: 'The Cheat Panel',
        message: (
            <>
                {'On each player\'s turn a "Dare to Cheat?" panel appears at the bottom. They now have an array of cheats they can attempt on their turn.'}
                <br /><br />
                {"In our tabletop setting you'd have them roll a skill check (e.g. Sleight of Hand, Deception, etc.) to determine if they pull it off or get busted. Tap the Peek ability to see how it works →"}
            </>
        ),
        showContinue: false,
    },
    // 3 - Peek: target picker
    {
        title: 'Peek: Choose a Target',
        message: (
            <>
                {"The player sees a list of active opponents. They tap one to spy on. In a TTRPG, this would be tied to a Deception or Perception check. Their potential victim would make a perception or insight check to detect the cheat."}
                <br /><br />
                {"Pick a target from the list below →"}
            </>
        ),
        showContinue: false,
    },
    // 4 - Peek: result (auto-advances)
    {
        title: 'Peek: Private Reveal',
        message: (
            <>
                {"One die is shown from the target's cup — privately. No other player sees it. Low risk and you now have better info to make your bid. Let's assume you succeeded on your check here."}
            </>
        ),
        showContinue: true,
        continueLabel: 'Continue →',
    },
    // 5 - Slip
    {
        title: 'Slip: Sleight of Hand',
        message: (
            <>
                {"Now for a more daring sleight of hand trick, throwing in a spare dice -- try it yourself! Click the "}<strong>{'Slip'}</strong>
                {' button below. It secretly adds an extra die to your hand. Watch your dice count go up!'}
            </>
        ),
        showContinue: false,
    },

    // 6 - Slip: Applied
    {
        title: 'Slip: Applied',
        message: (
            <>
                {"Look at that—you now have a 6th die tucked into your hand! The rest of the table is none the wiser."}
            </>
        ),
        showContinue: true,
        continueLabel: 'Continue →',
    },

    // 7 - Remaining cheats
    {
        title: 'Three More Cheats',
        message: (
            <>
                <ul style={{ textAlign: 'left', margin: '0 0 0.8rem 0', paddingLeft: '1.2rem' }}>
                    <li style={{ marginBottom: '0.4rem' }}><strong>Loaded Die</strong> {"lets the player re-roll a die."}</li>
                    <li style={{ marginBottom: '0.4rem' }}><strong>Shield</strong> {"Automatically saves a die if the player loses a challenge."}</li>
                    <li><strong>Magic Dice</strong> {"is a stronger Slip that adds 2 dice."}</li>
                </ul>
                {"As the DM it's up to you how tough these are to pull off against NPCs. Other players see the normal count until \"Liar!\" is called. All cheats reset at round start — fresh picks every time."}
            </>
        ),
        showContinue: true,
        continueLabel: 'Continue →',
    },
    // 8 - Tabletop Tips
    {
        title: "Pro tip:",
        message: (
            <>
                {"When a player taps a cheat, have them roll the relevant skill check at the digital table. Success = use it; failure = getting busted-- does that mean a stern warning, a bottle broken over their heads, or something worse? Have fun with it!"}
            </>
        ),
        showContinue: true,
        continueLabel: 'Continue →',
    },
    // 9 - Wrap-up
    {
        title: "You're Ready!",
        message: (
            <>
                {"If you're ever curious if a player used a cheat there's a public game log squirreled away in the hamburger menu during a game!"}
            </>
        ),
        showContinue: true,
        continueLabel: 'End Tutorial',
    },
];

const TOTAL_STEPS = STEPS.length; // 10

// ── Component ────────────────────────────────────────────────────────────────
export const DmTutorialOverlay: React.FC<DmTutorialOverlayProps> = ({
    dmTutorialStep,
    onContinue,
}) => {
    const step = STEPS[dmTutorialStep];
    if (!step) return null;

    const progress = ((dmTutorialStep + 1) / TOTAL_STEPS) * 100;

    return (
        <div
            style={{
                position: 'absolute',
                top: '18%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--color-wood-dark)',
                color: 'var(--color-parchment)',
                padding: '1rem 1.4rem 1.1rem',
                borderRadius: '8px',
                boxShadow: '0 6px 24px rgba(0,0,0,0.65)',
                border: '2px solid var(--color-gold)',
                zIndex: 3000,
                maxWidth: '90%',
                width: '430px',
                textAlign: 'center',
                // Clicks pass through to the game UI beneath
                pointerEvents: 'none',
            }}
        >
            {/* ── Header row ── */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.4rem',
                    fontSize: '0.65rem',
                    opacity: 0.55,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                }}
            >
                <span>DM Tutorial</span>
                <span>
                    Step {dmTutorialStep + 1} / {TOTAL_STEPS}
                </span>
            </div>

            {/* ── Progress bar ── */}
            <div
                style={{
                    height: '2px',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '1px',
                    marginBottom: '0.75rem',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: 'var(--color-gold)',
                        borderRadius: '1px',
                        transition: 'width 0.45s ease',
                    }}
                />
            </div>

            {/* ── Title ── */}
            <h3
                style={{
                    marginTop: 0,
                    marginBottom: '0.45rem',
                    color: 'var(--color-gold)',
                    fontSize: '0.95rem',
                    lineHeight: 1.3,
                }}
            >
                {step.title}
            </h3>

            {/* ── Body ── */}
            <p
                style={{
                    margin: step.showContinue ? '0 0 0.8rem 0' : 0,
                    lineHeight: 1.55,
                    fontSize: '0.875rem',
                    opacity: 0.92,
                }}
            >
                {step.message}
            </p>

            {/* ── Continue button — opts back into pointer events ── */}
            {step.showContinue && (
                <div style={{ pointerEvents: 'auto' }}>
                    <button
                        className="btn-nautical"
                        onClick={onContinue}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 1.3rem' }}
                    >
                        {step.continueLabel ?? 'Continue →'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default DmTutorialOverlay;

