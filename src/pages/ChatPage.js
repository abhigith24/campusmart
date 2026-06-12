import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  collection, query, onSnapshot, addDoc,
  serverTimestamp, doc, updateDoc, where, getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function ChatPage({ initialChatWith, setPage }) {
  const { currentUser, userProfile } = useAuth();
  const [chats,          setChats]          = useState([]);
  const [activeChat,     setActiveChat]     = useState(null);
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState("");
  const [sending,        setSending]        = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [activeTab,      setActiveTab]      = useState("buying"); // "buying" | "selling"

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;

    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 40) {
      if (diffX > 0 && activeTab === "buying") {
        setActiveTab("selling");
      } else if (diffX < 0 && activeTab === "selling") {
        setActiveTab("buying");
      }
    }
  };

  const buyingChats  = chats.filter(c => c.buyerId === currentUser?.uid || (!c.buyerId && !c.sellerId));
  const sellingChats = chats.filter(c => c.sellerId === currentUser?.uid);
  const displayedChats = activeTab === "buying" ? buyingChats : sellingChats;

  const hasUnread = (chat) => chat[`unread_${currentUser?.uid}`] === true;
  const unreadBuying  = buyingChats.filter(hasUnread).length;
  const unreadSelling = sellingChats.filter(hasUnread).length;

  // ── Auto-switch tab to match active chat ───────────────────────────────────
  useEffect(() => {
    if (!activeChat) return;
    if (activeChat.sellerId === currentUser?.uid) {
      setActiveTab("selling");
    } else if (activeChat.buyerId === currentUser?.uid) {
      setActiveTab("buying");
    }
  }, [activeChat, currentUser?.uid]);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const unsubMsgRef = useRef(null);

  // ── Load sidebar chats (realtime) ──────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.lastMessageTime?.seconds || a.lastMessageTime?.toMillis?.() / 1000 || Date.now() / 1000;
          const tb = b.lastMessageTime?.seconds || b.lastMessageTime?.toMillis?.() / 1000 || Date.now() / 1000;
          return tb - ta;
        });
      setChats(list);

      // Auto-select active chat if it updated (keeps messages in sync)
      setActiveChat(prev => {
        if (!prev) return prev;
        const updated = list.find(c => c.id === prev.id);
        return updated ? { ...prev, ...updated } : prev;
      });
    }, err => console.error("Chats listener error:", err));
    return unsub;
  }, [currentUser]);

  // ── Self-healing migration for legacy chats ────────────────────────────────
  useEffect(() => {
    if (chats.length === 0) return;
    chats.forEach(async (chat) => {
      if (!chat.buyerId || !chat.sellerId) {
        try {
          const listingSnap = await getDoc(doc(db, "listings", chat.listingId));
          if (listingSnap.exists()) {
            const sId = listingSnap.data().sellerId;
            const bId = chat.participants?.find(uid => uid !== sId) || "";
            if (sId && bId) {
              await updateDoc(doc(db, "chats", chat.id), {
                buyerId: bId,
                sellerId: sId
              });
            }
          }
        } catch (err) {
          console.error("Chat migration failed for", chat.id, err);
        }
      }
    });
  }, [chats]);

  // ── Open chat from listing detail ──────────────────────────────────────────
  useEffect(() => {
    if (!initialChatWith?.chatId) return;
    // Fetch fresh chat doc then activate
    getDoc(doc(db, "chats", initialChatWith.chatId)).then(snap => {
      if (snap.exists()) {
        setActiveChat({ id: snap.id, ...snap.data() });
      } else {
        setActiveChat({ id: initialChatWith.chatId, ...initialChatWith });
      }
      setMobileChatOpen(true);
    }).catch(() => {
      setActiveChat({ id: initialChatWith.chatId, ...initialChatWith });
      setMobileChatOpen(true);
    });
  }, [initialChatWith]);

  // ── Load messages for active chat (realtime) ───────────────────────────────
  useEffect(() => {
    if (unsubMsgRef.current) { unsubMsgRef.current(); unsubMsgRef.current = null; }
    if (!activeChat?.id) { setMessages([]); return; }

    // No orderBy — avoids composite index requirement. Sort client-side instead.
    const q = collection(db, "chats", activeChat.id, "messages");

    unsubMsgRef.current = onSnapshot(q, snap => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.seconds || a.createdAt?.toMillis?.() / 1000 || Date.now() / 1000;
          const tb = b.createdAt?.seconds || b.createdAt?.toMillis?.() / 1000 || Date.now() / 1000;
          return ta - tb;
        });
      setMessages(msgs);
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }, err => console.error("Messages listener error:", err.code, err.message));

    return () => { if (unsubMsgRef.current) unsubMsgRef.current(); };
  }, [activeChat?.id]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeChat || sending) return;
    setSending(true);
    setInput("");
    try {
      const senderName = userProfile?.name || currentUser.displayName || "Student";
      // Add to messages subcollection
      await addDoc(collection(db, "chats", activeChat.id, "messages"), {
        text,
        senderId:   currentUser.uid,
        senderName,
        createdAt:  serverTimestamp()
      });
      // Update chat meta so both users see latest message in sidebar
      await updateDoc(doc(db, "chats", activeChat.id), {
        lastMessage:     text,
        lastMessageTime: serverTimestamp(),
        // Mark as unread for the OTHER participant
        [`unread_${activeChat.participants?.find(id => id !== currentUser.uid)}`]: true
      });
    } catch (err) {
      console.error("Send error:", err.code, err.message);
    }
    setSending(false);
    inputRef.current?.focus();
  }, [input, activeChat, sending, currentUser, userProfile]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function getOtherName(chat) {
    if (!chat?.participantNames) return "User";
    const otherId = chat.participants?.find(id => id !== currentUser.uid);
    return chat.participantNames?.[otherId] || "User";
  }

  function getInitial(chat) {
    return (getOtherName(chat)[0] || "U").toUpperCase();
  }

  function formatTime(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000)    return "Just now";
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }


  async function openChat(chat) {
    setActiveChat(chat);
    setMobileChatOpen(true);
    // Mark as read
    const unreadKey = `unread_${currentUser.uid}`;
    if (chat[unreadKey]) {
      updateDoc(doc(db, "chats", chat.id), { [unreadKey]: false }).catch(() => {});
    }
  }

  return (
    <div className="chat-page">
      {/* ── Sidebar ── */}
      <div
        className={`chat-sidebar ${mobileChatOpen ? "sidebar-hidden" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "pan-y" }}
      >
        <div className="chat-sidebar-header">
          <button className="chat-back-home" onClick={() => setPage("home")} title="Back">
            ←
          </button>
          <span>Messages</span>
        </div>

        {/* Tabs segment control */}
        <div className="chat-tabs-nav" style={{ display: "flex", borderBottom: "1px solid var(--bdr)", padding: "4px 8px", gap: 6, background: "#fff" }}>
          <button
            type="button"
            className={`chat-tab-btn ${activeTab === "buying" ? "active" : ""}`}
            onClick={() => setActiveTab("buying")}
            style={{
              flex: 1, padding: "8px 12px", border: "none", background: activeTab === "buying" ? "var(--p-light)" : "transparent",
              color: activeTab === "buying" ? "var(--p-dark)" : "var(--muted)", fontWeight: 700, borderRadius: 6, fontSize: 13,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s"
            }}
          >
            🛍️ Buying
            {unreadBuying > 0 && (
              <span className="notif-badge-inline" style={{ marginLeft: 0, padding: "0 5px", minWidth: 16, height: 16, fontSize: 9 }}>
                {unreadBuying}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`chat-tab-btn ${activeTab === "selling" ? "active" : ""}`}
            onClick={() => setActiveTab("selling")}
            style={{
              flex: 1, padding: "8px 12px", border: "none", background: activeTab === "selling" ? "var(--p-light)" : "transparent",
              color: activeTab === "selling" ? "var(--p-dark)" : "var(--muted)", fontWeight: 700, borderRadius: 6, fontSize: 13,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s"
            }}
          >
            🏪 Selling
            {unreadSelling > 0 && (
              <span className="notif-badge-inline" style={{ marginLeft: 0, padding: "0 5px", minWidth: 16, height: 16, fontSize: 9 }}>
                {unreadSelling}
              </span>
            )}
          </button>
        </div>

        {displayedChats.length === 0 ? (
          <div className="chat-empty-sidebar">
            <div style={{ fontSize: 40 }}>💬</div>
            <div style={{ fontWeight: 800, marginTop: 10 }}>No chats yet</div>
            <div style={{ fontSize: 13, marginTop: 4, color: "var(--muted)", lineHeight: 1.5 }}>
              {activeTab === "buying"
                ? "Browse listings and message a seller to start buying!"
                : "Your inquiries from buyers will appear here."}
            </div>
          </div>
        ) : displayedChats.map(chat => (
          <div
            key={chat.id}
            className={`chat-item ${activeChat?.id === chat.id ? "active" : ""} ${hasUnread(chat) ? "has-unread" : ""}`}
            onClick={() => openChat(chat)}
          >
            <div className="chat-item-avatar">{getInitial(chat)}</div>
            <div className="chat-item-info">
              <div className="chat-item-name">
                {getOtherName(chat)}
                {hasUnread(chat) && <span className="unread-badge" />}
              </div>
              <div className="chat-item-listing">{chat.listingTitle || "Item"}</div>
              <div className="chat-item-preview">{chat.lastMessage || "No messages yet"}</div>
            </div>
            <div className="chat-item-time">{formatTime(chat.lastMessageTime)}</div>
          </div>
        ))}
      </div>

      {/* ── Main Chat ── */}
      <div className={`chat-main ${mobileChatOpen ? "chat-main-visible" : ""}`}>
        {!activeChat ? (
          <div className="chat-empty">
            <div style={{ fontSize: 56 }}>💬</div>
            <div style={{ fontWeight: 900, fontSize: 20, marginTop: 12 }}>Your Messages</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 6, textAlign: "center", maxWidth: 260 }}>
              Select a conversation or contact a seller from a listing
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="chat-header">
              <button
                className="chat-back-btn"
                onClick={() => { setMobileChatOpen(false); setActiveChat(null); }}
              >←</button>
              <div className="chat-header-avatar">{getInitial(activeChat)}</div>
              <div className="chat-header-info">
                <div className="chat-header-name">{getOtherName(activeChat)}</div>
                {activeChat.listingTitle && (
                  <div className="chat-header-listing">re: {activeChat.listingTitle}</div>
                )}
              </div>
              <div className="chat-online-dot" title="Online" />
            </div>

            {/* Listing context pill */}
            {activeChat.listingTitle && (
              <div className="chat-listing-bar">
                🛒 <strong>{activeChat.listingTitle}</strong>
              </div>
            )}

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-start-hint">
                  👋 Say hi! Ask about the item, condition, meetup location, etc.
                </div>
              )}
              {messages.map((msg, i) => {
                const isMine = msg.senderId === currentUser.uid;
                const showName = !isMine && (i === 0 || messages[i-1]?.senderId !== msg.senderId);
                return (
                  <div key={msg.id} className={`msg-row ${isMine ? "mine" : "theirs"}`}>
                    {showName && (
                      <div className="msg-sender-name">{msg.senderName}</div>
                    )}
                    <div className={`msg-bubble ${isMine ? "msg-mine" : "msg-theirs"}`}>
                      {msg.text}
                    </div>
                    <div className="msg-time">{formatTime(msg.createdAt)}</div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="chat-input-bar">
              <textarea
                ref={inputRef}
                className="chat-input"
                rows={1}
                placeholder="Type a message..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                className={`chat-send-btn ${input.trim() ? "active" : ""}`}
                onClick={sendMessage}
                disabled={!input.trim() || sending}
              >
                {sending ? "..." : "↑"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
