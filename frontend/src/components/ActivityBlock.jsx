import React from 'react';

export default function ActivityBlock({ activity, onClick }) {
    const parseTime = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.trim().split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    };

    const start = parseTime(activity.startTime);
    const end = parseTime(activity.endTime);
    const duration = end - start;

    // Color variations for visual interest
    const accentColor = activity.color || '#d4a853';

    const style = {
        left: `calc(${start} * var(--pixels-per-minute))`,
        width: `calc(${duration} * var(--pixels-per-minute))`,
        top: `calc(${activity.trackIndex} * var(--grid-track-total))`,
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid',
        borderLeftColor: accentColor,
        '--block-accent': accentColor,
    };

    return (
        <div
            className="activity-block"
            style={style}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <div className="activity-title">{activity.title}</div>
            <div className="activity-time">
                {activity.startTime} — {activity.endTime}
            </div>
        </div>
    );
}
