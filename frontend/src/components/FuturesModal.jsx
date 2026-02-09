import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './FuturesModal.css';

export default function FuturesModal({ user, onClose, apiBaseUrl }) {
    const [futures, setFutures] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!user) return;

        async function fetchFutures() {
            try {
                const token = user.accessToken;

                const res = await fetch(`${apiBaseUrl}/api/predict-future`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.uid,
                        accessToken: token,
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    })
                });

                const data = await res.json();
                if (data.futures && data.futures.length > 0) {
                    setFutures(data.futures);
                    // Default to the first one (usually Baseline based on server logic, but let's check)
                    // Server order: Baseline, Optimistic, Risk.
                    // Let's stick to 0.
                    setCurrentIndex(0);
                }
            } catch (err) {
                console.error("Failed to load futures", err);
            } finally {
                setLoading(false);
            }
        }

        fetchFutures();
    }, [user, apiBaseUrl]);

    // Color Mapping
    const getStoryClass = (title) => {
        if (!title) return '';
        const lower = title.toLowerCase();
        if (lower.includes('optimistic')) return 'bg-optimistic';
        if (lower.includes('risk')) return 'bg-risk';
        return 'bg-baseline'; // Default/Orange
    };

    const handleNext = (e) => {
        e.stopPropagation();
        if (currentIndex < (futures?.length || 0) - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose(); // Close on last story tap
        }
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    if (loading) {
        return (
            <div className="futures-story-overlay loading-story">
                <p>Consulting the timeline...</p>
            </div>
        );
    }

    if (!futures || futures.length === 0) {
        return (
            <div className="futures-story-overlay loading-story">
                <button className="story-close-btn" onClick={onClose}><X size={32} /></button>
                <p>No futures found yet.</p>
            </div>
        );
    }

    const currentFuture = futures[currentIndex];

    return (
        <div className={`futures-story-overlay ${getStoryClass(currentFuture.title)}`}>
            {/* Progress Bars */}
            <div className="story-progress-container">
                {futures.map((_, idx) => (
                    <div key={idx} className="story-progress-bar">
                        <div
                            className={`story-progress-fill ${idx < currentIndex ? 'completed' : idx === currentIndex ? 'completed' : ''}`}
                        />
                    </div>
                ))}
            </div>

            {/* Close Button */}
            <button className="story-close-btn" onClick={onClose}>
                <X size={40} strokeWidth={2.5} />
            </button>

            {/* Navigation Zones */}
            <div className="story-nav-area story-nav-prev" onClick={handlePrev} />
            <div className="story-nav-area story-nav-next" onClick={handleNext} />

            {/* Content */}
            <div className="story-content">
                <div className="story-type-label">predicted path</div>
                <h1 className="story-title">{currentFuture.title}</h1>
                <div className="story-horizon">{currentFuture.timeHorizon}</div>

                <ul className="story-summary-list">
                    {currentFuture.summary?.map((point, i) => (
                        <li key={i}>{point}</li>
                    ))}
                </ul>

                <div className="story-detail-text">
                    {currentFuture.details}
                </div>
            </div>
        </div>
    );
}
