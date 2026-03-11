import React from 'react';
import './Dice.css';

interface DiceProps {
    value: number;
    rolling?: boolean;
    isSlipped?: boolean;
}

const Dice: React.FC<DiceProps> = ({ value, rolling, isSlipped }) => {
    const renderPips = (faceValue: number) => {
        const pipMap: Record<number, number[]> = {
            1: [4],
            2: [0, 8],
            3: [0, 4, 8],
            4: [0, 2, 6, 8],
            5: [0, 2, 4, 6, 8],
            6: [0, 2, 3, 5, 6, 8]
        };
        const activePips = pipMap[faceValue] || [];
        return Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={`pip ${activePips.includes(i) ? 'active' : ''}`} />
        ));
    };

    return (
        <div className={`dice-container ${rolling ? 'rolling' : ''}`}>
            <div className={`dice dice-${value} ${isSlipped ? 'slipped' : ''}`}>
                <div className="face front">{renderPips(1)}</div>
                <div className="face back">{renderPips(6)}</div>
                <div className="face right">{renderPips(3)}</div>
                <div className="face left">{renderPips(4)}</div>
                <div className="face top">{renderPips(2)}</div>
                <div className="face bottom">{renderPips(5)}</div>
            </div>
        </div>
    );
};

export default Dice;
