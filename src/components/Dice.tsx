import React from 'react';
import { useUserSettings } from '../hooks/SettingsContext';
import './Dice.css';

// @ts-ignore
const BASE_URL = import.meta.env.BASE_URL;

interface DiceProps {
    value: number;
    rolling?: boolean;
    isSlipped?: boolean;
    isMagic?: boolean;
}

const renderHtmlDie = (value: number) => {
    switch (value) {
        case 1: return <div className="dice-html"><div className="dice-row center" style={{ marginTop: 'auto', marginBottom: 'auto' }}><span className="dice-dot" /></div></div>;
        case 2: return <div className="dice-html"><div className="dice-row"><span className="dice-dot" /></div><div className="dice-row right"><span className="dice-dot" /></div></div>;
        case 3: return <div className="dice-html"><div className="dice-row"><span className="dice-dot" /></div><div className="dice-row center"><span className="dice-dot" /></div><div className="dice-row right"><span className="dice-dot" /></div></div>;
        case 4: return <div className="dice-html"><div className="dice-row"><span className="dice-dot" /><span className="dice-dot" /></div><div className="dice-row"><span className="dice-dot" /><span className="dice-dot" /></div></div>;
        case 5: return <div className="dice-html"><div className="dice-row"><span className="dice-dot" /><span className="dice-dot" /></div><div className="dice-row center"><span className="dice-dot" /></div><div className="dice-row"><span className="dice-dot" /><span className="dice-dot" /></div></div>;
        case 6: return <div className="dice-html"><div className="dice-row"><span className="dice-dot" /><span className="dice-dot" /></div><div className="dice-row"><span className="dice-dot" /><span className="dice-dot" /></div><div className="dice-row"><span className="dice-dot" /><span className="dice-dot" /></div></div>;
        default: return <div className="dice-html" />;
    }
};

const Dice: React.FC<DiceProps> = ({ value, rolling, isSlipped, isMagic }) => {
    const { settings } = useUserSettings();

    const imagePath = (settings.diceStyle === 'laser-ghost' || settings.diceStyle === 'gold')
        ? `${BASE_URL}images/dice/${settings.diceStyle}-dice-${value}.svg`
        : `${BASE_URL}images/dice/${settings.diceStyle}-dice-${value}.png`;

    return (
        <div className={`dice-img-container ${rolling ? 'rolling' : ''} ${isSlipped ? 'slipped' : ''} ${isMagic ? 'magic' : ''} ${settings.diceStyle === 'laser-ghost' ? 'scanlines-2' : ''}`}>
            {settings.diceStyle === 'html' ? (
                renderHtmlDie(value)
            ) : (
                <img
                    src={imagePath}
                    alt={`Die showing ${value}`}
                    className="dice-img"
                    draggable={false}
                />
            )}
        </div>
    );
};

export default Dice;
