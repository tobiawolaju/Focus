import React, { useState } from 'react';
import { ArrowLeft, LogOut, Sparkles, Loader2 } from 'lucide-react';
import './ProfilePage.css';

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://to-do-iun8.onrender.com';

export default function ProfilePage({ user, accessToken, onLogout, onBack }) {
    const [prediction, setPrediction] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePredict = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/predict-future`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, accessToken })
            });
            const data = await response.json();
            if (data.prediction) {
                setPrediction(data.prediction);
            } else {
                setPrediction("I couldn't generate a prediction right now. Try adding more tasks to your schedule!");
            }
        } catch (err) {
            console.error("Prediction failed:", err);
            setPrediction("Failed to connect to the prediction engine.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container">
            <header>
                <div className="header-main">
                    <button
                        className="icon-btn"
                        onClick={onBack}
                        aria-label="Go back"
                        style={{ marginRight: '12px' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1>{user?.displayName || 'Profile'}</h1>
                </div>
                <div id="auth-container">
                    <button
                        className="action-button secondary"
                        onClick={onLogout}
                        style={{ padding: '8px 20px' }}
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </header>

            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: '48px 24px',
                textAlign: 'center',
                overflowY: 'auto'
            }}>
                <img
                    src={user?.photoURL}
                    alt={user?.displayName || 'User'}
                    style={{
                        width: '96px',
                        height: '96px',
                        borderRadius: '0px',
                        border: '1px solid var(--border-visible)',
                        marginBottom: '24px',
                        boxShadow: 'none'
                    }}
                />
                <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.75rem',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: 'var(--text-primary)'
                }}>
                    {user?.displayName || 'User'}
                </h2>
                <p style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.875rem',
                    marginBottom: '32px'
                }}>
                    {user?.email}
                </p>

                {/* FUTURE PREDICTOR SECTION */}
                <div style={{
                    marginTop: '20px',
                    padding: '32px 24px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-visible)',
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '600px',
                    textAlign: 'left'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Sparkles size={24} style={{ color: '#9333ea' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                            Future Predictor
                        </h3>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
                        Analyze your schedule patterns to forecast your trajectory in health, career, and finance over the next 6 months.
                    </p>

                    {prediction && (
                        <div style={{
                            marginBottom: '24px',
                            padding: '20px',
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            borderRadius: '8px',
                            borderLeft: '4px solid #9333ea',
                            fontSize: '0.95rem',
                            color: 'var(--text-primary)',
                            lineHeight: '1.7',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {prediction}
                        </div>
                    )}

                    <button
                        onClick={handlePredict}
                        disabled={loading}
                        className="action-button primary"
                        style={{
                            width: '100%',
                            height: '48px',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            fontWeight: '600'
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} style={{ marginRight: '8px' }} />
                                Analyzing your life...
                            </>
                        ) : (
                            '✨ Predict My Future'
                        )}
                    </button>
                </div>
            </main>
        </div>
    );
}
