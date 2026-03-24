import React from 'react';
import './Dice.css';

// @ts-ignore
const BASE_URL = import.meta.env.BASE_URL;

interface DiceProps {
    value: number;
    rolling?: boolean;
    isSlipped?: boolean;
}

const Dice: React.FC<DiceProps> = ({ value, rolling, isSlipped }) => {
    return (
        <div className={`dice-img-container ${rolling ? 'rolling' : ''} ${isSlipped ? 'slipped' : ''}`}>
            <img
                src={`${BASE_URL}images/dice/pixel-dice-${value}.png`}
                alt={`Die showing ${value}`}
                className="dice-img"
                draggable={false}
            />
        </div>
    );
};

export default Dice;
