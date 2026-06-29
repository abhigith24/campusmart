import React, { useState, useEffect, useRef, useCallback } from "react";
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

  // Smart movement, persistence, and collapsed states
  const [isDragging, setIsDragging] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [yPos, setYPos] = useState(() => {
    const saved = localStorage.getItem("martgeni-y");
    if (!saved || saved === "undefined" || saved === "null") return null;
    const parsed = parseFloat(saved);
    return (isNaN(parsed) || !isFinite(parsed)) ? null : parsed;
  });

  const containerRef = useRef(null);
  const fabRef = useRef(null);
  const clickStartRef = useRef({ x: 0, y: 0, time: 0 });
  const dragStartYRef = useRef(0);
  const dragStartPosRef = useRef(0);
  const isDraggingRef = useRef(false);
  const draggedRef = useRef(false);
  const rafRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const getBounds = useCallback(() => {
    const isMobile = window.innerWidth <= 768;

    // Use the actual widget height instead of hardcoding it
    const fabHeight =
      fabRef.current?.offsetHeight || (isMobile ? 44 : 56);

    const SAFE_MARGIN = 24;

    // -----------------------------
    // TOP LIMIT
    // -----------------------------

    let topLimit = SAFE_MARGIN;

    // Find every fixed or sticky element near the top
    const topElements = [...document.querySelectorAll("*")].filter((el) => {
      const style = window.getComputedStyle(el);

      if (
        style.position !== "fixed" &&
        style.position !== "sticky"
      ) {
        return false;
      }

      const rect = el.getBoundingClientRect();

      return (
        rect.height > 0 &&
        rect.top <= 0 &&
        rect.bottom > 0
      );
    });

    if (topElements.length) {
      topLimit =
        Math.max(...topElements.map((el) => el.getBoundingClientRect().bottom)) +
        SAFE_MARGIN;
    }

    // -----------------------------
    // BOTTOM LIMIT
    // -----------------------------

    let bottomLimit =
      window.innerHeight -
      fabHeight -
      SAFE_MARGIN;

    // Mobile Bottom Navigation
    const bottomNav = document.querySelector(
      ".mobile-bottom-nav, .mobile-nav, .mobile-nav-bar"
    );

    if (isMobile && bottomNav) {
      const rect = bottomNav.getBoundingClientRect();

      bottomLimit =
        rect.top -
        fabHeight -
        SAFE_MARGIN;
    }

    // Footer
    const footer =
      document.querySelector("footer") ||
      document.querySelector(".footer") ||
      document.querySelector(".admin-footer");

    if (footer) {
      const rect = footer.getBoundingClientRect();

      // Footer entering viewport
      if (rect.top < window.innerHeight) {
        bottomLimit = Math.min(
          bottomLimit,
          rect.top - fabHeight - SAFE_MARGIN
        );
      }
    }

    // -----------------------------
    // Prevent Invalid Bounds
    // -----------------------------

    if (bottomLimit <= topLimit) {
      bottomLimit = topLimit + fabHeight;
    }

    return {
      topLimit,
      bottomLimit,
    };
  }, []);

  // Update inline top style on container when Y position changes
  useEffect(() => {
    if (containerRef.current) {
      if (yPos !== null && !isNaN(yPos) && isFinite(yPos)) {
        containerRef.current.style.top = `${yPos}px`;
        containerRef.current.style.bottom = "auto";
      } else {
        containerRef.current.style.top = "auto";
        containerRef.current.style.bottom = "24px";
      }
    }
  }, [yPos]);

  // Constrain position to safe boundaries dynamically (resize, footer entering screen)
  useEffect(() => {
    const handleResize = () => {
      if (yPos !== null && !isNaN(yPos)) {
        const { topLimit, bottomLimit } = getBounds();
        if (isNaN(topLimit) || isNaN(bottomLimit)) return;
        const constrained = Math.min(Math.max(yPos, topLimit), bottomLimit);
        if (isNaN(constrained)) return;
        if (constrained !== yPos) {
          setYPos(constrained);
          localStorage.setItem("martgeni-y", constrained);
        }
      }
    };
    window.addEventListener("resize", handleResize);
    const interval = setInterval(handleResize, 1000); // Check footer/layout shifts
    return () => {
      window.removeEventListener("resize", handleResize);
      clearInterval(interval);
    };
  }, [yPos, getBounds]);

  // Scroll opacity reduction listener
  useEffect(() => {
    let scrollTimeout;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 200);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Inactivity collapse timer (collapses after 5s if idle and closed)
  useEffect(() => {
    if (isOpen || isDragging) {
      setIsCollapsed(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsCollapsed(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isOpen, isDragging, inputVal]);

  const handleUserActivity = () => {
    setIsCollapsed(false);
  };

  const handleDragStart = (e) => {
    if (isOpen) return; // Do not drag if window is already open

    draggedRef.current = false; // Reset flag

    const isTouchEvent = e.type.startsWith("touch");
    const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;
    const clientX = isTouchEvent ? e.touches[0].clientX : e.clientX;

    clickStartRef.current = { x: clientX, y: clientY, time: Date.now() };
    dragStartYRef.current = clientY;

    let currentY = 0;
    if (containerRef.current) {
      currentY = containerRef.current.getBoundingClientRect().top;
    }
    dragStartPosRef.current = currentY;

    isDraggingRef.current = true;
    setIsDragging(true);

    if (isTouchEvent) {
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
    } else {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
    }
  };

  const handleDragMove = (e) => {
    if (!isDraggingRef.current) return;

    const isTouchEvent = e.type.startsWith("touch");
    if (isTouchEvent) {
      e.preventDefault(); // prevent touch scrolling
    }

    const clientY = isTouchEvent ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartYRef.current;

    if (Math.abs(deltaY) > 5) {
      draggedRef.current = true;
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        const { topLimit, bottomLimit } = getBounds();
        if (isNaN(topLimit) || isNaN(bottomLimit)) return;
        const rawY = dragStartPosRef.current + deltaY;
        if (isNaN(rawY)) return;
        const constrainedY = Math.min(Math.max(rawY, topLimit), bottomLimit);
        if (!isNaN(constrainedY)) {
          containerRef.current.style.top = `${constrainedY}px`;
          containerRef.current.style.bottom = "auto";
        }
      }
    });
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    setIsDragging(false);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    window.removeEventListener("mousemove", handleDragMove);
    window.removeEventListener("mouseup", handleDragEnd);
    window.removeEventListener("touchmove", handleDragMove);
    window.removeEventListener("touchend", handleDragEnd);

    // Only snap and save Y position if the user actually dragged it
    if (draggedRef.current) {
      if (containerRef.current) {
        const finalY = containerRef.current.getBoundingClientRect().top;
        const { topLimit, bottomLimit } = getBounds();
        if (isNaN(topLimit) || isNaN(bottomLimit)) return;
        const constrainedY = Math.min(Math.max(finalY, topLimit), bottomLimit);
        if (!isNaN(constrainedY)) {
          setYPos(constrainedY);
          localStorage.setItem("martgeni-y", constrainedY);
        }
      }
    }
  };

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
      className={`martgeni-container ${isDragging ? "dragging" : ""} ${isScrolling ? "scrolling" : ""} ${isCollapsed ? "collapsed" : ""}`}
      onMouseEnter={handleUserActivity}
    >
      {/* Floating Action Button */}
      <button
        ref={fabRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onClick={(e) => {
          e.stopPropagation();
          if (!draggedRef.current) {
            setIsOpen(prev => !prev);
          }
          draggedRef.current = false; // Reset
        }}
        className={`martgeni-fab ${isOpen ? "open" : ""}`}
        title={`Toggle ${MARTGENI_CONFIG.aiName}`}
        aria-label={`Toggle ${MARTGENI_CONFIG.aiName} Assistant`}
        aria-grabbed={isDragging}
        type="button"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
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
