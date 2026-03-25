import React from 'react';

interface TutorialOverlayProps {
    tutorialStep: number;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ tutorialStep }) => {
    let message = "";
    if (tutorialStep === 0) {
        message = "Ahoy! Let's learn to play. You are the Host. Click 'Start Round' down below to start the round!";
    } else if (tutorialStep === 1) {
        message = "The round has started. It is Botbeard's turn. Let's see what he bids...";
    } else if (tutorialStep === 2) {
        message = "It's your turn! Botbeard bid exactly one 2. You must raise the count or the face. Since you rolled two 3s, raise the bid to two 3s using the controls below.";
    } else if (tutorialStep === 3) {
        message = "Great bid! Now it's Tin Whiskers' turn. Will he raise your bid, or call you a Liar?";
    } else if (tutorialStep === 4) {
        message = "Tin Whiskers called you a Liar! But you were telling the truth, and he had some 3s too. The total count was 4, more than your bid of 2. Tin Whiskers loses a die! That's the basics. You can add some bots to play against in a regular room for more practice. Click 'Next Round' to end the tutorial.";
    }

    if (!message) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-wood-dark)',
            color: 'var(--color-parchment)',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: '2px solid var(--color-gold)',
            zIndex: 3000,
            maxWidth: '90%',
            width: '400px',
            textAlign: 'center',
            pointerEvents: 'none', // Lets user click through it if it covers stuff!
        }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-gold)' }}>Captain's Advice</h3>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{message}</p>
        </div>
    );
};

export default TutorialOverlay;
