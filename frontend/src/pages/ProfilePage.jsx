import React from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';

export default function ProfilePage({ user, onLogout, onBack }) {
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
                justifyContent: 'center',
                padding: '48px 24px',
                textAlign: 'center'
            }}>
                <img
                    src={user?.photoURL}
                    alt={user?.displayName || 'User'}
                    style={{
                        width: '96px',
                        height: '96px',
                        borderRadius: '50%',
                        border: '3px solid var(--accent-primary)',
                        marginBottom: '24px',
                        boxShadow: 'var(--shadow-glow)'
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
                    fontSize: '0.875rem'
                }}>
                    {user?.email}
                </p>
            </main>
        </div>
    );
}
