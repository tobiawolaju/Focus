import React from 'react';

export default function LandingPage({ onLogin }) {
    return (
        <div className="landing-page">
            {/* Decorative floating elements */}
            <div className="landing-scroll-container">
                {/* Hero Section */}
                <section className="landing-section">
                    <h1 className="brand-title fade-in-up">crastinat</h1>
                    <p className="brand-tagline fade-in-up" style={{ animationDelay: '0.15s' }}>
                        If it's not on the timeline, it doesn't exist.
                    </p>
                </section>

                {/* CTA Section */}
                <section className="landing-section signin-section">
                    <h2 className="fade-in-up">Ready to own your time?</h2>
                    <p className="fade-in-up" style={{ animationDelay: '0.1s' }}>
                        Turn scattered intentions into lived reality.
                    </p>
                    <button
                        className="hero-cta fade-in-up"
                        style={{ animationDelay: '0.2s' }}
                        onClick={onLogin}
                    >
                        Sign in with Google
                    </button>
                </section>
            </div>
        </div>
    );
}
