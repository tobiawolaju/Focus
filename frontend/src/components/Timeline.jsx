import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import ActivityBlock from './ActivityBlock';

const { memo } = React;

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TimeIndicator = memo(({ zoom }) => {
    const [minutes, setMinutes] = useState(() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    });

    useEffect(() => {
        let frameId;
        const update = () => {
            const now = new Date();
            setMinutes(now.getHours() * 60 + now.getMinutes());
            frameId = requestAnimationFrame(update);
        };
        update();
        return () => cancelAnimationFrame(frameId);
    }, []);

    return (
        <div
            className="current-time-indicator"
            id="current-time-indicator"
            style={{ left: `calc(${minutes} * var(--pixels-per-minute))` }}
        />
    );
});

const TimeRuler = memo(({ zoom }) => (
    <div className="time-ruler" id="time-ruler">
        {HOURS.map(hour => (
            <div key={hour} className="time-marker">
                {String(hour).padStart(2, '0')}:00
            </div>
        ))}
    </div>
));

// Smooth lerp function for animation
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

export default function Timeline({ activities, onSelectActivity }) {
    const containerRef = useRef(null);
    const [zoom, setZoom] = useState(1.0);
    const targetZoomRef = useRef(1.0);
    const animatingRef = useRef(false);

    // --- INITIAL SCROLL ---
    useLayoutEffect(() => {
        if (containerRef.current) {
            const now = new Date();
            const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
            const pixelsPerMinute = (200 * zoom) / 60;
            const targetX = currentTimeInMinutes * pixelsPerMinute - (window.innerWidth / 2);
            containerRef.current.scrollLeft = Math.max(0, targetX);
        }
    }, []); // Only on mount

    const zoomRef = useRef(zoom);
    const lastTouchDistanceRef = useRef(0);
    const scrollCenterRef = useRef({ clientX: 0, relativeX: 0 });

    // Sync ref with state
    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

    // Smooth zoom animation loop
    const animateZoom = () => {
        const el = containerRef.current;
        if (!el) return;

        const currentZoom = zoomRef.current;
        const targetZoom = targetZoomRef.current;

        // Check if we're close enough to target
        if (Math.abs(currentZoom - targetZoom) < 0.001) {
            animatingRef.current = false;
            setZoom(targetZoom);
            document.documentElement.style.setProperty('--zoom-level', targetZoom);
            return;
        }

        // Smooth interpolation (0.15 = smoothing factor, higher = faster)
        const newZoom = lerp(currentZoom, targetZoom, 0.15);

        // Update scroll position to maintain center point
        const { clientX, relativeX } = scrollCenterRef.current;
        const rect = el.getBoundingClientRect();
        const ratio = newZoom / currentZoom;
        const newRelativeX = relativeX * ratio;

        setZoom(newZoom);
        document.documentElement.style.setProperty('--zoom-level', newZoom);

        // Adjust scroll to maintain position under cursor
        el.scrollLeft = newRelativeX - (clientX - rect.left);

        requestAnimationFrame(animateZoom);
    };

    // --- ZOOM LOGIC ---
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const applyZoom = (newZoom, centerX) => {
            const minZoom = 0.15;
            const maxZoom = 4.0;
            const clamped = Math.max(minZoom, Math.min(maxZoom, newZoom));

            if (clamped === targetZoomRef.current) return;

            const rect = el.getBoundingClientRect();
            const relativeX = centerX - rect.left + el.scrollLeft;

            // Store the center point for smooth animation
            scrollCenterRef.current = { clientX: centerX, relativeX };
            targetZoomRef.current = clamped;

            // Start animation if not already running
            if (!animatingRef.current) {
                animatingRef.current = true;
                requestAnimationFrame(animateZoom);
            }
        };

        const handleWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = -e.deltaY;
                // Smaller zoom steps for smoother feel
                const factor = delta > 0 ? 1.08 : 0.92;
                applyZoom(targetZoomRef.current * factor, e.clientX);
            }
        };

        const handleTouchStart = (e) => {
            if (e.touches.length === 2) {
                lastTouchDistanceRef.current = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        };

        const handleTouchMove = (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const distance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;

                if (lastTouchDistanceRef.current > 0) {
                    const factor = distance / lastTouchDistanceRef.current;
                    // Dampen the touch zoom for smoother feel
                    const dampedFactor = 1 + (factor - 1) * 0.5;
                    applyZoom(targetZoomRef.current * dampedFactor, centerX);
                }
                lastTouchDistanceRef.current = distance;
            }
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        el.addEventListener('touchstart', handleTouchStart);
        el.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            el.removeEventListener('wheel', handleWheel);
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
        };
    }, []); // Empty dependency array means listeners are stable

    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Memoize track assignment
    const { sorted, trackCount } = useMemo(() => {
        const filteredActivities = activities.filter(activity => {
            if (!activity.days || activity.days.length === 0) return true;
            return activity.days.some(day => day.toString().toLowerCase() === currentDay);
        });

        const sortedActivities = [...filteredActivities].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
        const tracks = [];

        sortedActivities.forEach(activity => {
            const start = parseTime(activity.startTime);
            let placed = false;
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                const lastActivityInTrack = track[track.length - 1];
                if (start >= parseTime(lastActivityInTrack.endTime)) {
                    track.push(activity);
                    activity.trackIndex = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                tracks.push([activity]);
                activity.trackIndex = tracks.length - 1;
            }
        });

        return { sorted: sortedActivities, trackCount: tracks.length };
    }, [activities, currentDay]);

    function parseTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        const [hours, minutes] = timeStr.trim().split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    }

    return (
        <div className="timeline-container" ref={containerRef} onClick={() => onSelectActivity(null)}>
            <TimeRuler zoom={zoom} />
            <div className="tracks-container" style={{ height: `calc(${trackCount} * var(--grid-track-total))` }}>
                <TimeIndicator zoom={zoom} />
                {sorted.map(activity => (
                    <ActivityBlock
                        key={activity.id}
                        activity={activity}
                        onClick={() => onSelectActivity(activity)}
                    />
                ))}
            </div>
        </div>
    );
}
