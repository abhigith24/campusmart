import React, { useState, useEffect, useRef } from "react";
import { MATEGENI_CONFIG } from "../../config/mategeniConfig";
import { generateChatResponse } from "../../services/ai/aiService";

import { useAuth } from "../../context/AuthContext";

const QUICK_CHIPS = [
  { label: "🔍 Find electronics", query: "find electronics" },
  { label: "📚 Find books", query: "find books" },
  { label: "💰 Price guide", query: "how much should I price my item?" },
  { label: "🛡️ Safety tips", query: "how to stay safe when buying on campus?" },
];

const formatPrice = (p) =>
  p ? `₹${Number(p).toLocaleString("en-IN")}` : "Free";

/**
 * MateGeni Floating Marketplace Assistant
 * Marketplace-only AI chat — answers campus buying/selling questions
 * and searches real listings when users ask for products.
 */
export default function MateGeniFloatingAssistant({ listings = [] }) {
  const { currentUser } = useAuth();
  const isEnabled = MATEGENI_CONFIG.featureFlags.enableMateGeniAssistant;
  if (!isEnabled || !currentUser) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id:     1,
      sender: "ai",
      text:   `Hi! I'm **${MATEGENI_CONFIG.aiName}** — ${MATEGENI_CONFIG.tagline}.\n\nI can help you find listings, price items, and stay safe on campus. What do you need?`,
      chips:  QUICK_CHIPS.map(c => c.label),
    },
  ]);
  const [inputVal,  setInputVal]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { id: Date.now(), sender: "user", text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInputVal("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({
        role:    m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await generateChatResponse({
        messages: history,
        listings,
        userContext: { timestamp: new Date(), platform: "web" },
      });

      const aiMsg = {
        id:              Date.now() + 1,
        sender:          "ai",
        text:            res.replyText,
        matchedListings: res.matchedListings || [],
        chips:           res.suggestedChips  || [],
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error("MateGeni Chat error:", err);
      setMessages(prev => [...prev, {
        id:     Date.now() + 2,
        sender: "ai",
        text:   "⚠️ I ran into an issue. Please try again.",
        chips:  [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (chipLabel) => {
    const chip = QUICK_CHIPS.find(c => c.label === chipLabel);
    sendMessage(chip ? chip.query : chipLabel);
  };

  const renderMessage = (msg) => {
    // Simple bold (**text**) renderer
    const formatted = msg.text.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${t}</strong>`);

    return (
      <div key={msg.id} className={`mategeni-msg-row ${msg.sender}`}>
        <div
          className={`mategeni-bubble ${msg.sender}`}
          dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, "<br/>") }}
        />

        {/* Matched listings cards */}
        {msg.matchedListings && msg.matchedListings.length > 0 && (
          <div className="mategeni-listing-results">
            {msg.matchedListings.map(l => (
              <div key={l.id} className="mategeni-listing-result">
                {l.images?.[0] && (
                  <img src={l.images[0]} alt={l.title} className="mategeni-listing-result-img" />
                )}
                <div className="mategeni-listing-result-info">
                  <div className="mategeni-listing-result-title">{l.title}</div>
                  <div className="mategeni-listing-result-meta">
                    <span className="mategeni-listing-result-price">
                      {l.isFree ? "Free 💚" : formatPrice(l.listingType === "rent" ? l.rentPerDay : l.price)}
                      {l.listingType === "rent" ? "/day" : ""}
                    </span>
                    {l.isVerified && <span className="mategeni-listing-result-badge">✓ Verified</span>}
                  </div>
                  <div className="mategeni-listing-result-cat">{l.category} · {l.condition}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggestion chips */}
        {msg.chips && msg.chips.length > 0 && (
          <div className="mategeni-chip-row">
            {msg.chips.map(chip => (
              <button
                key={chip}
                type="button"
                className="mategeni-chip"
                onClick={() => handleChipClick(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mategeni-container">
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`mategeni-fab ${isOpen ? "open" : ""}`}
        title={`Toggle ${MATEGENI_CONFIG.aiName}`}
        aria-label={`Toggle ${MATEGENI_CONFIG.aiName} Assistant`}
        type="button"
      >
        <span className="mategeni-fab-icon">✨</span>
        <span className="mategeni-fab-text">MateGeni</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="mategeni-window">
          {/* Header */}
          <div className="mategeni-header">
            <div className="mategeni-header-title">
              <span className="mategeni-header-icon">✨</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", lineHeight: 1.2 }}>
                  {MATEGENI_CONFIG.aiName}
                </div>
                <div style={{ fontSize: "10px", opacity: 0.75 }}>{MATEGENI_CONFIG.tagline}</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="mategeni-close-btn"
              title="Close"
              aria-label="Close Assistant"
              type="button"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="mategeni-messages">
            {messages.map(msg => renderMessage(msg))}
            {loading && (
              <div className="mategeni-msg-row ai">
                <div className="mategeni-bubble ai typing">
                  <span>●</span><span>●</span><span>●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="mategeni-input-area">
            <input
              type="text"
              placeholder="Ask about listings, prices, safety…"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage(inputVal)}
              className="mategeni-input"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(inputVal)}
              disabled={!inputVal.trim() || loading}
              className="mategeni-send-btn"
              type="button"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
