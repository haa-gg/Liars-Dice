import React, { useState } from 'react';
import { useUserSettings, DiceStyle } from '../hooks/SettingsContext';
import { IconMenu, IconCross, IconRules, IconGear, IconScroll, IconInfo } from './Icons';

// @ts-ignore
const BASE_URL = import.meta.env.BASE_URL;

interface MainMenuProps {
    onShowRules?: () => void;
    onShowGameLog?: () => void;
    onLeaveGame?: () => void;
    onPlayTutorial?: () => void;
    gameLogEmpty?: boolean;
}

const MainMenu: React.FC<MainMenuProps> = ({
    onShowRules,
    onShowGameLog,
    onLeaveGame,
    onPlayTutorial,
    gameLogEmpty = false,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showCredits, setShowCredits] = useState(false);
    const [showUserSettings, setShowUserSettings] = useState(false);
    const [showFaq, setShowFaq] = useState(false);
    const { settings, updateSettings } = useUserSettings();

    const menuItemStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        width: '100%',
        textAlign: 'left',
        padding: '0.55rem 1rem',
        cursor: 'pointer',
        fontSize: '0.9rem',
        color: 'var(--color-ink)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
    };

    return (
        <>
            {/* ── HAMBURGER MENU BUTTON ── */}
            <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 2000 }}>
                <button
                    className="log-btn"
                    onClick={() => setShowMenu(true)}
                    title="Menu"
                    aria-label="Open menu"
                    style={{ position: 'relative' }}
                >
                    <IconMenu size="1.4em" />
                </button>
            </div>

            {/* ── SIDE MENU DRAWER ── */}
            {showMenu && (
                <div className="menu-backdrop" onClick={() => setShowMenu(false)} />
            )}

            <div
                className={`side-menu ${showMenu ? 'open' : 'closed'}`}
                style={{ '--bg-stain': `url(${BASE_URL}images/bg-distress-3.png)` } as React.CSSProperties}
            >
                <div className="side-menu-header">
                    <h2>Menu</h2>
                    <button className="side-menu-close" onClick={() => setShowMenu(false)}>
                        <IconCross size="1.2em" />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0' }}>
                    {/* Rules */}
                    {onShowRules && (
                        <button
                            onClick={() => { setShowMenu(false); onShowRules(); }}
                            style={menuItemStyle}
                        >
                            <IconRules size="1.4em" />
                            Rules
                        </button>
                    )}

                    {/* User Settings */}
                    <button
                        onClick={() => { setShowMenu(false); setShowUserSettings(true); }}
                        style={menuItemStyle}
                    >
                        <IconGear style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                        Settings
                    </button>

                    {/* Game Log */}
                    {onShowGameLog && (
                        <button
                            onClick={() => { setShowMenu(false); onShowGameLog(); }}
                            disabled={gameLogEmpty}
                            style={{ ...menuItemStyle, opacity: gameLogEmpty ? 0.4 : 1 }}
                        >
                            <IconScroll size="1.4em" />
                            Game Log
                        </button>
                    )}

                    <hr style={{ margin: '0.5rem 1.5rem', opacity: 0.1 }} />

                    {/* Credits */}
                    <button
                        onClick={() => { setShowMenu(false); setShowCredits(true); }}
                        style={menuItemStyle}
                    >
                        Credits
                    </button>

                    {onPlayTutorial && (
                        <>
                            <hr style={{ margin: '0.5rem 1.5rem', opacity: 0.1 }} />
                            {/* Play Tutorial */}
                            <button
                                onClick={() => { setShowMenu(false); onPlayTutorial(); }}
                                style={menuItemStyle}
                            >
                                Play Tutorial
                            </button>
                        </>
                    )}

                    {/* FAQ */}
                    <button
                        onClick={() => { setShowMenu(false); setShowFaq(true); }}
                        style={menuItemStyle}
                    >
                        FAQ
                    </button>

                    {onLeaveGame && (
                        <>
                            <hr style={{ margin: '0.5rem 1.5rem', opacity: 0.1 }} />
                            {/* Leave Game */}
                            <button
                                onClick={() => { setShowMenu(false); onLeaveGame(); }}
                                style={{ ...menuItemStyle, color: 'var(--color-blood)', fontWeight: 'bold' }}
                            >
                                Leave Game
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── USER SETTINGS MODAL ── */}
            {showUserSettings && (
                <div className="rules-overlay" onClick={() => setShowUserSettings(false)}>
                    <div className="parchment-panel" style={{ maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
                        <button className="rules-close" onClick={() => setShowUserSettings(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCross size="0.8em" /></button>
                        <h2 style={{ marginTop: 0, textAlign: 'center' }}>Player Settings</h2>

                        <div style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem' }}>Dice Style</h3>
                            <div style={{ marginTop: '1rem' }}>
                                <select
                                    className="input-nautical"
                                    value={settings.diceStyle}
                                    onChange={e => updateSettings({ diceStyle: e.target.value as DiceStyle })}
                                    style={{ width: '100%', fontSize: '1rem' }}
                                >
                                    <option value="pixel">Pixel Art (Default)</option>
                                    <option value="doodle">Hand-Drawn Doodle</option>
                                    <option value="html">Clean n' Classic</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CREDITS MODAL ── */}
            {showCredits && (
                <div className="rules-overlay" onClick={() => setShowCredits(false)}>
                    <div className="parchment-panel" style={{ maxWidth: 420, width: '90%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button className="rules-close" onClick={() => setShowCredits(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCross size="0.8em" /></button>
                        <h2 style={{ marginTop: 0 }}>Credits</h2>
                        <div style={{ textAlign: 'left', lineHeight: 1.7, fontSize: '0.9rem' }}>
                            <p><strong>Design & Development</strong><br />
                                By <a href="https://designerofstuff.com" target="_blank" rel="noopener noreferrer">Glendon Gengel</a><br />
                                Like the game? <a href="https://buy.stripe.com/bJe3cu35NaEt8LO5Hq9bO00">Buy me an ale!</a>
                            </p>
                            <p><strong>QA, Creative Direction, and Putting Up With My Nonsense</strong><br />
                                <em>Y'all know who you are, let me know if you want real names in here!</em>
                                <ul style={{ marginLeft: '2rem' }}>
                                    <li>Eidel Blackberry</li>
                                    <li>Cho-Gath The Annihilator & Cid</li>
                                    <li>Gree</li>
                                    <li>Levena Currer</li>
                                    <li>Phobos</li>
                                    <li>Hesper</li>
                                </ul>
                            </p>
                            <p><strong>Pixel Dice</strong><br />
                                By <a href="https://opengameart.org/users/vircon32" target="_blank" rel="noopener noreferrer">Vircon32</a> on OpenGameArt<br />
                                Licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
                            </p>
                            <p><strong>A bunch of the engraved looking icons</strong><br />
                                Brushes by <a href="https://www.brusheezy.com">Brusheezy</a>
                            </p>
                            <p><strong>Hand-Drawn Bones</strong><br />
                                By <a href="http://www.sdwhaven.com/">Stacy David Wallingford</a><br />
                                <a href="http://twitter.com/sdwhaven">Twitter</a>
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {/* ── FAQ MODAL ── */}
            {showFaq && (
                <div className="rules-overlay" onClick={() => setShowFaq(false)}>
                    <div className="parchment-panel"
                        style={{ maxWidth: 420, width: '90%', '--bg-stain': `url(${BASE_URL}images/stain-distress.png)` } as React.CSSProperties}
                        onClick={e => e.stopPropagation()}>
                        <button className="rules-close" onClick={() => setShowFaq(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCross size="0.8em" /></button>
                        <h2 style={{ marginTop: 0, textAlign: 'center' }}>FAQ</h2>
                        <div style={{ marginTop: '1.5rem', textAlign: 'left', lineHeight: 1.6, fontSize: '0.95rem' }}>
                            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '1rem' }}>
                                <p style={{ fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--color-ink)' }}>Q: What is The Prohibition Court?</p>
                                <p style={{ marginTop: 0, opacity: 0.9 }}>A: More on that coming</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MainMenu;
