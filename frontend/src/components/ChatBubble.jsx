import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import './ChatBubble.css';

export default function ChatBubble({ message, isUser, isTyping, isProposal, activities, actions, onConfirm, onReject }) {
    if (isTyping) {
        return (
            <div className="chat-bubble assistant typing">
                <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        );
    }

    return (
        <div className={`chat-bubble ${isUser ? 'user' : 'assistant'} ${isProposal ? 'proposal' : ''}`}>
            <div className="bubble-content">
                {message}
            </div>

            {isProposal && ((activities && activities.length > 0) || (actions && actions.length > 0)) && (
                <div className="proposal-activities">
                    <div className="activities-list">
                        {activities && activities.map((activity, i) => (
                            <div key={`activity-${i}`} className="activity-preview">
                                <span className="activity-title">{activity.title}</span>
                                <span className="activity-time">
                                    {activity.startTime} - {activity.endTime}
                                </span>
                                {activity.days && (
                                    <span className="activity-days">
                                        {activity.days.slice(0, 3).join(', ')}{activity.days.length > 3 ? '...' : ''}
                                    </span>
                                )}
                            </div>
                        ))}

                        {actions && actions.map((action, i) => (
                            <div key={`action-${i}`} className="activity-preview action-item" style={{ borderLeft: '3px solid #10b981' }}>
                                <span className="activity-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Create: {action.title}
                                </span>
                                <span className="activity-time">
                                    {action.type === 'createSheet' ? 'Google Sheet' : 'Google Doc'}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="proposal-actions">
                        <button className="confirm-btn" onClick={onConfirm}>
                            <Check size={16} />
                            Execute Plan
                        </button>
                        <button className="reject-btn" onClick={onReject}>
                            <X size={16} />
                            Not yet
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
