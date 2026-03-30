import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCross } from './Icons';

// @ts-ignore
const BASE_URL = import.meta.env.BASE_URL;

const PrivacyPolicy: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="lobby-overlay" style={{ overflowY: 'auto', padding: '2rem 1rem', display: 'block' }}>
            <div 
                className="parchment-panel" 
                style={{ 
                    maxWidth: '800px', 
                    margin: '0 auto', 
                    position: 'relative',
                    padding: '3rem',
                    minHeight: '80vh',
                    '--bg-stain': `url(${BASE_URL}images/bg-distress-2.png)`
                } as React.CSSProperties}
            >
                <button 
                    className="rules-close" 
                    onClick={() => navigate('/')}
                    style={{ 
                        position: 'absolute', 
                        top: '1.5rem', 
                        right: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <IconCross size="1.2em" />
                </button>

                <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem' }}>Privacy Policy</h1>

                <div className="policy-content" style={{ lineHeight: '1.6', fontSize: '1rem', color: 'var(--color-ink)' }}>
                    <p style={{ fontStyle: 'italic', marginBottom: '2rem', textAlign: 'center' }}>
                        Last Updated: March 29, 2026
                    </p>

                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                            Our Philosophy
                        </h2>
                        <p>
                            Liar's Dice is built as a peer-to-peer game designed for privacy and pure fun. 
                            We do not require accounts, we do not collect your real name, and we do not store your game data on our servers.
                        </p>
                    </section>

                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                            Data Collection and Usage
                        </h2>
                        <h3 style={{ fontSize: '1.1rem', marginTop: '1rem' }}>Google Analytics</h3>
                        <p>
                            We use Google Analytics (via Google Tag Manager) to understand how the game is being used. 
                            This helps us identify technical issues and understand which features are most popular. 
                            Google Analytics collects anonymous usage data such as page views and session duration. 
                            This data is not linked to any personal identity.
                        </p>

                        <h3 style={{ fontSize: '1.1rem', marginTop: '1rem' }}>GitHub Pages</h3>
                        <p>
                            This game is hosted on GitHub Pages. As part of GitHub's hosting service, standard logging data 
                            (including visitor IP addresses) may be collected for security and operational purposes. 
                            You can view GitHub's privacy policy for more information on their practices.
                        </p>
                    </section>

                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                            Multiplayer Connection (Peer-to-Peer)
                        </h2>
                        <p>
                            Liar's Dice uses <strong>PeerJS</strong> to establish direct connections between players. 
                            To connect your device directly to your friends' devices, IP addresses are briefly exchanged 
                            through a signaling server. Once the connection is established, game data travels directly between players. 
                            This IP data is not stored or logged by us.
                        </p>
                    </section>

                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                            Local Storage
                        </h2>
                        <p>
                            We use your browser's <strong>Local Storage</strong> to save your chosen Captain name, 
                            dice style preferences, and session data. This allows you to rejoin a game if your connection 
                            drops and keeps your settings saved for your next visit. This data stays on your device and 
                            is never uploaded to our servers.
                        </p>
                    </section>

                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                            Questions?
                        </h2>
                        <p>
                            If you have questions about our privacy practices, you can reach out via the 
                            <a href="https://github.com/haa-gg/liars-dice" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-blood)', fontWeight: 'bold', marginLeft: '0.3rem' }}>
                                GitHub repository
                            </a>.
                        </p>
                    </section>

                    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                        <button className="btn-nautical" onClick={() => navigate('/')}>
                            Back to the Deck
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
