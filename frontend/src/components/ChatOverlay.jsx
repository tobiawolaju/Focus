import React, { useRef, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import ChatBubble from './ChatBubble';
import './ChatOverlay.css';

export default function ChatOverlay({
    isOpen,
    messages,
    isTyping,
    pendingActivities,
    pendingActions,
    onClose,
    onConfirm,
    onReject,
    onClear
}) {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    if (!isOpen) return null;

    return (
        <div className="chat-overlay">
            <div className="chat-overlay-header">
                <h3>Life Planner</h3>
                <div className="header-actions">
                    {messages.length > 0 && (
                        <button className="icon-btn" onClick={onClear} title="Clear conversation">
                            <Trash2 size={16} />
                        </button>
                    )}
                    <button className="icon-btn" onClick={onClose} title="Close">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="chat-overlay-messages">
                {messages.length === 0 && !isTyping && (
                    <div className="empty-chat">
                        <p>Tell me about your goals and dreams.</p>
                        <p className="hint">I'll help you create a routine to achieve them.</p>
                    </div>
                )}

                {messages.map((msg, i) => {
                    const isLastAssistant = !msg.isUser && i === messages.length - 1;
                    const hasActivities = pendingActivities && pendingActivities.length > 0;
                    const hasActions = pendingActions && pendingActions.length > 0;
                    const showProposal = isLastAssistant && (hasActivities || hasActions);

                    return (
                        <ChatBubble
                            key={i}
                            message={msg.content}
                            isUser={msg.isUser}
                            isProposal={showProposal}
                            activities={showProposal ? pendingActivities : null}
                            actions={showProposal ? pendingActions : null}
                            onConfirm={onConfirm}
                            onReject={onReject}
                        />
                    );
                })}

                {isTyping && <ChatBubble isTyping />}

                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
