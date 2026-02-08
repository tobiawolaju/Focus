import React from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import './ProfilePage.css';

export default function ProfilePage({ user, onLogout, onBack }) {
    const [futures, setFutures] = React.useState(null);
    const [loadingFutures, setLoadingFutures] = React.useState(true);
    const [selectedFuture, setSelectedFuture] = React.useState(null);

    React.useEffect(() => {
        if (!user) return;

        async function fetchFutures() {
            try {
                // We need to pass the accessToken if available, but for now we just pass userId 
                // as per the existing API usage in this file context (although App.jsx has accessToken).
                // Actually, ProfilePage doesn't receive accessToken prop in App.jsx.
                // We might need to consume useAuth() here or assume public endpoint?
                // The server expects { userId, accessToken, timeZone }.
                // Let's grab the token from localStorage or similar if not passed, 
                // OR better, let's just use the user.uid since the server mainly needs that for DB.
                // Wait, App.jsx passes `user` but not `accessToken` to ProfilePage.
                // I should probably update App.jsx to pass accessToken OR useAuth here.
                // Let's use `useAuth` hook if exported, effectively `import { useAuth } from '../hooks/useAuth'`.

                const token = user.accessToken; // Often available on user object in Firebase Auth

                const res = await fetch('https://to-do-iun8.onrender.com/api/predict-future', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.uid,
                        accessToken: token,
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    })
                });

                const data = await res.json();
                if (data.futures) {
                    setFutures(data.futures);
                }
            } catch (err) {
                console.error("Failed to load futures", err);
            } finally {
                setLoadingFutures(false);
            }
        }

        fetchFutures();
    }, [user]);

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
                overflowY: 'auto',
                width: '100%',
                maxWidth: '800px',
                margin: '0 auto'
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
                    marginBottom: '48px'
                }}>
                    {user?.email}
                </p>

                {/* PREDICTED FUTURES SECTION */}
                <div className="futures-section" style={{ width: '100%', textAlign: 'left' }}>
                    <div className="futures-header" style={{ marginBottom: '24px' }}>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            marginBottom: '4px'
                        }}>
                            Predicted Futures
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Three possible paths based on your current timeline.
                        </p>
                    </div>

                    {loadingFutures ? (
                        <div className="loading-futures">
                            <p>Analyzing your timeline to generate predictions...</p>
                        </div>
                    ) : futures && futures.length > 0 ? (
                        <div className="futures-grid">
                            {futures.map((future, idx) => (
                                <div
                                    key={idx}
                                    className="future-card"
                                    onClick={() => setSelectedFuture(future)}
                                >
                                    <div className="future-card-header">
                                        <h4>{future.title}</h4>
                                        <span className="time-horizon">{future.timeHorizon}</span>
                                    </div>
                                    <ul className="future-summary">
                                        {future.summary?.map((point, i) => (
                                            <li key={i}>{point}</li>
                                        ))}
                                    </ul>
                                    <div className="future-card-footer">
                                        <span>Click to explore path &rarr;</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-futures">
                            <p>No predictions available yet. Start using the app to generate data!</p>
                        </div>
                    )}
                </div>

                {/* MODAL */}
                {selectedFuture && (
                    <div className="future-modal-overlay" onClick={() => setSelectedFuture(null)}>
                        <div className="future-modal" onClick={e => e.stopPropagation()}>
                            <button className="close-modal" onClick={() => setSelectedFuture(null)}>&times;</button>
                            <h2>{selectedFuture.title}</h2>
                            <p className="modal-horizon">{selectedFuture.timeHorizon}</p>
                            <div className="modal-content">
                                <p>{selectedFuture.details}</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

