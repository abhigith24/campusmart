import React, { useState, useEffect, useRef } from "react";
import { MARTGENI_CONFIG } from "../../config/martgeniConfig";
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
 * MartGeni Floating Marketplace Assistant
 * Marketplace-only AI chat — answers campus buying/selling questions
 * and searches real listings when users ask for products.
 */
export default function MartGeniFloatingAssistant({ listings = [] }) {
  const { currentUser } = useAuth();
  const isEnabled = MARTGENI_CONFIG.featureFlags.enableMartGeniAssistant;
  if (!isEnabled || !currentUser) return null;

  const [isOpen, setIsOpen] = useState(false);

  // Draggable state for mobile
  const [yPos, setYPos] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const fabRef = useRef(null);
  const dragStartYRef = useRef(0);
  const dragStartClientYRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize and load position from LocalStorage
  useEffect(() => {
    if (!isMobile) {
      setYPos(null);
      return;
    }

    const savedRatioStr = localStorage.getItem("martgeni_y_pos_ratio");
    const container = containerRef.current;
    const buttonHeight = container ? container.offsetHeight : 36;
    const defaultY = window.innerHeight - buttonHeight - 24;

    if (savedRatioStr) {
      const ratio = parseFloat(savedRatioStr);
      if (!isNaN(ratio)) {
        const targetY = ratio * window.innerHeight;
        
        // Boundaries verification
        const navbarEl = document.querySelector('.navbar') || document.querySelector('header') || document.querySelector('.site-header');
        let navbarBottom = 0;
        if (navbarEl) {
          navbarBottom = Math.max(0, navbarEl.getBoundingClientRect().bottom);
        }
        const minY = navbarBottom + 24;

        const footerEl = document.querySelector('footer') || document.querySelector('.site-footer') || document.querySelector('.footer');
        let bottomLimit = window.innerHeight;
        if (footerEl) {
          const rect = footerEl.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.top > 0) {
            bottomLimit = rect.top;
          }
        }
        const maxY = bottomLimit - buttonHeight - 24;

        setYPos(Math.max(minY, Math.min(maxY, targetY)));
        return;
      }
    }

    setYPos(defaultY);
  }, [isMobile]);

  // Adjust position on page scroll to avoid overlapping footer
  useEffect(() => {
    if (!isMobile || yPos === null) return;

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const buttonHeight = container.offsetHeight || 36;
      
      const navbarEl = document.querySelector('.navbar') || document.querySelector('header') || document.querySelector('.site-header');
      let navbarBottom = 0;
      if (navbarEl) {
        navbarBottom = Math.max(0, navbarEl.getBoundingClientRect().bottom);
      }
      const minY = navbarBottom + 24;

      const footerEl = document.querySelector('footer') || document.querySelector('.site-footer') || document.querySelector('.footer');
      let bottomLimit = window.innerHeight;
      if (footerEl) {
        const rect = footerEl.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.top > 0) {
          bottomLimit = rect.top;
        }
      }
      const maxY = bottomLimit - buttonHeight - 24;

      if (yPos < minY || yPos > maxY) {
        const clampedY = Math.max(minY, Math.min(maxY, yPos));
        setYPos(clampedY);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile, yPos]);

  // Touch handlers
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    const container = containerRef.current;
    if (!container) return;
    
    setIsDragging(true);
    hasMovedRef.current = false;
    const rect = container.getBoundingClientRect();
    dragStartYRef.current = touch.clientY - rect.top;
    dragStartClientYRef.current = touch.clientY;
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !isDragging) return;
    
    const touch = e.touches[0];
    const container = containerRef.current;
    if (!container) return;

    const buttonHeight = container.offsetHeight || 36;
    const rawY = touch.clientY - dragStartYRef.current;
    
    // Prevent default scroll behaviors
    if (e.cancelable) e.preventDefault();

    if (Math.abs(touch.clientY - dragStartClientYRef.current) > 6) {
      hasMovedRef.current = true;
    }

    const navbarEl = document.querySelector('.navbar') || document.querySelector('header') || document.querySelector('.site-header');
    let navbarBottom = 0;
    if (navbarEl) {
      navbarBottom = Math.max(0, navbarEl.getBoundingClientRect().bottom);
    }
    const minY = navbarBottom + 24;

    const footerEl = document.querySelector('footer') || document.querySelector('.site-footer') || document.querySelector('.footer');
    let bottomLimit = window.innerHeight;
    if (footerEl) {
      const rect = footerEl.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.top > 0) {
        bottomLimit = rect.top;
      }
    }
    const maxY = bottomLimit - buttonHeight - 24;

    const clampedY = Math.max(minY, Math.min(maxY, rawY));
    setYPos(clampedY);
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    setIsDragging(false);

    if (yPos !== null) {
      const ratio = yPos / window.innerHeight;
      localStorage.setItem("martgeni_y_pos_ratio", ratio.toFixed(4));
    }
  };

  const handleFabClick = (e) => {
    if (isMobile && hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsOpen(!isOpen);
  };
  const [messages, setMessages] = useState([
    {
      id:     1,
      sender: "ai",
      text:   `Hi! I'm **${MARTGENI_CONFIG.aiName}** — ${MARTGENI_CONFIG.tagline}.\n\nI can help you find listings, price items, and stay safe on campus. What do you need?`,
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
      console.error("MartGeni Chat error:", err);
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
      <div key={msg.id} className={`martgeni-msg-row ${msg.sender}`}>
        <div
          className={`martgeni-bubble ${msg.sender}`}
          dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, "<br/>") }}
        />

        {/* Matched listings cards */}
        {msg.matchedListings && msg.matchedListings.length > 0 && (
          <div className="martgeni-listing-results">
            {msg.matchedListings.map(l => (
              <div key={l.id} className="martgeni-listing-result">
                {l.images?.[0] && (
                  <img src={l.images[0]} alt={l.title} className="martgeni-listing-result-img" />
                )}
                <div className="martgeni-listing-result-info">
                  <div className="martgeni-listing-result-title">{l.title}</div>
                  <div className="martgeni-listing-result-meta">
                    <span className="martgeni-listing-result-price">
                      {l.isFree ? "Free 💚" : formatPrice(l.listingType === "rent" ? l.rentPerDay : l.price)}
                      {l.listingType === "rent" ? "/day" : ""}
                    </span>
                    {l.isVerified && <span className="martgeni-listing-result-badge">✓ Verified</span>}
                  </div>
                  <div className="martgeni-listing-result-cat">{l.category} · {l.condition}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggestion chips */}
        {msg.chips && msg.chips.length > 0 && (
          <div className="martgeni-chip-row">
            {msg.chips.map(chip => (
              <button
                key={chip}
                type="button"
                className="martgeni-chip"
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
    <div 
      ref={containerRef}
      className="martgeni-container"
      style={isMobile && yPos !== null ? { top: `${yPos}px`, bottom: "auto" } : {}}
    >
      {/* Floating Action Button */}
      <button
        ref={fabRef}
        onClick={handleFabClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`martgeni-fab ${isOpen ? "open" : ""}`}
        title={`Toggle ${MARTGENI_CONFIG.aiName}`}
        aria-label={`Toggle ${MARTGENI_CONFIG.aiName} Assistant`}
        type="button"
        style={isMobile ? {
          touchAction: "none",
          cursor: isDragging ? "grabbing" : "grab",
          transform: isDragging ? "scale(1.08)" : "none",
          boxShadow: isDragging ? "0 8px 24px rgba(37, 99, 235, 0.6)" : "",
          transition: isDragging ? "none" : "transform 0.2s ease, box-shadow 0.2s ease, top 0.2s ease"
        } : {}}
      >
        <span className="martgeni-fab-icon">✨</span>
        <span className="martgeni-fab-text">MartGeni</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="martgeni-window">
          {/* Header */}
          <div className="martgeni-header">
            <div className="martgeni-header-title">
              <span className="martgeni-header-icon">✨</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", lineHeight: 1.2 }}>
                  {MARTGENI_CONFIG.aiName}
                </div>
                <div style={{ fontSize: "10px", opacity: 0.75 }}>{MARTGENI_CONFIG.tagline}</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="martgeni-close-btn"
              title="Close"
              aria-label="Close Assistant"
              type="button"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="martgeni-messages">
            {messages.map(msg => renderMessage(msg))}
            {loading && (
              <div className="martgeni-msg-row ai">
                <div className="martgeni-bubble ai typing">
                  <span>●</span><span>●</span><span>●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="martgeni-input-area">
            <input
              type="text"
              placeholder="Ask about listings, prices, safety…"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage(inputVal)}
              className="martgeni-input"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(inputVal)}
              disabled={!inputVal.trim() || loading}
              className="martgeni-send-btn"
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
