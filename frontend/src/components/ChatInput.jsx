import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

export default function ChatInput({ onSendMessage, isProcessing }) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
    }, [message]);

    const handleSubmit = () => {
        if (message.trim() && !isProcessing) {
            onSendMessage(message);
            setMessage('');
        }
    };

    return (
        <div className="chat-input-container">
            <textarea
                ref={textareaRef}
                id="chat-input"
                rows="1"
                placeholder={isProcessing ? "Planning your time..." : "Schedule something..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isProcessing}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                    }
                }}
            />
            <button
                className="action-btn"
                onClick={handleSubmit}
                disabled={isProcessing}
                aria-label={message.trim() ? "Send message" : "Voice input"}
            >
                {isProcessing ? (
                    <Sparkles size={18} className="animate-pulse" />
                ) : (
                    <Send size={18} />
                )}
            </button>
        </div>
    );
}
