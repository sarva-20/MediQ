import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useStoreRefresh, useSimClock } from '../hooks/useQueueStore';
import { getInitialGreeting, generateBotResponse } from '../mocks/chatbotResponses';
import { getPatientVisits } from '../mocks/store';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { LiveIndicator } from './shared';

export default function ChatAssistant() {
  useStoreRefresh(); // Live pub/sub updates
  const { user } = useAuth();
  const { now: currentTime } = useSimClock();
  
  const patientName = user?.name || 'Arjun Mehta';

  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Message list initialized with proactive greeting
  const [messages, setMessages] = useState(() => {
    const greeting = getInitialGreeting(patientName);
    return [
      {
        id: 'msg-init',
        sender: 'assistant',
        text: greeting.text,
        time: new Date(),
        actionLink: greeting.activeVisitToken ? `/status/${greeting.activeVisitToken}` : null,
        actionLabel: greeting.activeVisitToken ? 'Open Live Departure Board' : null,
      }
    ];
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isTyping]);

  // Track live store updates to active token and push unprompted update if changed
  const lastWaitRef = useRef(null);
  useEffect(() => {
    const visits = getPatientVisits(patientName);
    const activeVisit = visits.find(
      v => v.status === 'in-service' || v.status === 'checked-in' || v.status === 'booked'
    );

    if (activeVisit && lastWaitRef.current !== null && lastWaitRef.current !== activeVisit.estimatedWait) {
      // Estimated wait changed live!
      const statusNotice = {
        id: `update-${Date.now()}`,
        sender: 'assistant',
        isNotice: true,
        text: `Live Queue Update: Your wait time is now ~${activeVisit.estimatedWait} min for token ${activeVisit.token} (${activeVisit.waitReason || 'Queue pace updated'}).`,
        time: new Date(),
        actionLink: `/status/${activeVisit.token}`,
        actionLabel: 'View Live Board'
      };
      setMessages(prev => [...prev, statusNotice]);
      if (!isOpen) {
        setHasUnread(true);
      }
    }

    if (activeVisit) {
      lastWaitRef.current = activeVisit.estimatedWait;
    }
  }, [currentTime, patientName, isOpen]);

  const handleSendMessage = (textToSend) => {
    const userText = (textToSend || inputMessage).trim();
    if (!userText) return;

    // Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      time: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate realistic typing latency (650–850ms)
    setTimeout(() => {
      const botResponse = generateBotResponse(userText, patientName);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: botResponse.text,
        actionLink: botResponse.actionLink,
        actionLabel: botResponse.actionLabel,
        time: new Date()
      };
      setIsTyping(false);
      setMessages(prev => [...prev, botMsg]);
    }, 700);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickChips = [
    'My wait time',
    'Next appointment',
    'Find a doctor',
    'Clinic hours',
    'Reschedule'
  ];

  return (
    <>
      {/* ─── FLOATING ACTION BUTTON (BOTTOM-RIGHT) ─── */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-brand-700 text-white shadow-xl hover:bg-brand-500 hover:scale-105 transition-all cursor-pointer group focus:outline-none focus:ring-4 focus:ring-brand-500/30"
            aria-label="Open MediQ Assistant"
          >
            <MessageSquare size={24} className="group-hover:rotate-6 transition-transform" />

            {/* Unread Attention Dot */}
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-status-active border-2 border-white" />
              </span>
            )}
          </button>
        )}
      </div>

      {/* ─── CHAT PANEL MODAL / CARD ─── */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 w-full sm:w-[380px] max-h-[85vh] sm:max-h-[540px] flex flex-col bg-surface border border-hairline shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden font-sans text-left animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-brand-700 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-white">MediQ Assistant</h3>
                  <LiveIndicator />
                </div>
                <div className="text-[10px] text-brand-100/90 font-medium">
                  Live Queue & Clinic Bot
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-brand-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              aria-label="Close assistant"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body: Scrollable Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-canvas/40">
            {messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`p-3 max-w-[86%] rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isAssistant
                        ? msg.isNotice
                          ? 'bg-status-active/10 border border-status-active/30 text-ink rounded-tl-sm'
                          : 'bg-brand-100 text-ink border border-brand-500/15 rounded-tl-sm'
                        : 'bg-brand-700 text-white rounded-tr-sm'
                    }`}
                  >
                    <p className="font-normal">{msg.text}</p>

                    {/* Action link if available */}
                    {msg.actionLink && (
                      <div className="mt-2.5 pt-2 border-t border-hairline/60">
                        <Link
                          to={msg.actionLink}
                          onClick={() => setIsOpen(false)}
                          className={`inline-flex items-center gap-1.5 font-bold text-[11px] hover:underline ${
                            isAssistant ? 'text-brand-700' : 'text-white'
                          }`}
                        >
                          {msg.actionLabel || 'View Details'} <ExternalLink size={11} />
                        </Link>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-ink-muted/80 mt-1 px-1 tabular-nums">
                    {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-1.5 bg-brand-100 border border-brand-500/15 p-3 rounded-2xl rounded-tl-sm w-16">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-700 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-700 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-700 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick-Reply Chips Row */}
          <div className="px-3 pt-2 pb-1 bg-surface border-t border-hairline flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
            {quickChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSendMessage(chip)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-canvas hover:bg-brand-100 hover:text-brand-700 border border-hairline text-[11px] font-medium text-ink transition-colors cursor-pointer shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Footer: Input & Send Button */}
          <div className="p-3 bg-surface border-t border-hairline shrink-0 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about wait times, doctors, slots..."
              className="flex-1 bg-canvas border border-hairline rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isTyping}
              className="p-2 bg-brand-700 text-white rounded-xl hover:bg-brand-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </div>

        </div>
      )}
    </>
  );
}
