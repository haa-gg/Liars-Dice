import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserSettings, DiceStyle } from '../hooks/SettingsContext';
import { IconMenu, IconCross, IconRules, IconGear, IconScroll, IconInfo } from './Icons';

// @ts-ignore
const BASE_URL = import.meta.env.BASE_URL;

interface MainMenuProps {
    onShowRules?: () => void;
    onShowGameLog?: () => void;
    onLeaveGame?: () => void;
    onPlayTutorial?: () => void;
    onPlayDmTutorial?: () => void;
    gameLogEmpty?: boolean;
    hideDonation?: boolean;
}

const MainMenu: React.FC<MainMenuProps> = ({
    onShowRules,
    onShowGameLog,
    onLeaveGame,
    onPlayTutorial,
    onPlayDmTutorial,
    gameLogEmpty = false,
    hideDonation = false,
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
            <div style={{ position: 'absolute', top: '1.5rem', right: '0.75rem', zIndex: 2000 }}>
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

                    {(onPlayTutorial || onPlayDmTutorial) && (
                        <>
                            <hr style={{ margin: '0.5rem 1.5rem', opacity: 0.1 }} />
                            {onPlayTutorial && (
                                <button
                                    onClick={() => { setShowMenu(false); onPlayTutorial(); }}
                                    style={menuItemStyle}
                                >
                                    Quick Play Tutorial
                                </button>
                            )}
                            {onPlayDmTutorial && (
                                <button
                                    onClick={() => { setShowMenu(false); onPlayDmTutorial(); }}
                                    style={menuItemStyle}
                                >
                                    Expanded Game Tutorial
                                </button>
                            )}
                        </>
                    )}

                    {/* FAQ */}
                    <button
                        onClick={() => { setShowMenu(false); setShowFaq(true); }}
                        style={menuItemStyle}
                    >
                        FAQ
                    </button>

                    {/* Privacy Policy */}
                    <Link
                        to="/privacy"
                        style={{ ...menuItemStyle, textDecoration: 'none' }}
                        onClick={() => setShowMenu(false)}
                    >
                        Privacy Policy
                    </Link>

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
                                    <option value="laser-ghost">Laser Ghost Dice</option>
                                    <option value="gold">Golden Dice</option>
                                    <option value="metal">Metal Dice</option>
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
                                {!hideDonation && (
                                    <>Like the game? <a href="https://buy.stripe.com/bJe3cu35NaEt8LO5Hq9bO00">Buy me an ale!</a></>
                                )}
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
                                    <li>Rotgun "Gun Burn" Khaosbern</li>
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
                                <p style={{ fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--color-ink)' }}>Q: Got an easy way to learn this game?</p>
                                <p style={{ marginTop: 0, opacity: 0.9 }}>A: Yeah! There's a tutorial in the hamburger menu and if you're looking for a bit more training you can fire up a new table and add bots. Game masters, you'll want to poke around the game settings menu to learn the ropes with the cheat menu and how to buff up your "character" in case you want something like a roguelte dice boss for your party to face.</p>
                                <p style={{ fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--color-ink)' }}>Q: Why make this?</p>
                                <p style={{ marginTop: 0, opacity: 0.9 }}>A: While there are other versions rolling around the internet, I didn't find one that really worked for tabletop games where you might be playing a scoundrel who's skilled at cheating in bar games. As such there's a whole panel of cheats the host can enable that allow you to do stuff like peek a targets dice, re-roll, and increasingly wild methods of cheating. This helps bridge the gap between doing something like a sleight of hand check and having an interesting impact on the game without having to simply declare they won based on a skill check.</p>
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
